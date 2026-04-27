<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  PageHeader, SidePanel, SidePanelLayout, Button, Input,
  DatePicker, DateRangePicker, Alert, Icon, ConfirmDialog,
  FormRow, Spinner, useConfirmDialog,
} from '@upov/upov-ui';
import { CalendarDate, type DateValue } from '@internationalized/date';
import type { DateRange } from 'radix-vue';
import type { TechnicalBody, TechnicalBodyOption, EdcMember } from '@/types';
import api from '@/services/api';
import { NO_DEADLINE_BODIES } from '@/config/constants';

const { confirm } = useConfirmDialog();
const router = useRouter();

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toCalendarDate(value: string | null): DateValue | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  return new CalendarDate(y, m, d);
}

function toISOString(value: DateValue | undefined): string {
  if (!value) return '';
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function toDateRange(start: string | null, end: string | null): DateRange | undefined {
  const s = toCalendarDate(start);
  const e = toCalendarDate(end);
  if (!s && !e) return undefined;
  return { start: s!, end: e! };
}

function formatDate(value: string | null): string {
  if (!value) return '__/__/____';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function calcDeadlines(meetingStart: DateValue) {
  const leDraftEnd      = meetingStart.subtract({ days: 101 });
  const ieCommentsStart = leDraftEnd.add({ days: 1 });
  const ieCommentsEnd   = meetingStart.subtract({ days: 73 });
  const leCheckingStart = ieCommentsEnd.add({ days: 1 });
  const leCheckingEnd   = meetingStart.subtract({ days: 45 });
  const sentToUpov      = leCheckingEnd.add({ days: 1 });
  return { leDraftEnd, ieCommentsStart, ieCommentsEnd, leCheckingStart, leCheckingEnd, sentToUpov };
}

const now   = new Date();
const today = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
const calendarDefault = computed(() => {
  const n = new Date();
  return new CalendarDate(selectedYear.value, n.getMonth() + 1, n.getDate());
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const items   = ref<TechnicalBody[]>([]);
const bodies  = ref<TechnicalBodyOption[]>([]);
const loading = ref(false);

function yearFromHash(): number {
  const hash = window.location.hash.replace('#', '');
  const n = parseInt(hash, 10);
  return n > 0 ? n : new Date().getFullYear();
}

const selectedYear = ref<number>(yearFromHash());

async function fetchOptions() {
  try {
    const res = await api.get<{ bodies: TechnicalBodyOption[] }>('/api/admin/technical-bodies/options');
    bodies.value = res.data.bodies;
  } catch (err) {
    console.error('Failed to fetch options:', err);
  }
}

async function fetchSessions() {
  loading.value = true;
  try {
    const res = await api.get<{ items: TechnicalBody[] }>('/api/admin/technical-bodies', {
      params: { year: String(selectedYear.value) },
    });
    items.value = res.data.items;
    // Always fetch EDC members if a TC-EDC session exists (needed for card chip display)
    const tcEdc = res.data.items.find((i: TechnicalBody) => i.code === 'TC-EDC');
    if (tcEdc) {
      edcTbId.value = tcEdc.id;
      await fetchEdcMembers(tcEdc.id);
    } else {
      edcTbId.value = null;
      edcMembers.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch sessions:', err);
  } finally {
    loading.value = false;
  }
}

let initialized = false;

watch(selectedYear, (y) => {
  if (initialized) router.replace({ hash: `#${y}` });
  closeAllPanels();
  fetchSessions();
});

onMounted(async () => {
  await fetchOptions();
  await fetchSessions();
  initialized = true;
});

function prevYear() { selectedYear.value--; }
function nextYear() { selectedYear.value++; }

// ─── Body cards ───────────────────────────────────────────────────────────────

interface BodyCard {
  code: string;
  description: string;
  data: TechnicalBody | null;
}

const bodyCards = computed<BodyCard[]>(() =>
  bodies.value.map((b) => ({
    code: b.code,
    description: b.description,
    data: items.value.find((i) => i.code === b.code) || null,
  })),
);

function isTcEdcCode(code: string): boolean {
  return (NO_DEADLINE_BODIES as readonly string[]).includes(code);
}

// ─── TC-EDC Members card ─────────────────────────────────────────────────────

/** Find the TC-EDC session item for the selected year (if it exists) */
const tcEdcItem = computed<TechnicalBody | null>(() =>
  items.value.find((i) => i.code === 'TC-EDC') || null,
);

// ─── EDC Members side panel ───────────────────────────────────────────────────

const edcPanelOpen  = ref(false);
const edcTbId       = ref<number | null>(null);
const edcMembers    = ref<EdcMember[]>([]);
const edcLoading    = ref(false);
const edcSaving     = ref(false);
const edcError      = ref('');
const edcActionId   = ref<number | null>(null);

// Search / add members
const edcSearchQuery   = ref('');
const edcSearchResults = ref<EdcMember[]>([]);
const edcSearchLoading = ref(false);
let edcSearchTimeout: ReturnType<typeof setTimeout> | null = null;

// Import from previous year
const importLoading = ref(false);
const importError   = ref('');

// Previous year TC-EDC session (for import)
const prevYearTcEdcItem = computed<TechnicalBody | null>(() => {
  // We only need its id for the copy-from API; we'll resolve it lazily
  return null; // resolved via prevYearTbId
});
const prevYearTbId = ref<number | null>(null);

async function fetchPrevYearTcEdcId() {
  try {
    const res = await api.get<{ items: TechnicalBody[] }>('/api/admin/technical-bodies', {
      params: { year: String(selectedYear.value - 1) },
    });
    const found = res.data.items.find((i) => i.code === 'TC-EDC');
    prevYearTbId.value = found?.id ?? null;
  } catch {
    prevYearTbId.value = null;
  }
}

async function fetchEdcMembers(tbId: number) {
  edcLoading.value = true;
  edcError.value   = '';
  try {
    const res = await api.get<EdcMember[]>(`/api/admin/technical-bodies/${tbId}/edc-members`);
    edcMembers.value = res.data;
  } catch (err: any) {
    edcError.value = err?.response?.data?.error?.message ?? 'Failed to load EDC members.';
  } finally {
    edcLoading.value = false;
  }
}

function openEdcPanel() {
  // Close session panel first if open
  sessionPanelOpen.value = false;

  edcPanelOpen.value = true;
  edcError.value     = '';
  edcSearchQuery.value   = '';
  edcSearchResults.value = [];

  // edcTbId + edcMembers already populated by fetchSessions on load;
  // only re-fetch prev-year id (needed for import link)
  if (edcTbId.value) {
    fetchPrevYearTcEdcId();
  }
}

function closeEdcPanel() {
  edcPanelOpen.value = false;
  edcSearchQuery.value = '';
  edcSearchResults.value = [];
  edcError.value = '';
  importError.value = '';
}

// Search for users to add
watch(edcSearchQuery, (val) => {
  if (edcSearchTimeout) clearTimeout(edcSearchTimeout);
  if (!val.trim()) {
    edcSearchResults.value = [];
    return;
  }
  edcSearchTimeout = setTimeout(() => searchEdcCandidates(val), 300);
});

async function searchEdcCandidates(query: string) {
  if (!query.trim()) return;
  edcSearchLoading.value = true;
  try {
    const res = await api.get<{ items: any[] }>('/api/admin/users', {
      params: { search: query, limit: 10, page: 1, sort: 'fullName', order: 'asc' },
    });
    // Filter out already-added members
    const currentIds = new Set(edcMembers.value.map((m) => m.id));
    edcSearchResults.value = res.data.items
      .filter((u) => !currentIds.has(u.id))
      .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, officeCode: u.officeCode ?? null }));
  } catch (err) {
    console.error('Search error:', err);
  } finally {
    edcSearchLoading.value = false;
  }
}

async function addEdcMember(user: EdcMember) {
  if (!edcTbId.value) return;
  edcActionId.value = user.id;
  try {
    await api.post(`/api/admin/technical-bodies/${edcTbId.value}/edc-members`, {
      userIds: [user.id],
    });
    // Optimistically add to list, clear search
    edcMembers.value = [...edcMembers.value, user];
    edcSearchResults.value = [];
    edcSearchQuery.value = '';
  } catch (err: any) {
    edcError.value = err?.response?.data?.error?.message ?? 'Failed to add member.';
  } finally {
    edcActionId.value = null;
  }
}

async function removeEdcMember(member: EdcMember) {
  if (!edcTbId.value) return;
  const ok = await confirm({
    title:        'Remove EDC Member',
    message:      `Remove ${member.fullName} from TC-EDC members for ${selectedYear.value}?`,
    confirmLabel: 'Remove',
    variant:      'danger',
  });
  if (!ok) return;

  edcActionId.value = member.id;
  try {
    await api.delete(`/api/admin/technical-bodies/${edcTbId.value}/edc-members/${member.id}`);
    edcMembers.value = edcMembers.value.filter((m) => m.id !== member.id);
  } catch (err: any) {
    edcError.value = err?.response?.data?.error?.message ?? 'Failed to remove member.';
  } finally {
    edcActionId.value = null;
  }
}

async function importFromPrevYear() {
  if (!edcTbId.value || !prevYearTbId.value) return;
  importLoading.value = true;
  importError.value   = '';
  try {
    await api.post(
      `/api/admin/technical-bodies/${edcTbId.value}/edc-members/copy-from/${prevYearTbId.value}`,
    );
    await fetchEdcMembers(edcTbId.value);
  } catch (err: any) {
    importError.value = err?.response?.data?.error?.message ?? 'Failed to import members.';
  } finally {
    importLoading.value = false;
  }
}

// ─── Session side panel (create / edit TWP sessions) ─────────────────────────

const sessionPanelOpen = ref(false);
const panelMode        = ref<'create' | 'edit'>('create');
const panelCode        = ref('');
const panelDescription = ref('');
const panelEditId      = ref<number | null>(null);
const saving           = ref(false);
const deleting         = ref(false);
const panelError       = ref('');

const form = ref({
  session:     '',
  location:    '',
  meeting:     undefined as DateRange | undefined,
  leDraftEnd:  undefined as DateValue | undefined,
  ieComments:  undefined as DateRange | undefined,
  leChecking:  undefined as DateRange | undefined,
  translation: undefined as DateRange | undefined,
  sentToUpov:  undefined as DateValue | undefined,
});

const initialFormSnapshot = ref('');

function serialize(obj: unknown): string {
  return JSON.stringify(obj, (_, v) => {
    if (v && typeof v === 'object' && 'year' in v && 'month' in v && 'day' in v) {
      return `${v.year}-${v.month}-${v.day}`;
    }
    return v;
  });
}

function takeSnapshot() {
  initialFormSnapshot.value = serialize(form.value);
}

const hasChanges = computed(() => serialize(form.value) !== initialFormSnapshot.value);

function isBefore(a?: DateValue, b?: DateValue): boolean {
  if (!a || !b) return true;
  return a.compare(b) <= 0;
}

const formErrors = computed<string[]>(() => {
  const errs: string[] = [];
  const f = form.value;

  if (f.meeting?.start && f.meeting?.end && !isBefore(f.meeting.start, f.meeting.end)) {
    errs.push('Meeting start must be before end');
  }
  if (!hasDeadlines.value) return errs;

  if (f.ieComments?.start && f.ieComments?.end && !isBefore(f.ieComments.start, f.ieComments.end)) {
    errs.push('IE Comments start must be before end');
  }
  if (f.leChecking?.start && f.leChecking?.end && !isBefore(f.leChecking.start, f.leChecking.end)) {
    errs.push('LE Checking start must be before end');
  }
  if (f.translation?.start && f.translation?.end && !isBefore(f.translation.start, f.translation.end)) {
    errs.push('Translation start must be before end');
  }
  if (!isBefore(f.leDraftEnd,      f.ieComments?.start))  errs.push('LE Draft must end before IE Comments starts');
  if (!isBefore(f.ieComments?.end, f.leChecking?.start))  errs.push('IE Comments must end before LE Checking starts');
  if (!isBefore(f.leChecking?.end, f.sentToUpov))         errs.push('LE Checking must end before Sent to UPOV');
  if (!isBefore(f.sentToUpov,      f.meeting?.start))     errs.push('Sent to UPOV must be before meeting');

  return errs;
});

const canSave      = computed(() => hasChanges.value && formErrors.value.length === 0);
const hasDeadlines = computed(() => !isTcEdcCode(panelCode.value));

const panelTitle = computed(() =>
  panelMode.value === 'create'
    ? `New ${panelCode.value} ${selectedYear.value} Session`
    : `Edit ${panelCode.value} ${selectedYear.value}`,
);

// Computed: which panel is open (to drive SidePanelLayout)
const anyPanelOpen = computed(() => sessionPanelOpen.value || edcPanelOpen.value);

function closeAllPanels() {
  sessionPanelOpen.value = false;
  edcPanelOpen.value     = false;
}

function openCreate(code: string) {
  // Close EDC panel if open
  edcPanelOpen.value = false;

  const body = bodies.value.find((b) => b.code === code);
  panelCode.value        = code;
  panelDescription.value = body?.description || '';
  panelMode.value        = 'create';
  panelEditId.value      = null;
  form.value = {
    session: '', location: '', meeting: undefined, leDraftEnd: undefined,
    ieComments: undefined, leChecking: undefined, translation: undefined, sentToUpov: undefined,
  };
  panelError.value      = '';
  sessionPanelOpen.value = true;
  takeSnapshot();
}

function openEdit(row: TechnicalBody) {
  edcPanelOpen.value = false;

  const body = bodies.value.find((b) => b.code === row.code);
  panelCode.value        = row.code;
  panelDescription.value = body?.description || '';
  panelMode.value        = 'edit';
  panelEditId.value      = row.id;
  form.value = {
    session:     row.session  || '',
    location:    row.location || '',
    meeting:     toDateRange(row.dateFrom, row.dateTo),
    leDraftEnd:  toCalendarDate(row.leDraftEnd),
    ieComments:  toDateRange(row.ieCommentsStart, row.ieCommentsEnd),
    leChecking:  toDateRange(row.leCheckingStart, row.leCheckingEnd),
    translation: toDateRange(row.translationStart, row.translationEnd),
    sentToUpov:  toCalendarDate(row.sentToUpov),
  };
  panelError.value       = '';
  sessionPanelOpen.value = true;
  takeSnapshot();
}

function closeSessionPanel() {
  sessionPanelOpen.value = false;
}

watch(() => form.value.meeting?.start, (newStart, oldStart) => {
  if (!hasDeadlines.value) return;
  if (!newStart || (oldStart && newStart.toString() === oldStart.toString())) return;
  const d = calcDeadlines(newStart);
  form.value.leDraftEnd  = d.leDraftEnd;
  form.value.ieComments  = { start: d.ieCommentsStart, end: d.ieCommentsEnd } as DateRange;
  form.value.leChecking  = { start: d.leCheckingStart, end: d.leCheckingEnd } as DateRange;
  form.value.sentToUpov  = d.sentToUpov;
});

function buildPayload(): Record<string, string | number | null> {
  const payload: Record<string, string | number | null> = {
    session:  form.value.session,
    location: form.value.location,
    dateFrom: toISOString(form.value.meeting?.start),
    dateTo:   toISOString(form.value.meeting?.end),
  };
  if (hasDeadlines.value) {
    payload.leDraftEnd       = toISOString(form.value.leDraftEnd);
    payload.ieCommentsStart  = toISOString(form.value.ieComments?.start);
    payload.ieCommentsEnd    = toISOString(form.value.ieComments?.end);
    payload.leCheckingStart  = toISOString(form.value.leChecking?.start);
    payload.leCheckingEnd    = toISOString(form.value.leChecking?.end);
    payload.translationStart = toISOString(form.value.translation?.start);
    payload.translationEnd   = toISOString(form.value.translation?.end);
    payload.sentToUpov       = toISOString(form.value.sentToUpov);
  }
  return payload;
}

async function save() {
  saving.value     = true;
  panelError.value = '';
  try {
    if (panelMode.value === 'edit' && panelEditId.value) {
      await api.patch(`/api/admin/technical-bodies/${panelEditId.value}`, buildPayload());
    } else {
      const body = bodies.value.find((b) => b.code === panelCode.value);
      await api.post('/api/admin/technical-bodies', {
        code: panelCode.value,
        year: selectedYear.value,
        description: body?.description || null,
        ...buildPayload(),
      });
    }
    sessionPanelOpen.value = false;
    await fetchSessions();
  } catch (err) {
    console.error('Save error:', err);
    panelError.value = 'Failed to save changes.';
  } finally {
    saving.value = false;
  }
}

async function deleteSession(row: TechnicalBody) {
  const ok = await confirm({
    title:        'Cancel Session',
    message:      `Are you sure you want to cancel the ${row.code} ${row.year} session?`,
    confirmLabel: 'Cancel Session',
    variant:      'danger',
  });
  if (!ok) return;

  deleting.value   = true;
  panelError.value = '';
  try {
    await api.delete(`/api/admin/technical-bodies/${row.id}`);
    closeSessionPanel();
    await fetchSessions();
  } catch (err) {
    console.error('Delete error:', err);
    panelError.value = 'Failed to cancel the session. Please try again.';
  } finally {
    deleting.value = false;
  }
}

// ─── TC-EDC Members card display ─────────────────────────────────────────────

/** The TC-EDC Members card (full-width, always shown at top of grid) */
const tcEdcMembersCard = computed(() =>
  bodies.value.find((b) => b.code === 'TC-EDC') ?? null,
);

/** All body cards shown in the grid (TC-EDC included for session management) */
const regularBodyCards = computed<BodyCard[]>(() => bodyCards.value);
</script>

<template>
  <div class="tb-wrapper">
    <SidePanelLayout :open="anyPanelOpen" panel-width="520px" fixed top-offset="48px">
      <div class="tb-main">
        <PageHeader
          title="Technical Bodies"
          subtitle="Manage meeting sessions, deadline schedules, and TC-EDC members assignment"
        />

        <div v-if="loading" class="tb-loading">
          <Spinner />
        </div>

        <template v-else>
          <!-- ── TC-EDC Members card (full width) ─────────────────────────── -->
          <div
            class="tb-edc-members-card"
            :class="{
              'tb-edc-members-card--active':   edcPanelOpen,
              'tb-edc-members-card--disabled': !tcEdcItem,
            }"
            @click="tcEdcItem ? openEdcPanel() : undefined"
          >
            <div class="tb-edc-members-header">
              <div class="tb-edc-members-title">
                <span class="tb-edc-members-label">TC-EDC Members</span>
                <Icon icon="people-fill" size="small" class="tb-edc-members-icon" />
                <span v-if="edcMembers.length > 0 && !edcPanelOpen" class="tb-edc-members-count">
                  ({{ edcMembers.length }} members)
                </span>
              </div>
              <span class="tb-edc-members-year">{{ selectedYear }}</span>
            </div>

            <!-- Locked: no TC-EDC session created yet -->
            <div v-if="!tcEdcItem" class="tb-edc-members-locked">
              <Icon icon="lock" size="small" class="tb-edc-locked-icon" />
              <span>Create the TC-EDC session first to manage members</span>
            </div>

            <!-- Empty state: show + button -->
            <div v-else-if="edcMembers.length === 0 && !edcPanelOpen" class="tb-edc-members-empty">
              <button class="tb-card-add" @click.stop="openEdcPanel">
                <Icon icon="plus-circle" size="large" />
              </button>
            </div>

            <!-- Populated: show member chips grid -->
            <div v-else-if="edcMembers.length > 0" class="tb-edc-members-grid">
              <span
                v-for="member in edcMembers"
                :key="member.id"
                class="tb-edc-member-chip"
              >
                {{ member.fullName }}
                <span v-if="member.officeCode" class="tb-edc-member-office">({{ member.officeCode }})</span>
              </span>
            </div>

            <!-- Panel open but no members yet -->
            <div v-else class="tb-edc-members-empty">
              <button class="tb-card-add" @click.stop="openEdcPanel">
                <Icon icon="plus-circle" size="large" />
              </button>
            </div>
          </div>

          <!-- ── Regular body cards grid ───────────────────────────────────── -->
          <div class="tb-grid">
            <div
              v-for="card in regularBodyCards"
              :key="card.code"
              class="tb-card"
              :class="{
                'tb-card--empty': !card.data,
                'tb-card--active': sessionPanelOpen && panelCode === card.code,
              }"
              @click="card.data ? openEdit(card.data) : openCreate(card.code)"
            >
              <div class="tb-card-header">
                <div>
                  <span class="tb-card-code">{{ card.code }}</span>
                </div>
                <span class="tb-card-year">{{ selectedYear }}</span>
              </div>

              <template v-if="card.data">
                <p v-if="card.data.session"  class="tb-card-session">{{ card.data.session }}</p>
                <p v-if="card.data.location" class="tb-card-location">{{ card.data.location }}</p>
                <p class="tb-card-dates">
                  {{ formatDate(card.data.dateFrom) }}
                  <Icon icon="arrow-right" size="small" class="tb-card-arrow" />
                  {{ formatDate(card.data.dateTo) }}
                </p>
              </template>

              <button v-else class="tb-card-add" @click.stop="openCreate(card.code)">
                <Icon icon="plus-circle" size="large" />
              </button>
            </div>
          </div>

          <div class="tb-year-nav" :class="{ 'tb-year-nav--squeezed': anyPanelOpen }">
            <Button type="tertiary" size="small" icon-left="chevron-left" @click="prevYear">Previous Year</Button>
            <span class="tb-year-current">{{ selectedYear }}</span>
            <Button type="tertiary" size="small" icon-right="chevron-right" @click="nextYear">Next Year</Button>
          </div>
        </template>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- Side panels slot                                                    -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template #panel>

        <!-- ── TC-EDC Members panel ────────────────────────────────────── -->
        <SidePanel
          v-if="edcPanelOpen"
          title="TC-EDC Members"
          width="520px"
          @close="closeEdcPanel"
        >
          <template #subtitle>
            <span class="edc-panel-subtitle">Enlarged Editorial Committee Members</span>
          </template>

          <template #default>
            <div class="panel-content">
              <Alert v-if="edcError"   variant="error"   class="panel-alert">{{ edcError }}</Alert>
              <Alert v-if="importError" variant="error"   class="panel-alert">{{ importError }}</Alert>

              <!-- Import from previous year -->
              <div class="edc-import-row">
                <Icon icon="people-fill" size="small" class="edc-import-icon" />
                <button
                  class="edc-import-link"
                  :disabled="importLoading || !prevYearTbId"
                  @click="importFromPrevYear"
                >
                  <span v-if="importLoading">importing…</span>
                  <span v-else>import members from {{ selectedYear - 1 }}</span>
                </button>
              </div>

              <!-- Search / add members -->
              <div class="edc-search-row">
                <div class="edc-search-input-wrap">
                  <Icon icon="search" size="small" class="edc-search-icon" />
                  <input
                    v-model="edcSearchQuery"
                    type="text"
                    placeholder="add members"
                    class="edc-search-input"
                    autocomplete="off"
                  />
                  <Spinner v-if="edcSearchLoading" size="sm" class="edc-search-spinner" />
                </div>
              </div>

              <!-- Search results dropdown -->
              <div v-if="edcSearchResults.length > 0" class="edc-search-results">
                <div
                  v-for="result in edcSearchResults"
                  :key="result.id"
                  class="edc-search-result-item"
                  @click="addEdcMember(result)"
                >
                  <div class="edc-result-name">{{ result.fullName }}</div>
                  <div v-if="result.officeCode" class="edc-result-office">{{ result.officeCode }}</div>
                  <Spinner v-if="edcActionId === result.id" size="sm" />
                </div>
              </div>
              <div v-else-if="edcSearchQuery.trim() && !edcSearchLoading && edcSearchResults.length === 0" class="edc-no-results">
                No users found for "{{ edcSearchQuery }}"
              </div>

              <!-- Members list -->
              <div v-if="edcLoading" class="edc-members-loading">
                <Spinner />
              </div>

              <ol v-else-if="edcMembers.length > 0" class="edc-members-list">
                <li
                  v-for="(member, idx) in edcMembers"
                  :key="member.id"
                  class="edc-member-row"
                >
                  <span class="edc-member-index">{{ idx + 1 }}.</span>
                  <span class="edc-member-name">
                    {{ member.fullName }}
                    <span v-if="member.officeCode" class="edc-member-office">({{ member.officeCode }})</span>
                  </span>
                  <button
                    class="edc-member-delete"
                    :disabled="edcActionId === member.id"
                    :title="`Remove ${member.fullName}`"
                    @click="removeEdcMember(member)"
                  >
                    <span v-if="edcActionId === member.id" class="edc-delete-spinner">…</span>
                    <Icon v-else icon="trash" size="small" />
                  </button>
                </li>
              </ol>

              <div v-else class="edc-empty-state">
                No members yet. Use the search above to add members.
              </div>
            </div>
          </template>

          <template #footer>
            <div class="panel-footer">
              <Button
                type="primary"
                size="small"
                :disabled="edcLoading"
                @click="closeEdcPanel"
              >
                Save Changes
              </Button>
            </div>
          </template>
        </SidePanel>

        <!-- ── Session create/edit panel ──────────────────────────────── -->
        <SidePanel
          v-if="sessionPanelOpen"
          :title="panelTitle"
          width="520px"
          @close="closeSessionPanel"
        >
          <template #default>
            <div class="panel-content">
              <Alert v-if="panelError" variant="error" class="panel-alert">{{ panelError }}</Alert>

              <div class="form-grid">
                <div class="form-section">
                  <FormRow>
                    <Input v-model="form.session"  label="Session"  placeholder="e.g. fifty-fifth session" />
                    <Input v-model="form.location" label="Location" placeholder="e.g. Geneva" />
                  </FormRow>
                  <DateRangePicker v-model="form.meeting" label="Meeting Dates" placeholder="Enter a date range" :default-date="calendarDefault" />
                </div>

                <template v-if="hasDeadlines">
                  <div class="form-section">
                    <h4 class="form-section-title">Deadlines</h4>
                    <DatePicker      v-model="form.leDraftEnd"  label="LE Draft End"  :default-date="calendarDefault" typeable />
                    <DateRangePicker v-model="form.ieComments"  label="IE Comments"   placeholder="Enter a date range" :default-date="calendarDefault" />
                    <DateRangePicker v-model="form.leChecking"  label="LE Checking"   placeholder="Enter a date range" :default-date="calendarDefault" />
                    <DateRangePicker v-model="form.translation" label="Translation"   placeholder="Enter a date range" :default-date="calendarDefault" />
                    <DatePicker      v-model="form.sentToUpov"  label="Sent to UPOV" :default-date="calendarDefault" typeable />
                  </div>
                </template>
              </div>

              <Alert v-if="formErrors.length" variant="error" class="panel-validation">
                <ul class="panel-validation-list">
                  <li v-for="err in formErrors" :key="err">{{ err }}</li>
                </ul>
              </Alert>

              <div class="panel-footer">
                <Button
                  v-if="panelMode === 'edit' && form.meeting?.start && form.meeting.start.compare(today) > 0"
                  type="tertiary"
                  size="small"
                  :disabled="saving || deleting"
                  @click="deleteSession(items.find(i => i.id === panelEditId)!)"
                >
                  {{ deleting ? 'Cancelling…' : 'Cancel Session' }}
                </Button>
                <Button
                  type="primary"
                  size="small"
                  :disabled="saving || deleting || !canSave"
                  @click="save"
                >
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </Button>
              </div>
            </div>
          </template>
        </SidePanel>
      </template>

      <ConfirmDialog />
    </SidePanelLayout>
  </div>
