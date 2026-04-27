<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Button, Input, Select, RadioGroup, RadioOption, Alert, Badge, Icon, Card, AutocompleteList, StatusBadge } from '@upov/upov-ui';
import type { AutocompleteItem } from '@upov/upov-ui';
import type { TGStatus } from '@/types';
import { STATUS_LABELS, STATUS_VARIANTS } from '@/config/constants';
import type { UpovCodeOption } from '@/types';
import api from '@/services/api';

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit' | 'copy';
  sourceId?: number;
}>(), {
  mode: 'create',
});

const emit = defineEmits<{ cancel: []; done: [id: number] }>();

const needsSource = computed(() => props.mode === 'edit' || props.mode === 'copy');

// Form state
const reference = ref('');
const name = ref('');
const selectedCodes = ref<UpovCodeOption[]>([]);
const techWorkParty = ref('');
const languageCode = ref('EN');
const isMushroom = ref('N');
const adminComments = ref('');

// Partial revision (copy mode only)
const isPartialRevision = ref('N');

// Status (edit mode only)
const status = ref<string | null>(null);

// Target status (copy mode only)
const targetStatus = ref('LED');

// Deadlines
const deadlines = ref({
  leDraftStart: '',
  leDraftEnd: '',
  ieCommentsStart: '',
  ieCommentsEnd: '',
  leCheckingStart: '',
  leCheckingEnd: '',
  sentToUpov: '',
});

// Source TG search
const sourceSearch = ref('');
const sourceRawResults = ref<any[]>([]);
const sourceResults = computed<AutocompleteItem[]>(() =>
  sourceRawResults.value.map((r) => ({
    main: `${r.reference} — ${r.name}`,
    sub: r.upovCodes || undefined,
    _id: r.id,
  })),
);
const sourceSearching = ref(false);
const selectedSource = ref<any | null>(null);
let sourceSearchTimeout: ReturnType<typeof setTimeout> | null = null;

// Reference check
const refAvailable = ref<boolean | null>(null);
const refChecking = ref(false);

// UPOV search
const upovSearch = ref('');
const upovResults = ref<UpovCodeOption[]>([]);
const upovSearching = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Submit
const submitting = ref(false);
const submitError = ref('');
const sourceFieldRef = ref<HTMLElement | null>(null);
const sourceListRef = ref<InstanceType<typeof AutocompleteList> | null>(null);

const TWP_OPTIONS = [
  { value: 'TWA', label: 'TWA — Agricultural Crops' },
  { value: 'TWF', label: 'TWF — Fruit Crops' },
  { value: 'TWO', label: 'TWO — Ornamental Plants' },
  { value: 'TWV', label: 'TWV — Vegetables' },
  { value: 'TC', label: 'TC — Technical Committee' },
  { value: 'TC-EDC', label: 'TC-EDC — Enlarged Editorial Committee' },
];

const pageTitle = computed(() => {
  switch (props.mode) {
    case 'edit': return 'Edit Test Guideline';
    case 'copy': return 'Copy Test Guideline';
    default: return 'New Test Guideline';
  }
});

const submitLabel = computed(() => {
  if (props.mode === 'edit') return 'Save Changes';
  return 'Create Test Guideline';
});

// Validation
const refValid = computed(() => {
  const trimmedRef = reference.value.trim();
  const refUnchanged = props.mode === 'edit' && selectedSource.value && trimmedRef === selectedSource.value.reference;
  return trimmedRef.length > 0 && (refUnchanged || refAvailable.value === true);
});
const hasName = computed(() => name.value.trim().length > 0);
const hasSource = computed(() => !needsSource.value || selectedSource.value !== null);
const hasCodes = computed(() => selectedCodes.value.length > 0);
const hasTwp = computed(() => techWorkParty.value !== '');
const canSubmit = computed(() => refValid.value && hasName.value && hasSource.value && hasCodes.value && hasTwp.value);

