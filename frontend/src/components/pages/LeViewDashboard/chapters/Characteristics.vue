<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { 
  Modal, Button, Input, Select, Chip, RadioGroup, RadioOption, 
  Table, Card, Alert
} from '@upov/upov-ui';
import type { SelectOption } from '@upov/upov-ui';
import { useTinymce } from '@/composables/useTinymce';

// Use TinyMCE composable for consistent configuration
const { apiKey: tinymceApiKey, init: tinymceInit } = useTinymce({ height: 300 });

interface StateRow {
  id: string;
  expression: string;
  notes: string | null;
  exampleVarieties: string[];
}

interface CharacteristicForm {
  asterics: boolean;
  grouping: boolean;
  tq5: boolean;
  name: string;
  typeOfExpression: string;
  growthStage: string;
  methods: {
    MG: boolean;
    MS: boolean;
    VG: boolean;
    VS: boolean;
    OTHER: boolean;
  };
  mgPlotType: string;
  msPlotType: string;
  states: StateRow[];
  explanation: string;
}

const props = withDefaults(defineProps<{
  mode?: 'add' | 'edit';
  initialData?: Partial<CharacteristicForm>;
}>(), {
  mode: 'add',
});

const emit = defineEmits<{
  exit: [];
  save: [data: CharacteristicForm];
}>();

const expressionTypes: SelectOption[] = [
  { value: 'QN', label: 'QN - Quantitative' },
  { value: 'QL', label: 'QL - Qualitative' },
  { value: 'PQ', label: 'PQ - Pseudo-qualitative' },
  { value: 'QA', label: 'QA - Quantitative Alternative' },
];

const plotTypes: SelectOption[] = [
  { value: 'Single', label: 'Single' },
  { value: 'Replicated', label: 'Replicated' },
  { value: 'Multiple', label: 'Multiple' },
];

