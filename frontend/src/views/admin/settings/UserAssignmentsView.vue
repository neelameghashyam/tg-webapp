<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  useConfirmDialog,
  ConfirmDialog,
  PageHeader,
  Card,
  Button,
  Select,
  SearchInput,
  Table,
  Badge,
  Spinner,
  Alert,
  FormField,
  EmptyState,
  Pagination,
  Modal,
  type SelectOption,
} from '@upov/upov-ui';
import api from '@/services/api';
import type { TechnicalBody } from '@/types';

const { confirm } = useConfirmDialog();
const route = useRoute();

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: number;
  userName: string;
  fullName: string;
  email: string;
  officeName: string | null;
  officeCode: string | null;
  roleCode: string;
  leTgNames: string | null;
  lastUpdated: string;
  isEdcMember: boolean;
}

interface EdcMemberRecord {
  id: number;
  fullName: string;
  email: string;
  officeCode: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

interface CopyResult {
  copied: number;
  skipped: number;
  message: string;
}

// ─── State — TB selector ──────────────────────────────────────────────────────

const tbOptions          = ref<TechnicalBody[]>([]);
const tbLoading          = ref(false);
const selectedTbId       = ref<string>('');
const selectedTbIdNumber = computed(() =>
  selectedTbId.value ? parseInt(selectedTbId.value, 10) : null,
);
const selectedTbCode = computed(
  () => tbOptions.value.find((tb) => tb.id === selectedTbIdNumber.value)?.code || '',
);

// ─── State — Search / User list ───────────────────────────────────────────────

const searchQuery  = ref('');
const hasSearched  = ref(false);
const users        = ref<UserRow[]>([]);
const usersLoading = ref(false);
const usersError   = ref('');
const meta         = ref<PaginationMeta>({ page: 1, limit: 20, total: 0 });
const sortKey      = ref('fullName');
const sortDir      = ref<'asc' | 'desc'>('asc');

// ─── State — EDC members ──────────────────────────────────────────────────────

const edcMembers   = ref<EdcMemberRecord[]>([]);
const edcLoading   = ref(false);
const edcError     = ref('');
const edcMemberSet = computed(() => new Set(edcMembers.value.map((m) => m.id)));

// ─── State — EDC actions ──────────────────────────────────────────────────────

const edcActionUserId = ref<number | null>(null);

// ─── State — Copy-from modal ──────────────────────────────────────────────────

const copyModalOpen  = ref(false);
const copySourceTbId = ref<string>('');
const copyLoading    = ref(false);
const copyError      = ref('');
const copySuccess    = ref<CopyResult | null>(null);

// ─── Computed ─────────────────────────────────────────────────────────────────

const totalPages = computed(() => Math.ceil(meta.value.total / meta.value.limit) || 1);

/** All TC-EDC sessions except the currently selected one — copy-from candidates */
const copySourceOptions = computed<SelectOption[]>(() =>
  tbOptions.value
    .filter((tb) => tb.id !== selectedTbIdNumber.value)
    .map((tb) => ({
      value: String(tb.id),
      label: `${tb.code} (${tb.year})${tb.session ? ' — ' + tb.session : ''}`,
    })),
);

const tbSelectOptions = computed<SelectOption[]>(() =>
  tbOptions.value.map((tb) => ({
    value: String(tb.id),
    label: `${tb.code} (${tb.year}) – ${tb.description || ''}`,
  })),
);

const enrichedUsers = computed<UserRow[]>(() =>
  users.value.map((u) => ({ ...u, isEdcMember: edcMemberSet.value.has(u.id) })),
);

const showTable = computed(() => hasSearched.value && !!selectedTbIdNumber.value);

function sortIcon(key: string) {
  if (sortKey.value !== key) return '↕';
  return sortDir.value === 'asc' ? '↑' : '↓';
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function loadTbOptions() {
  tbLoading.value = true;
  try {
    const res = await api.get<{ items: TechnicalBody[] }>('/api/admin/technical-bodies');
    tbOptions.value = res.data.items.filter((tb) => tb.code === 'TC-EDC');

    // Priority 1: ?tbId query param (navigated from TechnicalBodiesView)
    const queryTbId = route.query.tbId as string | undefined;
    if (queryTbId && tbOptions.value.some((tb) => String(tb.id) === queryTbId)) {
      selectedTbId.value = queryTbId;
    } else if (tbOptions.value.length && !selectedTbId.value) {
      selectedTbId.value = String(tbOptions.value[0].id);
    }
  } catch (err) {
    console.error('Failed to load TB options:', err);
  } finally {
    tbLoading.value = false;
  }
}

async function loadEdcMembers() {
  if (!selectedTbIdNumber.value) return;
  edcLoading.value = true;
  edcError.value   = '';
  try {
    const res = await api.get<EdcMemberRecord[]>(
      `/api/admin/technical-bodies/${selectedTbIdNumber.value}/edc-members`,
    );
    edcMembers.value = res.data;
  } catch (err: any) {
    edcError.value = err?.response?.data?.error?.message ?? 'Failed to load EDC members.';
    console.error('Failed to load EDC members:', err);
  } finally {
    edcLoading.value = false;
  }
}

async function loadUsers() {
  if (!selectedTbIdNumber.value || !searchQuery.value.trim()) return;
  usersLoading.value = true;
  usersError.value   = '';
  try {
    const params: Record<string, string | number> = {
      page:   meta.value.page,
      limit:  meta.value.limit,
      sort:   sortKey.value,
      order:  sortDir.value,
      search: searchQuery.value,
    };
    const res = await api.get<{ items: UserRow[]; meta: PaginationMeta }>(
      '/api/admin/users',
      { params },
    );
    users.value       = res.data.items;
    meta.value        = res.data.meta;
    hasSearched.value = true;
  } catch (err: any) {
    usersError.value = err?.response?.data?.error?.message ?? 'Failed to load users.';
    console.error('Failed to load users:', err);
  } finally {
    usersLoading.value = false;
  }
}

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(selectedTbIdNumber, () => {
  users.value       = [];
  hasSearched.value = false;
  searchQuery.value = '';
  loadEdcMembers();
});

// ─── User actions ─────────────────────────────────────────────────────────────

function onSearchSubmitted(value: string) {
  searchQuery.value = value;
  meta.value.page   = 1;
  if (!value.trim()) {
    users.value       = [];
    hasSearched.value = false;
    return;
  }
  loadUsers();
}

function onSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
  meta.value.page = 1;
  loadUsers();
}

function goToPage(page: number) {
  meta.value.page = page;
  loadUsers();
}

// ─── EDC member actions ───────────────────────────────────────────────────────

async function addToEdc(user: UserRow) {
  if (!selectedTbIdNumber.value) return;
  edcActionUserId.value = user.id;
  try {
    await api.post(
      `/api/admin/technical-bodies/${selectedTbIdNumber.value}/edc-members`,
      { userIds: [user.id] },
    );
    await loadEdcMembers();
  } catch (err: any) {
    alert(err?.response?.data?.error?.message ?? 'Failed to add EDC member.');
    console.error('Add EDC member failed:', err);
  } finally {
    edcActionUserId.value = null;
  }
}

async function removeFromEdc(userId: number, fullName: string) {
  if (!selectedTbIdNumber.value) return;
  const ok = await confirm({
    title:        'Remove EDC Member',
    message:      `Remove ${fullName} from EDC members of ${selectedTbCode.value}?`,
    confirmLabel: 'Remove',
    variant:      'danger',
  });
  if (!ok) return;

  edcActionUserId.value = userId;
  try {
    await api.delete(
      `/api/admin/technical-bodies/${selectedTbIdNumber.value}/edc-members/${userId}`,
    );
    await loadEdcMembers();
  } catch (err: any) {
    alert(err?.response?.data?.error?.message ?? 'Failed to remove EDC member.');
    console.error('Remove EDC member failed:', err);
  } finally {
    edcActionUserId.value = null;
  }
}

// ─── Copy-from actions ────────────────────────────────────────────────────────

function openCopyModal() {
  copySourceTbId.value = '';
  copyError.value      = '';
  copySuccess.value    = null;
  copyModalOpen.value  = true;
}

function closeCopyModal() {
  copyModalOpen.value = false;
}

async function executeCopy() {
  if (!selectedTbIdNumber.value || !copySourceTbId.value) return;
  copyLoading.value = true;
  copyError.value   = '';
  copySuccess.value = null;
  try {
    const res = await api.post<CopyResult>(
      `/api/admin/technical-bodies/${selectedTbIdNumber.value}/edc-members/copy-from/${copySourceTbId.value}`,
    );
    copySuccess.value = res.data;
    await loadEdcMembers(); // refresh the EDC member list immediately
  } catch (err: any) {
    copyError.value = err?.response?.data?.error?.message ?? 'Failed to copy EDC members.';
    console.error('Copy EDC members failed:', err);
  } finally {
    copyLoading.value = false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(code: string) {
  const MAP: Record<string, string> = { ADM: 'Admin', EXP: 'Expert', TRN: 'Translator' };
  return MAP[code] || code;
}

function getOfficeDisplay(userId: number) {
  const user = users.value.find((u) => u.id === userId);
  if (user) return user.officeName || user.officeCode || '—';
  const member = edcMembers.value.find((m) => m.id === userId);
  return member?.officeCode || '—';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadTbOptions();
});
</script>

<template>
  <div class="ua-view">
    <PageHeader
      title="User Assignments"
      subtitle="Search users and manage EDC member assignments"
    />

    <!-- ── Toolbar — 50/50 split ───────────────────────────────────────── -->
    <div class="ua-toolbar">
      <FormField label="EDC Context (Technical Body)" class="ua-tb-field">
        <Select
          v-model="selectedTbId"
          :options="tbSelectOptions"
          placeholder="Select Technical Body"
          :disabled="tbLoading || tbOptions.length === 0"
        />
        <Spinner v-if="tbLoading || edcLoading" size="sm" class="ua-tb-spinner" />
      </FormField>

      <div class="ua-search-wrapper">
        <FormField label="Search Users">
          <SearchInput
            hide-button
            :debounce="350"
            placeholder="Type a name or email to search…"
            :disabled="!selectedTbIdNumber"
            @submitted="onSearchSubmitted"
          />
        </FormField>
      </div>
    </div>

    <!-- ── Hint when no TB selected ────────────────────────────────────── -->
    <Alert v-if="!selectedTbIdNumber && !tbLoading" variant="info">
      Select an EDC context above to start searching and assigning users.
    </Alert>

    <!-- ── EDC Members List ────────────────────────────────────────────── -->
    <Card v-if="selectedTbIdNumber" class="ua-edc-card">
      <template #header>
        <div class="ua-edc-header">
          <div class="ua-edc-header-left">
            <h3 class="ua-edc-title">
              EDC Members
              <span class="ua-edc-tb-badge">{{ selectedTbCode }}</span>
            </h3>
            <Badge
              :label="`${edcMembers.length} member${edcMembers.length !== 1 ? 's' : ''}`"
              :variant="edcMembers.length > 0 ? 'success' : 'neutral'"
            />
          </div>

          <!-- ── Copy from previous session ── -->
          <Button
            type="secondary"
            size="medium"
            :disabled="copySourceOptions.length === 0"
            :title="copySourceOptions.length === 0
              ? 'No other sessions available to copy from'
              : 'Copy all EDC members from a previous session into this one'"
            @click="openCopyModal"
          >
            ⎘ Copy from Previous Session
          </Button>
        </div>
      </template>

      <div v-if="edcLoading" class="ua-loading">
        <Spinner size="lg" />
        <span>Loading EDC members…</span>
      </div>

      <div v-else-if="edcMembers.length === 0" class="ua-edc-empty">
        <EmptyState
          title="No EDC members yet"
          description="Search for users below and click a row to add them, or copy members from a previous session using the button above."
        />
      </div>

      <div v-else class="ua-table-container">
        <Table>
          <template #header>
            <tr>
              <th class="ua-th">Full Name</th>
              <th class="ua-th">Email</th>
              <th class="ua-th">Country / Office</th>
              <th class="ua-th ua-th--actions">Actions</th>
            </tr>
          </template>

          <template #default>
            <tr v-for="member in edcMembers" :key="member.id" class="ua-row">
              <td class="ua-td">
                <div class="ua-name">{{ member.fullName }}</div>
              </td>
              <td class="ua-td">
                <span class="ua-email">{{ member.email }}</span>
              </td>
              <td class="ua-td">{{ getOfficeDisplay(member.id) }}</td>
              <td class="ua-td ua-td--actions">
                <Button
                  type="danger"
                  size="medium"
                  :disabled="edcActionUserId === member.id"
                  :loading="edcActionUserId === member.id"
                  @click="removeFromEdc(member.id, member.fullName)"
                >
                  Remove
                </Button>
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </Card>

    <!-- ── Error ───────────────────────────────────────────────────────── -->
    <Alert v-if="usersError" variant="danger" dismissible @dismiss="usersError = ''">
      {{ usersError }}
    </Alert>

    <!-- ── User search results ──────────────────────────────────────────── -->
    <Card v-if="showTable || usersLoading" class="ua-results-card">
      <template #header>
        <div class="ua-results-header">
          <h3 class="ua-results-title">Search Results</h3>
          <span class="ua-results-hint">Click a row to add user as EDC member</span>
        </div>
      </template>

      <div v-if="usersLoading" class="ua-loading">
        <Spinner size="lg" />
        <span>Searching users…</span>
      </div>

      <div v-else class="ua-table-container">
        <Table>
          <template #header>
            <tr>
              <th class="ua-th ua-th--sortable" @click="onSort('fullName')">
                Full Name {{ sortIcon('fullName') }}
              </th>
              <th class="ua-th">Email</th>
              <th class="ua-th">Country / Office</th>
              <th class="ua-th">Role</th>
              <th class="ua-th ua-th--center">EDC Status</th>
            </tr>
          </template>

          <template #default>
            <tr v-if="enrichedUsers.length === 0">
              <td colspan="5" class="ua-empty-cell">
                <EmptyState title="No users found" description="Try a different search term" />
              </td>
            </tr>

            <tr
              v-for="user in enrichedUsers"
              :key="user.id"
              class="ua-row"
              :class="{
                'ua-row--member':    user.isEdcMember,
                'ua-row--clickable': !user.isEdcMember,
              }"
              :title="user.isEdcMember ? 'Already an EDC member' : 'Click to add as EDC member'"
              @click="!user.isEdcMember && addToEdc(user)"
            >
              <td class="ua-td">
                <div class="ua-name-cell">
                  <div class="ua-name">{{ user.fullName }}</div>
                  <div v-if="user.userName" class="ua-username">@{{ user.userName }}</div>
                </div>
              </td>
              <td class="ua-td">
                <span class="ua-email">{{ user.email }}</span>
              </td>
              <td class="ua-td">{{ user.officeName || user.officeCode || '—' }}</td>
              <td class="ua-td">
                <Badge
                  :label="roleLabel(user.roleCode)"
                  :variant="user.roleCode === 'ADM' ? 'danger' : user.roleCode === 'EXP' ? 'info' : 'success'"
                />
              </td>
              <td class="ua-td ua-td--center">
                <div v-if="edcActionUserId === user.id" class="ua-edc-cell">
                  <Spinner size="sm" />
                </div>
                <Badge v-else-if="user.isEdcMember" label="✓ Member" variant="success" />
                <span v-else class="ua-add-hint">+ Add</span>
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </Card>