// Reference uniqueness check (debounced)
let refCheckTimeout: ReturnType<typeof setTimeout> | null = null;
watch(reference, (val) => {
  refAvailable.value = null;
  if (refCheckTimeout) clearTimeout(refCheckTimeout);
  const trimmed = val.trim();
  if (!trimmed) return;

  if (props.mode === 'edit' && selectedSource.value && trimmed === selectedSource.value.reference) {
    refAvailable.value = true;
    return;
  }

  refCheckTimeout = setTimeout(async () => {
    refChecking.value = true;
    try {
      const res = await api.get<{ available: boolean }>('/api/admin/test-guidelines/check-reference', { params: { ref: trimmed } });
      if (reference.value.trim() === trimmed) {
        refAvailable.value = res.data.available;
      }
    } catch {
      refAvailable.value = null;
    } finally {
      refChecking.value = false;
    }
  }, 500);
});

// Source TG search (debounced)
watch(sourceSearch, (val) => {
  if (sourceSearchTimeout) clearTimeout(sourceSearchTimeout);
  if (val.length < 2) { sourceRawResults.value = []; return; }
  sourceSearchTimeout = setTimeout(async () => {
    sourceSearching.value = true;
    try {
      const res = await api.get<{ items: any[] }>('/api/admin/test-guidelines/search', { params: { q: val } });
      sourceRawResults.value = res.data.items;
    } catch {
      sourceRawResults.value = [];
    } finally {
      sourceSearching.value = false;
    }
  }, 300);
});

async function loadSourceById(id: number) {
  try {
    const res = await api.get(`/api/admin/test-guidelines/${id}/source`);
    const data = res.data;
    selectedSource.value = data;
    name.value = data.name || '';
    techWorkParty.value = data.techWorkParty || '';
    languageCode.value = data.originalLanguage || 'EN';
    isMushroom.value = data.isMushroom || 'N';
    selectedCodes.value = data.upovCodes || [];
    if (props.mode === 'edit') {
      reference.value = data.reference || '';
      status.value = data.status || null;
    }
    if (data.isPartialRevision) {
      isPartialRevision.value = data.isPartialRevision;
    }
    if (data.deadlines) {
      deadlines.value = { ...deadlines.value, ...data.deadlines };
    }
  } catch {
    // silent
  }
}

async function selectSource(item: any) {
  sourceSearch.value = '';
  sourceRawResults.value = [];
  await loadSourceById(item._id);
}

onMounted(() => {
  if (props.sourceId && needsSource.value) {
    loadSourceById(props.sourceId);
  }
});

function clearSource() {
  selectedSource.value = null;
}

// Fetch deadlines when TWP changes
watch(techWorkParty, async (code) => {
  if (!code) return;
  try {
    const year = new Date().getFullYear();
    const res = await api.get<{ deadlines: any }>('/api/admin/test-guidelines/deadlines', { params: { code, year } });
    if (res.data.deadlines) {
      deadlines.value = { ...deadlines.value, ...res.data.deadlines };
    }
    // Default leDraftStart to tomorrow if still empty after auto-fill
    if (!deadlines.value.leDraftStart) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      deadlines.value.leDraftStart = tomorrow.toISOString().slice(0, 10);
    }
  } catch {
    // silent
  }
});

// UPOV code search (debounced)
watch(upovSearch, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (val.length < 2) { upovResults.value = []; return; }
  searchTimeout = setTimeout(async () => {
    upovSearching.value = true;
    try {
      const res = await api.get<{ items: UpovCodeOption[] }>('/api/admin/upov-codes', { params: { search: val } });
      upovResults.value = res.data.items.filter((r) => !selectedCodes.value.some((s) => s.id === r.id));
    } catch {
      upovResults.value = [];
    } finally {
      upovSearching.value = false;
    }
  }, 300);
});

function addCode(code: UpovCodeOption) {
  if (!selectedCodes.value.some((s) => s.id === code.id)) {
    selectedCodes.value.push(code);
  }
  upovSearch.value = '';
  upovResults.value = [];
}