const notesOptions: SelectOption[] = Array.from({ length: 9 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const varietyOptions = Array.from({ length: 10 }, (_, i) => String(i + 1));

function makeState(): StateRow {
  return { 
    id: Math.random().toString(36).slice(2), 
    expression: '', 
    notes: null, 
    exampleVarieties: [] 
  };
}

const form = ref<CharacteristicForm>({
  asterics: props.initialData?.asterics ?? false,
  grouping: props.initialData?.grouping ?? false,
  tq5: props.initialData?.tq5 ?? false,
  name: props.initialData?.name ?? '',
  typeOfExpression: props.initialData?.typeOfExpression ?? '',
  growthStage: props.initialData?.growthStage ?? '',
  methods: props.initialData?.methods ?? { MG: false, MS: false, VG: false, VS: false, OTHER: false },
  mgPlotType: props.initialData?.mgPlotType ?? '',
  msPlotType: props.initialData?.msPlotType ?? '',
  states: props.initialData?.states ?? [makeState()],
  explanation: props.initialData?.explanation ?? '',
});

// Separate ref for TinyMCE explanation value
const explanationValue = ref(form.value.explanation);

// Separate ref for inline growth stage editor
const growthStageValue = ref(form.value.growthStage);

const hasActiveMethods = computed(() =>
  form.value.methods.MG || form.value.methods.MS || form.value.methods.VG || form.value.methods.VS || form.value.methods.OTHER
);

const isFormValid = computed(() =>
  props.mode === 'edit' ||
  (form.value.name.trim() !== '' && form.value.typeOfExpression !== '' && hasActiveMethods.value)
);

function addState() {
  form.value.states.push(makeState());
}

function removeState(id: string) {
  form.value.states = form.value.states.filter(s => s.id !== id);
}

function toggleVariety(state: StateRow, v: string) {
  const idx = state.exampleVarieties.indexOf(v);
  if (idx >= 0) state.exampleVarieties.splice(idx, 1);
  else state.exampleVarieties.push(v);
}

function removeVariety(state: StateRow, v: string) {
  state.exampleVarieties = state.exampleVarieties.filter(x => x !== v);
}

function handleSave() {
  if (!isFormValid.value) return;
  // Update form with TinyMCE values
  form.value.explanation = explanationValue.value;
  form.value.growthStage = growthStageValue.value;
  emit('save', { ...form.value });
}

function handleExit() {
  showModal.value = false;
  emit('exit');
}

const showModal = ref(true);
</script>

<template>
  <Modal 
    v-model:open="showModal" 
    :title="mode === 'edit' ? 'Edit Characteristics' : 'Add Characteristics'"
    max-width="900px"
  >
    <template #subtitle>
      <p class="modal-subtitle">Some fields are mandatory and must be completed (<span class="required-mark">*</span>)</p>
    </template>

    <div class="characteristics-form">
      <!-- Specific Functions -->
      <section class="form-section">
        <h3 class="section-title">Specific functions</h3>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.asterics" class="checkbox-input" />
            <span class="checkbox-text">Asterics characteristic</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.grouping" class="checkbox-input" />
            <span class="checkbox-text">Grouping characteristics</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.tq5" class="checkbox-input" />
            <span class="checkbox-text">Add to TQ5 characteristics</span>
          </label>
        </div>
      </section>

      <!-- Basic Information -->
      <section class="form-section">
        <div class="form-grid">
          <Input
            v-model="form.name"
            label="Enter Characteristics Name"
            placeholder="Insert the name"
            required
          />
          <Select
            v-model="form.typeOfExpression"
            :options="expressionTypes"
            label="Type of Expression"
            placeholder="Select a type of expression..."
            required
          />
          <div class="form-field">
            <label class="field-label">Growth {{ mode === 'edit' ? 'Stage' : 'Stages' }}</label>
            <Input
              v-model="growthStageValue"
              placeholder="00"
            />
          </div>
        </div>
      </section>

      <!-- Methods of Observation -->
      <section class="form-section">
        <h3 class="section-title">Methods of Observation & Type of Plot <span class="required-mark">*</span></h3>
        <div class="methods-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.methods.MG" class="checkbox-input" />
            <span class="checkbox-text">MG</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.methods.MS" class="checkbox-input" />
            <span class="checkbox-text">MS</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.methods.VG" class="checkbox-input" />
            <span class="checkbox-text">VG</span>
          </label>
          <div class="methods-separator"></div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.methods.VS" class="checkbox-input" />
            <span class="checkbox-text">VS</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.methods.OTHER" class="checkbox-input" />
            <span class="checkbox-text">OTHER</span>
          </label>
        </div>
        <div v-if="form.methods.MG || form.methods.MS" class="plot-selects">
          <Select
            v-if="form.methods.MG"
            v-model="form.mgPlotType"
            :options="plotTypes"
            placeholder="Select"
            size="small"
            class="plot-select"
          />
          <Select
            v-if="form.methods.MS"
            v-model="form.msPlotType"
            :options="plotTypes"
            placeholder="Select"
            size="small"
            class="plot-select"
          />
        </div>
      </section>

      <!-- States of Expression -->
      <section class="form-section states-section">
        <div v-for="(state, idx) in form.states" :key="state.id" class="state-row">
          <div class="state-grid">
            <Input
              v-model="state.expression"
              label="State of Expression"
              :placeholder="mode === 'edit' ? 'Insert text' : 'Insert the expression'"
            />
            <Select
              v-model="state.notes"
              :options="notesOptions"
              label="Notes"
              placeholder="Select notes"
            />
            <div class="varieties-field">
              <label class="field-label">Example of varieties</label>
              <div class="varieties-wrapper">
                <Chip
                  v-for="v in state.exampleVarieties"
                  :key="v"
                  :label="v"
                  removable
                  @removed="removeVariety(state, v)"
                />
                <Select
                  :model-value="''"
                  :options="varietyOptions.filter(v => !state.exampleVarieties.includes(v)).map(v => ({ value: v, label: v }))"
                  placeholder=""
                  class="varieties-select-inline"
                  @update:model-value="(val: string) => { if (val) state.exampleVarieties.push(val); }"
                />
              </div>
            </div>
            <Button
              v-if="form.states.length > 1 || idx > 0"
              type="danger"
              size="small"
              icon-left="trash"
              title="Remove state"
              class="delete-state-btn"
              @click="removeState(state.id)"
            />
          </div>
        </div>
        <Button type="primary" size="small" @click="addState" class="add-state-btn">
          + Add new state
        </Button>
      </section>

      <!-- Explanation -->
      <section class="form-section">
        <h3 class="section-title">Add explanation for this characteristic</h3>
        <div class="tinymce-wrapper">
          <Editor
            :model-value="explanationValue"
            :api-key="tinymceApiKey"
            :init="tinymceInit"
            @update:model-value="explanationValue = $event"
          />
        </div>
      </section>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <Button type="secondary" size="small" @click="handleExit">
        Exit
      </Button>
      <Button
        type="primary"
        size="small"
        :disabled="!isFormValid"
        @click="handleSave"
      >
        {{ mode === 'edit' ? 'Save changes' : 'Add Characteristics' }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.modal-subtitle {
  font-size: 13px;
  color: var(--color-neutral-600);
  margin: 0;
}

.required-mark {
  color: var(--color-error-600);
}

.characteristics-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-neutral-200);
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 12px;
}

/* Checkboxes */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  accent-color: #00A37A;
  margin: 0;
}