    <!-- ── Hint when TB selected but no search yet ──────────────────────── -->
    <Card
      v-else-if="selectedTbIdNumber && !hasSearched && !usersLoading"
      class="ua-hint-card"
    >
      <EmptyState
        title="Search for users"
        :description="`Type in the search box above to find users and manage their EDC membership for ${selectedTbCode}.`"
      />
    </Card>

    <!-- ── Pagination ──────────────────────────────────────────────────── -->
    <Pagination
      v-if="meta.total > meta.limit"
      :current-page="meta.page"
      :total-pages="totalPages"
      @update:current-page="goToPage"
    />

    <Alert v-if="edcError" variant="danger">{{ edcError }}</Alert>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- ── Copy-from Modal ─────────────────────────────────────────────── -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <Modal
      :open="copyModalOpen"
      title="Copy EDC Members from Previous Session"
      @close="closeCopyModal"
    >
      <template #default>
        <div class="copy-modal-body">
          <!-- Destination info row -->
          <div class="copy-modal-dest">
            <span class="copy-modal-label">Copying into</span>
            <span class="copy-modal-tb-badge">{{ selectedTbCode }}</span>
          </div>

          <!-- Source selector -->
          <FormField label="Copy members from">
            <Select
              v-model="copySourceTbId"
              :options="copySourceOptions"
              placeholder="Select a previous session…"
            />
          </FormField>