function removeCode(id: number) {
  selectedCodes.value = selectedCodes.value.filter((c) => c.id !== id);
}

function moveCode(index: number, dir: -1 | 1) {
  const arr = [...selectedCodes.value];
  const target = index + dir;
  if (target < 0 || target >= arr.length) return;
  [arr[index], arr[target]] = [arr[target], arr[index]];
  selectedCodes.value = arr;
}

// Submit
async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  submitError.value = '';
  try {
    const payload: Record<string, any> = {
      reference: reference.value.trim(),
      name: name.value.trim(),
      upovCodeIds: selectedCodes.value.map((c) => c.id),
      techWorkParty: techWorkParty.value,
      languageCode: languageCode.value,
      isMushroom: isMushroom.value,
      adminComments: adminComments.value.trim() || undefined,
      deadlines: deadlines.value,
      isPartialRevision: isPartialRevision.value,
    };

    let id: number;
    if (props.mode === 'edit') {
      if (status.value !== null) payload.status = status.value;
      const res = await api.patch<{ id: number }>(`/api/admin/test-guidelines/${selectedSource.value.id}`, payload);
      id = res.data.id;
    } else {
      payload.sourceId = props.mode === 'copy' ? selectedSource.value?.id : undefined;
      if (props.mode === 'copy') payload.targetStatus = targetStatus.value;
      const res = await api.post<{ id: number }>('/api/admin/test-guidelines', payload);
      id = res.data.id;
    }
    emit('done', id);
  } catch (err: any) {
    submitError.value = err.response?.data?.error?.message || 'Failed to save.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="tg-form">
    <Alert v-if="submitError" variant="error" class="tg-form__error">{{ submitError }}</Alert>

    <!-- Section: Source TG (edit/copy modes) -->
    <Card v-if="needsSource" class="tg-form__section">
      <h3 class="section-title">
        {{ mode === 'edit' ? 'Select Test Guideline' : 'Source Test Guideline' }}
      </h3>

      <div v-if="!selectedSource" ref="sourceFieldRef" class="form-field" @keydown="sourceListRef?.handleKeydown($event)">
        <Input
          v-model="sourceSearch"
          :label="mode === 'edit' ? 'Find Test Guideline' : 'Find Source TG'"
          placeholder="Search by reference, name, or UPOV code..."
        />
        <AutocompleteList
          v-if="sourceResults.length > 0 || sourceSearching"
          ref="sourceListRef"
          :items="sourceResults"
          :loading="sourceSearching"
          :query="sourceSearch"
          :anchor="sourceFieldRef"
          compact
          @select="selectSource"
        />
      </div>

      <div v-else class="source-card">
        <div class="source-card-header">
          <div>
            <span class="source-card-ref">{{ selectedSource.reference }}</span>
            <span class="source-card-name">{{ selectedSource.name }}</span>
            <StatusBadge
              v-if="selectedSource.status"
              :label="STATUS_LABELS[selectedSource.status as TGStatus] || selectedSource.status"
              :variant="STATUS_VARIANTS[selectedSource.status as TGStatus] || 'neutral'"
            />
          </div>
          <button class="upov-btn upov-btn--remove" @click="clearSource">
            <Icon icon="x" size="small" />
          </button>
        </div>
        <p v-if="selectedSource.leadExpert" class="source-card-expert">
          Leading Expert: {{ selectedSource.leadExpert }}<span v-if="selectedSource.leadExpertCountry" class="source-card-country"> ({{ selectedSource.leadExpertCountry }})</span>
        </p>
        <div v-if="selectedSource.upovCodes?.length" class="source-card-codes">
          <Badge v-for="c in selectedSource.upovCodes" :key="c.id" :label="c.code" variant="code" size="small" />
        </div>
      </div>

    </Card>

    <!-- Section: Identification -->
    <Card class="tg-form__section">
      <h3 class="section-title">Identification</h3>
      <div class="form-row">
        <div class="form-field" :class="{ 'form-field--error': refAvailable === false }">
          <Input v-model="reference" label="TG Reference" placeholder="e.g. TG/123/Proj.4" />
          <span v-if="refChecking" class="field-hint">Checking...</span>
          <span v-else-if="refAvailable === true" class="field-hint field-hint--ok">
            <Icon icon="check-circle-fill" size="small" /> Available
          </span>
          <span v-else-if="refAvailable === false" class="field-hint field-hint--error">
            <Icon icon="x-circle-fill" size="small" /> Already in use
          </span>
        </div>
        <Input v-model="name" label="TG Name" placeholder="e.g. Apple" />
      </div>
    </Card>

    <!-- Section: UPOV Codes -->
    <Card class="tg-form__section">
      <h3 class="section-title">UPOV Codes</h3>
      <div class="form-field">
        <Input
          v-model="upovSearch"
          label="Search UPOV Codes"
          placeholder="Type to search by code or botanical name..."
        />
        <div v-if="upovResults.length" class="upov-results">
          <button
            v-for="item in upovResults"
            :key="item.id"
            class="upov-result"
            @click="addCode(item)"
          >
            <Badge :label="item.code" variant="code" size="small" />
            <span class="upov-result-name">{{ item.botanicalName }}</span>
          </button>
        </div>
        <p v-if="upovSearching" class="field-hint">Searching...</p>
      </div>

      <div v-if="selectedCodes.length" class="upov-selected">
        <p class="upov-selected-label">Selected ({{ selectedCodes.length }}):</p>
        <div
          v-for="(code, idx) in selectedCodes"
          :key="code.id"
          class="upov-selected-item"
        >
          <span class="upov-selected-order">{{ idx + 1 }}</span>
          <Badge :label="code.code" variant="code" size="small" />
          <span class="upov-selected-name">{{ code.botanicalName }}</span>
          <span class="upov-selected-actions">
            <button :disabled="idx === 0" class="upov-btn" @click="moveCode(idx, -1)">
              <Icon icon="chevron-up" size="small" />
            </button>
            <button :disabled="idx === selectedCodes.length - 1" class="upov-btn" @click="moveCode(idx, 1)">
              <Icon icon="chevron-down" size="small" />
            </button>
            <button class="upov-btn upov-btn--remove" @click="removeCode(code.id)">
              <Icon icon="x" size="small" />
            </button>
          </span>
        </div>
      </div>
    </Card>

    <!-- Section: Assignment & Deadlines -->
    <Card class="tg-form__section">
      <h3 class="section-title">Assignment</h3>
      <div class="form-row">
        <div class="form-field">
          <label class="field-label">Technical Body</label>
          <Select
            v-model="techWorkParty"
            placeholder="Select a technical body"
            :options="TWP_OPTIONS"
          />
        </div>
        <Input v-model="languageCode" label="Original Language" placeholder="EN" />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label class="field-label">Mushroom Test Guidelines?</label>
          <RadioGroup v-model="isMushroom" direction="horizontal">
            <RadioOption value="N" label="No" />
            <RadioOption value="Y" label="Yes" />
          </RadioGroup>
        </div>
        <Input v-model="adminComments" label="Admin Comments (optional)" placeholder="Internal notes..." />
      </div>

      <div v-if="mode === 'copy'" class="form-row">
        <div class="form-field">
          <label class="field-label">Partial Revision?</label>
          <RadioGroup v-model="isPartialRevision" direction="horizontal">
            <RadioOption value="N" label="No" />
            <RadioOption value="Y" label="Yes" />
          </RadioGroup>
        </div>
        <div class="form-field">
          <label class="field-label">New Draft Status</label>
          <Select
            v-model="targetStatus"
            :options="[
              { value: 'LED', label: 'LED — LE Draft' },
              { value: 'TWD', label: 'TWD — TWP Draft' },
              { value: 'TDD', label: 'TDD — TC Draft' },
            ]"
          />
        </div>
      </div>

      <div v-if="mode === 'edit'" class="form-row">
        <div class="form-field">
          <label class="field-label">Partial Revision?</label>
          <RadioGroup v-model="isPartialRevision" direction="horizontal">
            <RadioOption value="N" label="No" />
            <RadioOption value="Y" label="Yes" />
          </RadioGroup>
        </div>
        <div class="form-field">
          <label class="field-label">Status</label>
          <Select
            v-model="status"
            :options="[
              { value: null, label: 'Keep current' },
              { value: 'TCD', label: 'TCD — TC Draft' },
              { value: 'ADT', label: 'ADT — Adopted' },
              { value: 'ADC', label: 'ADC — Adopted (Corrected)' },
            ]"
          />
        </div>
      </div>

      <h3 class="section-title section-title--sub">Deadlines</h3>
      <div class="deadline-grid">
        <Input v-model="deadlines.leDraftStart" label="LE Draft Start" placeholder="YYYY-MM-DD" />
        <Input v-model="deadlines.leDraftEnd" label="LE Draft End" placeholder="YYYY-MM-DD" />
        <Input v-model="deadlines.ieCommentsStart" label="IE Comments Start" placeholder="YYYY-MM-DD" />
        <Input v-model="deadlines.ieCommentsEnd" label="IE Comments End" placeholder="YYYY-MM-DD" />
        <Input v-model="deadlines.leCheckingStart" label="LE Checking Start" placeholder="YYYY-MM-DD" />
        <Input v-model="deadlines.leCheckingEnd" label="LE Checking End" placeholder="YYYY-MM-DD" />
        <Input v-model="deadlines.sentToUpov" label="Sent to UPOV" placeholder="YYYY-MM-DD" />
      </div>
    </Card>

    <!-- Actions -->
    <div class="tg-form__actions">
      <Button type="tertiary" size="small" @click="emit('cancel')">Cancel</Button>
      <Button
        type="primary"
        size="small"
        :disabled="!canSubmit || submitting"
        @click="submit"
      >
        {{ submitting ? 'Saving...' : submitLabel }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.tg-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tg-form__error {
  margin-bottom: 0;
}

.tg-form__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.section-title--sub {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--color-neutral-200);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-hint--ok {
  color: var(--color-primary-green);
}

.field-hint--error {
  color: var(--color-error-red, #dc3545);
}

.form-field--error :deep(.input-atom__wrapper) {
  border-color: var(--color-danger, #c83c58) !important;
}

.deadline-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.tg-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

/* UPOV search results */
.upov-results {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.upov-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-neutral-100);
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
}

.upov-result:last-child {
  border-bottom: none;
}

.upov-result:hover {
  background: var(--color-neutral-50);
}

.upov-result-name {
  color: var(--color-text-secondary);
  font-style: italic;
}

/* UPOV selected list */
.upov-selected {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upov-selected-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 4px 0 0;
}

.upov-selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--color-neutral-50);
}

.upov-selected-order {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 16px;
  text-align: center;
}

.upov-selected-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
  flex: 1;
}

.upov-selected-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.upov-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.upov-btn:hover:not(:disabled) {
  background: var(--color-neutral-200);
}

.upov-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.upov-btn--remove:hover:not(:disabled) {
  color: var(--color-error-red, #dc3545);
}

.upov-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Selected source card */
.source-card {
  background: color-mix(in srgb, var(--color-primary-green) 6%, transparent);
  border: 1px solid var(--color-primary-green);
  border-radius: 8px;
  padding: 12px;
}

.source-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.source-card-ref {
  font-weight: 600;
  color: var(--color-primary-green-dark);
  margin-right: 8px;
}

.source-card-name {
  color: var(--color-text-primary);
  padding-right: 16px;
}

.source-card-expert {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 6px 0 0;
}

.source-card-country {
  color: var(--color-text-secondary);
}

.source-card-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
</style>