.checkbox-text {
  font-size: 14px;
  color: var(--color-neutral-700);
  font-weight: 400;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: end;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-700);
  margin-bottom: 6px;
  display: block;
}

/* Inline Editor for Growth Stage */
.inline-editor-wrapper {
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--color-neutral-300);
  border-radius: 4px;
  background: var(--color-bg-white);
  cursor: text;
}

.inline-editor-wrapper :deep(.tox-tinymce) {
  border: none !important;
}

.inline-editor-wrapper :deep(.tox-tinymce-inline) {
  border: none !important;
  box-shadow: none !important;
}

/* Methods Row */
.methods-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.methods-separator {
  width: 1px;
  height: 20px;
  background: var(--color-neutral-200);
}

.plot-selects {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.plot-select {
  width: 140px;
}

/* States Container */
.states-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-row {
  position: relative;
}

.state-grid {
  display: grid;
  grid-template-columns: 1fr 140px 1fr 40px;
  gap: 12px;
  align-items: end;
}

.varieties-field {
  display: flex;
  flex-direction: column;
}

.varieties-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 40px;
  padding: 4px 8px;
  border: 1px solid var(--color-neutral-300);
  border-radius: 4px;
  background: var(--color-bg-white);
}

.varieties-select-inline {
  flex: 0 1 auto;
  min-width: 60px;
}

.varieties-select-inline :deep(.upov-input-wrapper),
.varieties-select-inline :deep(.upov-select-wrapper) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  min-height: 28px !important;
}

.varieties-select-inline :deep(.upov-select-trigger) {
  padding: 2px 24px 2px 4px !important;
  border: none !important;
  min-height: 28px !important;
}

.delete-state-btn {
  align-self: end;
  margin-bottom: 2px;
}

.add-state-btn {
  align-self: flex-start;
  margin-top: 4px;
}

/* TinyMCE Wrapper */
.tinymce-wrapper :deep(.tox-tinymce) {
  border: 1px solid var(--color-neutral-300) !important;
  border-radius: 4px !important;
}

.tinymce-wrapper :deep(.tox-toolbar__primary) {
  background: var(--color-bg-white) !important;
  border-bottom: 1px solid var(--color-neutral-200) !important;
}

.tinymce-wrapper :deep(.tox-toolbar-overlord) {
  background: var(--color-bg-white) !important;
}

.tinymce-wrapper :deep(.tox .tox-tbtn svg) {
  fill: var(--color-primary-900) !important;
}

.tinymce-wrapper :deep(.tox .tox-tbtn:hover) {
  background: var(--color-primary-50) !important;
}

.tinymce-wrapper :deep(.tox .tox-statusbar) {
  border-top: 1px solid var(--color-neutral-200) !important;
}

.tinymce-wrapper :deep(.tox-statusbar__branding) {
  display: none;
}

/* Responsive */
@media (max-width: 768px) {
  .form-grid,
  .state-grid {
    grid-template-columns: 1fr;
  }
  
  .delete-state-btn {
    justify-self: start;
    margin-top: 8px;
  }
}
</style>