</template>

<style scoped>
.tb-wrapper { max-width: 1400px; margin: 0 auto; }
.tb-main { display: flex; flex-direction: column; }

.tb-main :deep(.page-header),
.tb-main :deep([class*="page-header"]) {
  box-shadow: none !important;
  border-radius: 0 !important;
}

.tb-loading { display: flex; justify-content: center; padding: 48px; }

/* ── TC-EDC Members card (full width) ─────────────────────────────────────── */
.tb-edc-members-card {
  margin-top: 16px;
  background: var(--color-bg-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 16px;
  min-height: 100px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: background 0.15s, border-color 0.15s;
}

.tb-edc-members-card:hover:not(.tb-edc-members-card--disabled),
.tb-edc-members-card--active {
  background: color-mix(in srgb, var(--color-primary-green) 6%, transparent);
  border-color: color-mix(in srgb, var(--color-primary-green) 30%, transparent);
}

.tb-edc-members-card--disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--color-neutral-50, #f9fafb);
}

.tb-edc-members-locked {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.tb-edc-locked-icon {
  opacity: 0.5;
  flex-shrink: 0;
}

.tb-edc-members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tb-edc-members-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tb-edc-members-label {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-primary-green-dark);
}

.tb-edc-members-icon {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.tb-edc-members-count {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.tb-edc-members-year {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.tb-edc-members-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
}

.tb-edc-members-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tb-edc-member-chip {
  font-size: 0.8rem;
  color: var(--color-text-primary);
  background: var(--color-neutral-100, #f3f4f6);
  border: 1px solid var(--color-neutral-200);
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
}

.tb-edc-member-office {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  margin-left: 2px;
}

/* ── Regular grid ─────────────────────────────────────────────────────────── */
.tb-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;
  gap: 16px;
  margin-top: 16px;
}

.tb-card {
  background: var(--color-bg-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 16px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.tb-card:hover, .tb-card--active {
  background: color-mix(in srgb, var(--color-primary-green) 6%, transparent);
  cursor: pointer;
}

.tb-card--empty { border-style: dashed; }

.tb-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.tb-card-year   { font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); }
.tb-card-code   { font-size: 1.1rem; font-weight: 700; color: var(--color-primary-green-dark); }
.tb-card-session  { font-size: 0.85rem; font-weight: 500; color: #009A6E; margin: 4px 0 2px; }
.tb-card-location { font-size: 0.8rem; color: var(--color-text-secondary); margin: 0 0 4px; }

.tb-card-dates {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.75rem; color: var(--color-text-secondary);
  margin: auto 0 0; white-space: nowrap;
}
.tb-card-arrow { font-size: 10px; width: 10px; height: 10px; vertical-align: middle; opacity: 0.5; }

.tb-card-add {
  background: none; border: none; cursor: pointer;
  color: var(--color-neutral-400); padding: 8px; border-radius: 6px;
  transition: color 0.15s, background-color 0.15s; margin: auto auto;
}
.tb-card--empty:hover .tb-card-add,
.tb-edc-members-empty:hover .tb-card-add { color: var(--color-primary-green); }

/* ── Year navigation ─────────────────────────────────────────────────────── */
.tb-year-nav {
  position: fixed; bottom: 0; left: 240px; right: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 24px; padding: 16px 0; z-index: 5; transition: right 0.3s ease;
}
.tb-year-nav--squeezed { right: 520px; }
.tb-year-current {
  font-size: 2rem; font-weight: 800;
  color: var(--color-primary-green-dark); letter-spacing: 0.02em;
}

/* ── Side panel shared ───────────────────────────────────────────────────── */
.panel-content { display: flex; flex-direction: column; min-height: 100%; }
.panel-alert { margin-bottom: 16px; }
.panel-validation { margin-top: 12px; }
.panel-validation-list { margin: 0; padding-left: 16px; font-size: 0.8rem; }
.form-grid    { display: flex; flex-direction: column; gap: 16px; }
.form-section { display: flex; flex-direction: column; gap: 12px; }
.form-section-title {
  font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--color-text-secondary);
  margin: 0; padding-top: 8px; border-top: 1px solid var(--color-neutral-200);
}
.panel-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 0; margin-top: auto;
  border-top: 1px solid var(--color-neutral-200);
}

/* ── EDC Members panel ───────────────────────────────────────────────────── */
.edc-panel-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.edc-import-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.edc-import-icon {
  color: var(--color-text-secondary);
}

.edc-import-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-primary-green);
  text-decoration: underline;
  transition: opacity 0.15s;
}