          <p class="copy-modal-hint">
            All EDC members from the selected session will be added to
            <strong>{{ selectedTbCode }}</strong>.
            Users already assigned will be skipped automatically — this operation is safe to run
            multiple times.
          </p>

          <!-- Success -->
          <Alert v-if="copySuccess" variant="success">
            <strong>Done!</strong> {{ copySuccess.message }}
            <div v-if="copySuccess.skipped > 0" class="copy-modal-skipped">
              {{ copySuccess.skipped }}
              user{{ copySuccess.skipped !== 1 ? 's' : '' }} already existed and
              {{ copySuccess.skipped !== 1 ? 'were' : 'was' }} skipped.
            </div>
          </Alert>

          <!-- Error -->
          <Alert v-if="copyError" variant="danger">{{ copyError }}</Alert>
        </div>
      </template>

      <template #footer>
        <Button
          type="secondary"
          size="medium"
          :disabled="copyLoading"
          @click="closeCopyModal"
        >
          {{ copySuccess ? 'Close' : 'Cancel' }}
        </Button>
        <Button
          v-if="!copySuccess"
          type="primary"
          size="medium"
          :disabled="!copySourceTbId || copyLoading"
          :loading="copyLoading"
          @click="executeCopy"
        >
          Copy Members
        </Button>
      </template>
    </Modal>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.ua-view {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 40px;
}

/* ── Toolbar — 50/50 ─────────────────────────────────────────────────────── */
.ua-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.ua-tb-field {
  flex: 1 1 50%;
  position: relative;
}

.ua-tb-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.ua-search-wrapper {
  flex: 1 1 50%;
}

/* ── EDC Members Card ────────────────────────────────────────────────────── */
.ua-edc-card {
  border: 1.5px solid color-mix(in srgb, var(--color-primary-green, #009A6E) 30%, transparent);
}

.ua-edc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.ua-edc-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ua-edc-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.ua-edc-tb-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  background: color-mix(in srgb, var(--color-primary-green, #009A6E) 12%, white);
  color: var(--color-primary-green-dark, #006B4E);
  border: 1px solid color-mix(in srgb, var(--color-primary-green, #009A6E) 25%, transparent);
}

.ua-edc-empty { padding: 32px 24px; }

/* ── Search results card ─────────────────────────────────────────────────── */
.ua-results-card {
  border: 1.5px solid var(--color-neutral-200);
}

.ua-results-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ua-results-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.ua-results-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: italic;
}

.ua-hint-card { padding: 8px 0; }

/* ── Loading ─────────────────────────────────────────────────────────────── */
.ua-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px 24px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* ── Table ───────────────────────────────────────────────────────────────── */
.ua-table-container { overflow-x: auto; }

.ua-th {
  white-space: nowrap;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.ua-th--sortable { cursor: pointer; user-select: none; transition: color 0.2s; }
.ua-th--sortable:hover { color: var(--color-primary); }
.ua-th--actions { text-align: right; }
.ua-th--center  { text-align: center; }
.ua-td          { vertical-align: middle; }
.ua-td--actions { text-align: right; }
.ua-td--center  { text-align: center; }

.ua-row:hover { background-color: var(--color-background-secondary, #f8f9fa); }

.ua-row--clickable { cursor: pointer; transition: background-color 0.15s; }
.ua-row--clickable:hover {
  background-color: color-mix(in srgb, var(--color-primary-green, #009A6E) 8%, white) !important;
}

.ua-row--member { opacity: 0.55; cursor: default; }

.ua-empty-cell { padding: 48px 24px !important; text-align: center; }

.ua-name-cell { display: flex; flex-direction: column; gap: 3px; }

.ua-name { font-weight: 500; color: var(--color-text-primary); }

.ua-username {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono, monospace);
}

.ua-email { color: var(--color-text-secondary); font-size: 13px; }

.ua-edc-cell { display: flex; align-items: center; justify-content: center; }

.ua-add-hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary-green, #009A6E);
  opacity: 0;
  transition: opacity 0.15s;
}

.ua-row--clickable:hover .ua-add-hint { opacity: 1; }

/* ── Copy modal ──────────────────────────────────────────────────────────── */
.copy-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.copy-modal-dest {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-background-secondary, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--color-neutral-200);
}

.copy-modal-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.copy-modal-tb-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  background: color-mix(in srgb, var(--color-primary-green, #009A6E) 12%, white);
  color: var(--color-primary-green-dark, #006B4E);
  border: 1px solid color-mix(in srgb, var(--color-primary-green, #009A6E) 25%, transparent);
}

.copy-modal-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.copy-modal-skipped {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.8;
}
</style>