.edc-import-link:hover { opacity: 0.75; }
.edc-import-link:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }

.edc-search-row {
  margin-bottom: 4px;
}

.edc-search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-neutral-300, #d1d5db);
  border-radius: 6px;
  padding: 6px 10px;
  background: var(--color-bg-white);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.edc-search-input-wrap:focus-within {
  border-color: var(--color-primary-green, #009A6E);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary-green, #009A6E) 15%, transparent);
}

.edc-search-icon {
  color: var(--color-text-secondary);
  opacity: 0.6;
  flex-shrink: 0;
}

.edc-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  min-width: 0;
}

.edc-search-input::placeholder {
  color: var(--color-text-tertiary, #9ca3af);
}

.edc-search-spinner {
  flex-shrink: 0;
}

.edc-search-results {
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.edc-search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.edc-search-result-item:not(:last-child) {
  border-bottom: 1px solid var(--color-neutral-100);
}

.edc-search-result-item:hover {
  background: color-mix(in srgb, var(--color-primary-green) 8%, white);
}

.edc-result-name { font-size: 0.85rem; font-weight: 500; flex: 1; }
.edc-result-office { font-size: 0.75rem; color: var(--color-text-secondary); }

.edc-no-results {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  padding: 8px 0 12px;
  font-style: italic;
}

.edc-members-loading {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.edc-members-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.edc-member-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 4px;
  transition: background 0.1s;
}

.edc-member-row:hover {
  background: var(--color-neutral-50, #f9fafb);
}

.edc-member-index {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  min-width: 20px;
}

.edc-member-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.edc-member-office {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.edc-member-delete {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.edc-member-row:hover .edc-member-delete { opacity: 1; }
.edc-member-delete:hover { color: var(--color-danger, #dc2626); }
.edc-member-delete:disabled { opacity: 0.4; cursor: not-allowed; }

.edc-delete-spinner { font-size: 0.75rem; }

.edc-empty-state {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
  padding: 16px 0;
}
</style>