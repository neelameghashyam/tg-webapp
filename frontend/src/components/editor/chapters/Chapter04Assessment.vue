<script setup lang="ts">
import { computed, ref } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { RadioGroup, RadioOption, Input, Button, Card } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';
import { editorApi } from '@/services/editor-api';
import SectionAccordion from '@/components/editor/shared/SectionAccordion.vue';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import type { AssessmentPropMethod } from '@/types/editor';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 200 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } =
  useChapterPreview('04');

// ── Null-safe data accessor ───────────────────────────────────────────────────
// DB returns null for unset fields. Using ?? '' prevents null being passed to
// RadioGroup/Input which causes values to not display even when data exists.
const data = computed(() => store.chapters['04'] ?? {});

function s(field: string): string {
  const v = (data.value as Record<string, unknown>)[field];
  return v == null ? '' : String(v);
}

// ── Scalar field autosave ─────────────────────────────────────────────────────
function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('04', field, value ?? '');
  markDirty();
}
function setRadio(field: string, value: string) {
  onFieldChange(field, value);
}

// ── SinglePlant helpers (TG_Assessment.SinglePlant stored as "first;second") ─
function spFirst(): string  { return s('SinglePlant').split(';')[0] ?? ''; }
function spSecond(): string { return s('SinglePlant').split(';')[1] ?? ''; }
function setSpFirst(v: string)  { onFieldChange('SinglePlant', v + ';' + spSecond()); }
function setSpSecond(v: string) { onFieldChange('SinglePlant', spFirst() + ';' + v); }

// ── typeOfPropagation display ─────────────────────────────────────────────────
// DB: typeOfPropagation = "" when set via autocomplete dropdown,
//     OtherTypeOfPropagation = "Bseed-propagated varieties…"
// We show typeOfPropagation first; fall back to OtherTypeOfPropagation (WITH prefix)
function getTypeOfPropagation(): string {
  const main = s('typeOfPropagation');
  if (main) return main;
  return s('OtherTypeOfPropagation');
}

// Helper to get value from main field or Other field (keeping prefix)
function getFieldOrOther(mainField: string, otherField: string): string {
  const main = s(mainField);
  if (main) return main;
  return s(otherField);
}

// Helper to set value to main field
function setFieldOrOther(mainField: string, otherField: string, value: string) {
  onFieldChange(mainField, value);
}

// ── Assessment propagation methods ────────────────────────────────────────────
// Loaded from store.propagationMethods.assessment
// Real DB columns (verified from API response):
//   AssesmentMethodPropogation_ID, Assessment_ID
//   PropogationMethod          — empty when autocomplete used
//   OtherPropogationMethodInfo — "Aseed-propagated varieties" (A prefix = other)
//   NumberOfPlants             — "10;7" (plantsFirst;plantsSecond)
//   NumberOfPartsOfPlants      — number of parts
//   isPartsOfSinglePlants      — "Y"/"N" (lowercase i)
const propMethods = computed(() => store.propagationMethods?.assessment ?? []);

// Get display name: OtherPropogationMethodInfo (with prefix), or PropogationMethod
function pmName(pm: AssessmentPropMethod): string {
  if (pm.OtherPropogationMethodInfo) return pm.OtherPropogationMethodInfo;
  return pm.PropogationMethod ?? '';
}
function pmFirst(pm: AssessmentPropMethod): string  { return (pm.NumberOfPlants ?? '').split(';')[0] ?? ''; }
function pmSecond(pm: AssessmentPropMethod): string { return (pm.NumberOfPlants ?? '').split(';')[1] ?? ''; }

const addingPropMethod = ref(false);

// All propagation method operations now go through the single
// PATCH /api/test-guidelines/:id/chapters/04  using the _action field:
//   _action: "pm_create" | "pm_update" | "pm_delete"
//   _pmId:   AssesmentMethodPropogation_ID  (for update/delete)

async function addPropMethod() {
  if (addingPropMethod.value || !store.tgId) return;
  addingPropMethod.value = true;
  try {
    const res = await editorApi.patchChapter(store.tgId, '04', {
      _action: 'pm_create',
      PropogationMethod: '',
      OtherPropogationMethodInfo: '',
      NumberOfPlants: ';',
      NumberOfPartsOfPlants: '',
      isPartsOfSinglePlants: 'N',
    });
    // BE returns { ok: true, row: {...} }
    if (res?.row) store.propagationMethods.assessment.push(res.row);
    markDirty();
  } finally {
    addingPropMethod.value = false;
  }
}

async function removePropMethod(pmId: number) {
  if (!store.tgId) return;
  await editorApi.patchChapter(store.tgId, '04', {
    _action: 'pm_delete',
    _pmId: pmId,
  });
  store.propagationMethods.assessment = store.propagationMethods.assessment.filter(
    (m: AssessmentPropMethod) => m.AssesmentMethodPropogation_ID !== pmId
  );
  markDirty();
}

async function updatePmField(pm: AssessmentPropMethod, field: string, value: string) {
  (pm as Record<string, unknown>)[field] = value;
  if (!store.tgId) return;
  await editorApi.patchChapter(store.tgId, '04', {
    _action: 'pm_update',
    _pmId: pm.AssesmentMethodPropogation_ID,
    [field]: value,
  });
  markDirty();
}

function setPmFirst(pm: AssessmentPropMethod, v: string) {
  updatePmField(pm, 'NumberOfPlants', v + ';' + pmSecond(pm));
}
function setPmSecond(pm: AssessmentPropMethod, v: string) {
  updatePmField(pm, 'NumberOfPlants', pmFirst(pm) + ';' + v);
}
function setPmName(pm: AssessmentPropMethod, v: string) {
  // Always save to OtherPropogationMethodInfo to match legacy behaviour
  updatePmField(pm, 'OtherPropogationMethodInfo', v);
}

// ── UniformityAssessmentDifferentSample helpers ──────────────────────────────
// Legacy stores checkboxes as semicolon-delimited: "Y;uniAllPlants;UniformityAssessmentSubSample"
// We need to parse and update this compound field
function isDiffSampleAllPlants(): boolean {
  const val = s('UniformityAssessmentDifferentSample');
  return val.includes('uniAllPlants');
}

function isDiffSampleSubSample(): boolean {
  const val = s('UniformityAssessmentDifferentSample');
  return val.includes('UniformityAssessmentSubSample');
}

function toggleDiffSampleAllPlants(checked: boolean) {
  const parts = s('UniformityAssessmentDifferentSample').split(';').filter(p => p && p !== 'uniAllPlants');
  if (checked && parts[0] === 'Y') {
    parts.push('uniAllPlants');
  }
  onFieldChange('UniformityAssessmentDifferentSample', parts.join(';'));
}

function toggleDiffSampleSubSample(checked: boolean) {
  const parts = s('UniformityAssessmentDifferentSample').split(';').filter(p => p && p !== 'UniformityAssessmentSubSample');
  if (checked && parts[0] === 'Y') {
    parts.push('UniformityAssessmentSubSample');
  }
  onFieldChange('UniformityAssessmentDifferentSample', parts.join(';'));
}
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <div style="display: flex; flex-direction: column; gap: 16px">

        <!-- ══════════════════════════════════════════════════════════
             4.1  DISTINCTNESS
        ══════════════════════════════════════════════════════════ -->
        <SectionAccordion number="4.1" title="Distinctness" :open="true">
          <div style="display: flex; flex-direction: column; gap: 20px">

            <!-- ── General Recommendations ── -->
            <div style="display: flex; flex-direction: column; gap: 12px">
              <h3 style="font-size: 15px; font-weight: 700; color: var(--color-neutral-800); margin: 0">
                General Recommendations
              </h3>

              <!--
                legacy: assessment_4_1_question_1 — "Do these Test Guidelines cover hybrid varieties?"
                DB field: IsHybridVariety  (from API: "Y")
              -->
              <div style="display: flex; flex-direction: column; gap: 6px">
                <label style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                  Do these Test Guidelines cover hybrid varieties?
                  <span style="color: #D32F2F"> *</span>
                </label>
                <RadioGroup
                  :model-value="s('IsHybridVariety')"
                  direction="horizontal"
                  @update:model-value="setRadio('IsHybridVariety', $event)"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- Sub-block when IsHybridVariety = Y -->
              <Card
                v-if="s('IsHybridVariety') === 'Y'"
                padding="compact" elevation="low"
              >
                <!--
                  legacy: assessment_4_1_subquestion_1 — "In the case of hybrids, is the parent formula used?"
                  DB field: IsHybridParentFormula  (from API: "Y")
                -->
                <div style="display: flex; flex-direction: column; gap: 6px">
                  <label style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                    In the case of hybrids, is the parent formula used?
                    <span style="color: #D32F2F"> *</span>
                  </label>
                  <RadioGroup
                    :model-value="s('IsHybridParentFormula')"
                    direction="horizontal"
                    @update:model-value="setRadio('IsHybridParentFormula', $event)"
                  >
                    <RadioOption value="Y" label="Yes" />
                    <RadioOption value="N" label="No" />
                  </RadioGroup>
                </div>

                <!-- ASW 7(a) — shown when IsHybridParentFormula = Y -->
                <div
                  v-if="s('IsHybridParentFormula') === 'Y'"
                  style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.65;
                         padding: 8px 10px; background: var(--color-neutral-100); border-radius: 4px"
                >
                  To assess distinctness of hybrids, the parent lines and the formula may be used
                  according to the following recommendations:<br><br>
                  (i) description of parent lines according to the Test Guidelines;<br><br>
                  (ii) check of the originality of the parent lines in comparison with the variety
                  collection, based on the characteristics in Chapter 7, in order to identify
                  similar parent lines;<br><br>
                  (iii) check of the originality of the hybrid formula in relation to the hybrids
                  in the variety collection, taking into account the most similar lines; and<br><br>
                  (iv) assessment of the distinctness at the hybrid level for varieties with a
                  similar formula. Further guidance is provided in documents TGP/9
                  "Examining Distinctness" and TGP/8 "Trial Design and Techniques Used in the
                  Examination of Distinctness, Uniformity and Stability".
                  <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                    <i>(ASW 7(a))</i>
                  </a>
                </div>

                <!--
                  Additional distinctness info for hybrid varieties
                  DB field: DistinctnessHybridAddInfo (separate from general DistinctnessAddInfo)
                  Legacy has TWO separate editors in 4.1
                -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px">
                  <div v-if="!s('DistinctnessHybridAddInfo')">
                    <Button type="secondary" size="small" @click="onFieldChange('DistinctnessHybridAddInfo', '<p></p>')">
                      + Add Paragraph
                    </Button>
                    <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                      Additional information on assessment of distinctness in case of hybrid varieties
                    </span>
                  </div>
                  <div v-else>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                      <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                        Additional information on assessment of distinctness in case of hybrid varieties
                      </label>
                      <Button type="danger" size="small" @click="onFieldChange('DistinctnessHybridAddInfo', '')">
                        Remove Paragraph
                      </Button>
                    </div>
                    <Editor
                      :model-value="s('DistinctnessHybridAddInfo')"
                      :api-key="apiKey"
                      :init="init"
                      @update:model-value="onFieldChange('DistinctnessHybridAddInfo', $event)"
                    />
                  </div>
                </div>
              </Card>
            </div>

            <!-- ── Number of plants / Parts of plants to be Examined ── -->
            <div style="display: flex; flex-direction: column; gap: 12px">
              <h3 style="font-size: 15px; font-weight: 700; color: var(--color-neutral-800); margin: 0">
                Number of plants / Parts of plants to be Examined
              </h3>

              <!--
                legacy: assessment_4_1_question_2 — "Is there more than one method of propagation?"
                DB field: IsOneMethodOfPropogation  (from API: "Y")
              -->
              <div style="display: flex; flex-direction: column; gap: 6px">
                <label style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                  Is there more than one method of propagation?
                  <span style="color: #D32F2F"> *</span>
                </label>
                <RadioGroup
                  :model-value="s('IsOneMethodOfPropogation')"
                  direction="horizontal"
                  @update:model-value="setRadio('IsOneMethodOfPropogation', $event)"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- ── When NO — single propagation method ── -->
              <!--
                DB fields: SinglePlant = " ; " (first;second), IsPartsOfSinglePlants, PartsPlant
                spFirst()/spSecond() split "10;7" → "10" and "7"
              -->
              <Card
                v-if="s('IsOneMethodOfPropogation') === 'N'"
                padding="compact"
                elevation="flat"
                style="border: 2px solid #CEDD80"
              >
                <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8; margin: 0">
                  Unless otherwise indicated, for the purpose of distinctness, all observations
                  on single plants should be made on
                  <Input
                    :model-value="spFirst()"
                    placeholder="(number)"
                    size="small"
                    style="display: inline-block; width: 70px; margin: 0 4px"
                    @update:model-value="setSpFirst($event)"
                  />
                  plants or parts taken from each of
                  <Input
                    :model-value="spSecond()"
                    placeholder="(number)"
                    size="small"
                    style="display: inline-block; width: 70px; margin: 0 4px"
                    @update:model-value="setSpSecond($event)"
                  />
                  plants and any other observations made on all plants in the test,
                  disregarding any off-type plants.
                </p>

                <!-- Are observations made on parts taken from single plants? -->
                <!--  DB: IsPartsOfSinglePlants (from API: "N") -->
                <div style="display: flex; flex-direction: column; gap: 6px">
                  <label style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                    Are observations made on parts taken from single plants?
                  </label>
                  <RadioGroup
                    :model-value="s('IsPartsOfSinglePlants')"
                    direction="horizontal"
                    @update:model-value="setRadio('IsPartsOfSinglePlants', $event)"
                  >
                    <RadioOption value="Y" label="Yes" />
                    <RadioOption value="N" label="No" />
                  </RadioGroup>
                  <!-- ASW 7(b) — visible when IsPartsOfSinglePlants = Y -->
                  <!-- DB: PartsPlant -->
                  <div
                    v-if="s('IsPartsOfSinglePlants') === 'Y'"
                    style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8;
                           padding: 8px 10px; background: var(--color-neutral-100); border-radius: 4px"
                  >
                    In the case of observations of parts taken from single plants, the number of
                    parts to be taken from each of the plants should be
                    <Input
                      :model-value="s('PartsPlant')"
                      placeholder="(number)"
                      size="small"
                      style="display: inline-block; width: 70px; margin: 0 4px"
                      @update:model-value="onFieldChange('PartsPlant', $event)"
                    />
                    <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                      <i>(ASW 7(b))</i>
                    </a>
                  </div>
                </div>
              </Card>

              <!-- ── When YES — multiple propagation methods (dynamic rows) ── -->
              <!--
                Loaded from store.propagationMethods.assessment
                Real fields from API response:
                  AssesmentMethodPropogation_ID: 4365
                  OtherPropogationMethodInfo: "Aseed-propagated varieties"  ← display name (strip first char)
                  NumberOfPlants: "10;7"  ← plantsFirst;plantsSecond
                  NumberOfPartsOfPlants: ""
                  isPartsOfSinglePlants: "N"  ← lowercase i
              -->
              <div
                v-if="s('IsOneMethodOfPropogation') === 'Y'"
                style="display: flex; flex-direction: column; gap: 10px"
              >
                <!-- Repeating rows -->
                <Card
                  v-for="(pm, idx) in propMethods"
                  :key="pm.AssesmentMethodPropogation_ID"
                  padding="compact"
                  elevation="low" style="margin-bottom: 10px"
                >
                  <!-- Green separator between rows (legacy hr) -->
                  <div
                    v-if="idx > 0"
                    style="height: 4px; background: #CEDD80; border-radius: 2px; margin-bottom: 4px"
                  />

                  <!-- Sentence: "In the case of [method], unless otherwise..." -->
                  <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8; margin: 0">
                    In the case of
                    <Input
                      :model-value="pmName(pm)"
                      placeholder="(propagation method)"
                      size="small"
                      style="display: inline-block; width: 210px; margin: 0 4px"
                      @update:model-value="setPmName(pm, $event)"
                    />
                    , unless otherwise indicated, for the purpose of distinctness, all
                    observations on single plants should be made on
                    <Input
                      :model-value="pmFirst(pm)"
                      placeholder="(number)"
                      size="small"
                      style="display: inline-block; width: 65px; margin: 0 4px"
                      @update:model-value="setPmFirst(pm, $event)"
                    />
                    plants or parts taken from each of
                    <Input
                      :model-value="pmSecond(pm)"
                      placeholder="(number)"
                      size="small"
                      style="display: inline-block; width: 65px; margin: 0 4px"
                      @update:model-value="setPmSecond(pm, $event)"
                    />
                    plants and any other observations made on all plants in the test,
                    disregarding any off-type plants.
                  </p>

                  <!-- Are observations made on parts taken from single plants? -->
                  <!-- DB: isPartsOfSinglePlants (lowercase i — real column name) -->
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
                    <label style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                      Are observations made on parts taken from single plants?
                    </label>
                    <RadioGroup
                      :model-value="pm.isPartsOfSinglePlants ?? 'N'"
                      direction="horizontal"
                      @update:model-value="updatePmField(pm, 'isPartsOfSinglePlants', $event)"
                    >
                      <RadioOption value="Y" label="Yes" />
                      <RadioOption value="N" label="No" />
                    </RadioGroup>
                  </div>

                  <!-- Parts count — when isPartsOfSinglePlants = Y -->
                  <!-- DB: NumberOfPartsOfPlants (plural) -->
                  <div
                    v-if="pm.isPartsOfSinglePlants === 'Y'"
                    style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8"
                  >
                    In the case of observations of parts taken from single plants, the number of
                    parts to be taken from each of the plants should be
                    <Input
                      :model-value="pm.NumberOfPartsOfPlants ?? ''"
                      placeholder="(number)"
                      size="small"
                      style="display: inline-block; width: 65px; margin: 0 4px"
                      @update:model-value="updatePmField(pm, 'NumberOfPartsOfPlants', $event)"
                    />
                    <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                      <i>(ASW 7(b))</i>
                    </a>
                  </div>
                </Card>

                <!-- Add / Remove method buttons -->
                <div style="display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap">
                  <Button
                    type="primary"
                    size="small"
                    :disabled="addingPropMethod"
                    @click="addPropMethod"
                  >
                    {{ addingPropMethod ? 'Adding...' : '+ Add method of Propagation' }}
                  </Button>
                  <Button
                    v-if="propMethods.length > 0"
                    type="danger"
                    size="small"
                    @click="removePropMethod(propMethods[propMethods.length - 1].AssesmentMethodPropogation_ID)"
                  >
                    Remove method of Propagation
                  </Button>
                </div>
              </div>

              <!-- General Distinctness Additional Info (when IsOneMethodOfPropogation = N) -->
              <div
                v-if="s('IsOneMethodOfPropogation') === 'N'"
                style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px"
              >
                <div v-if="!s('DistinctnessAddInfo')">
                  <Button type="secondary" size="small" @click="onFieldChange('DistinctnessAddInfo', '<p></p>')">
                    + Add Paragraph
                  </Button>
                  <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                    Additional information on assessment of distinctness
                  </span>
                </div>
                <div v-else>
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                    <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                      Additional information on assessment of distinctness
                    </label>
                    <Button type="danger" size="small" @click="onFieldChange('DistinctnessAddInfo', '')">
                      Remove Paragraph
                    </Button>
                  </div>
                  <Editor
                    :model-value="s('DistinctnessAddInfo')"
                    :api-key="apiKey"
                    :init="init"
                    @update:model-value="onFieldChange('DistinctnessAddInfo', $event)"
                  />
                </div>
              </div>

            </div><!-- /Number of plants section -->
          </div>
        </SectionAccordion>

        <!-- ══════════════════════════════════════════════════════════
             4.2  UNIFORMITY
        ══════════════════════════════════════════════════════════ -->
        <SectionAccordion number="4.2" title="Uniformity">
          <div style="display: flex; flex-direction: column; gap: 16px">

            <!--
              legacy: typeOfPropagationInput (standalone wide input)
              DB: typeOfPropagation = "" / OtherTypeOfPropagation = "Bseed-propagated..."
              getTypeOfPropagation() returns the display value stripping the prefix char
              ALLOWED_FIELDS: typeOfPropagation  (save directly to this field)
            -->
            <div style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8">
              Please don't complete the following sentence if it is not applicable.
              These Test Guidelines have been developed for the examination of
              <Input
                :model-value="getTypeOfPropagation()"
                placeholder="(variety type)"
                size="small"
                style="display: inline-block; width: 320px; margin: 0 4px"
                @update:model-value="onFieldChange('typeOfPropagation', $event)"
              />
              . For varieties with other types of propagation the recommendation in the
              General Introduction and document TGP/13 "Guidance for new types and species",
              Section 4.5 Testing Uniformity should be followed.
            </div>

            <!-- ── Q1: Cross-pollinated varieties ── -->
            <!--
              DB: IsCrossPollinatedVariety = "Y"  (note: this is the REAL field name from API)
              But ALLOWED_FIELDS has IsHybridVarietyGuideline — mapping: IsCrossPollinatedVariety → IsHybridVarietyGuideline
              From API ch04: "IsCrossPollinatedVariety": "Y", "IsHybridVarietyGuideline": "Y"
              Both exist; we use IsHybridVarietyGuideline as it is in ALLOWED_FIELDS
            -->
            <Card padding="compact" elevation="low">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); flex: 1">
                  Do these Test Guidelines cover cross-pollinated varieties?
                </label>
                <RadioGroup
                  :model-value="s('IsHybridVarietyGuideline')"
                  direction="horizontal"
                  @update:model-value="setRadio('IsHybridVarietyGuideline', $event)"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- Sub-options when cross-pollinated = Y -->
              <div
                v-if="s('IsHybridVarietyGuideline') === 'Y'"
                style="display: flex; flex-direction: column; gap: 10px; padding-left: 4px"
              >
                <!--
                  DB: CrossPolinattedVarieties = "crosspollinatedwithotherpropagation"
                  ALLOWED_FIELDS: CrossPolinattedVarieties ✓
                -->
                <RadioGroup
                  :model-value="s('CrossPolinattedVarieties')"
                  direction="vertical"
                  @update:model-value="setRadio('CrossPolinattedVarieties', $event)"
                >
                  <RadioOption
                    value="crosspollinatedonly"
                    label="Test Guidelines covering only cross-pollinated varieties"
                  />
                  <RadioOption
                    value="crosspollinatedwithotherpropagation"
                    label="Test Guidelines covering cross-pollinated varieties and varieties with other forms of propagation"
                  />
                </RadioGroup>

                <!-- ASW 8(a)(i) — crosspollinatedonly -->
                <div
                  v-if="s('CrossPolinattedVarieties') === 'crosspollinatedonly'"
                  style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                         padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px"
                >
                  The assessment of uniformity should be according to the recommendations for
                  cross-pollinated varieties in the General Introduction.
                  <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                    <i>(ASW 8(a)(i))</i>
                  </a>
                </div>

                <!-- ASW 8(a)(ii) — crosspollinatedwithotherpropagation -->
                <!--
                  DB: TypesOfVariety = "" / OtherVarietyTypes = "Cseed-propagated" (strip first char)
                  We display this via the typeOfPropagation field (reuse ALLOWED_FIELDS: typeOfPropagation)
                -->
                <div
                  v-if="s('CrossPolinattedVarieties') === 'crosspollinatedwithotherpropagation'"
                  style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.8;
                         padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px"
                >
                  The assessment of uniformity for
                  <Input
                    :model-value="getTypeOfPropagation()"
                    placeholder="(variety type)"
                    size="small"
                    style="display: inline-block; width: 180px; margin: 0 4px"
                    @update:model-value="onFieldChange('typeOfPropagation', $event)"
                  />
                  should be according to the recommendations for cross-pollinated varieties
                  in the General Introduction.
                  <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                    <i>(ASW 8(a)(ii))</i>
                  </a>
                </div>

                <!-- Additional info for cross-pollinated varieties -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px">
                  <div v-if="!s('UniformityCrossPollinatedAddInfo')">
                    <Button type="secondary" size="small" @click="onFieldChange('UniformityCrossPollinatedAddInfo', '<p></p>')">
                      + Add Paragraph
                    </Button>
                    <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                      Additional information on assessment of uniformity in case of cross-pollinated varieties
                    </span>
                  </div>
                  <div v-else>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                      <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                        Additional information (cross-pollinated varieties)
                      </label>
                      <Button type="danger" size="small" @click="onFieldChange('UniformityCrossPollinatedAddInfo', '')">
                        Remove Paragraph
                      </Button>
                    </div>
                    <Editor
                      :model-value="s('UniformityCrossPollinatedAddInfo')"
                      :api-key="apiKey"
                      :init="init"
                      @update:model-value="onFieldChange('UniformityCrossPollinatedAddInfo', $event)"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <!-- ── Q2: Hybrid varieties (uniformity) ── -->
            <!--
              DB: IsHybridVariety = "Y"  ALLOWED_FIELDS: IsHybridVariety ✓
            -->
            <Card padding="compact" elevation="low">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); flex: 1">
                  Do these Test Guidelines cover hybrid varieties?
                </label>
                <RadioGroup
                  :model-value="s('IsHybridVariety')"
                  direction="horizontal"
                  @update:model-value="setRadio('IsHybridVariety', $event)"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- ASW 8(b) -->
              <div
                v-if="s('IsHybridVariety') === 'Y'"
                style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                       padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px"
              >
                The assessment of uniformity for hybrid varieties depends on the type of hybrid
                and should be according to the recommendations for hybrid varieties in the
                General Introduction.
                <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                  <i>(ASW 8(b))</i>
                </a>
              </div>

              <!-- Additional info for hybrid varieties -->
              <div
                v-if="s('IsHybridVariety') === 'Y'"
                style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px"
              >
                <div v-if="!s('UniformityHybridAddInfo')">
                  <Button type="secondary" size="small" @click="onFieldChange('UniformityHybridAddInfo', '<p></p>')">
                    + Add Paragraph
                  </Button>
                  <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                    Additional information on assessment of uniformity in case of hybrid varieties
                  </span>
                </div>
                <div v-else>
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                    <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                      Additional information (hybrid varieties)
                    </label>
                    <Button type="danger" size="small" @click="onFieldChange('UniformityHybridAddInfo', '')">
                      Remove Paragraph
                    </Button>
                  </div>
                  <Editor
                    :model-value="s('UniformityHybridAddInfo')"
                    :api-key="apiKey"
                    :init="init"
                    @update:model-value="onFieldChange('UniformityHybridAddInfo', $event)"
                  />
                </div>
              </div>
            </Card>

            <!-- ── Q3: Parent formula ── -->
            <!--
              DB: UniformityAssessmentParentFormula = "N"
              ALLOWED_FIELDS: UniformityAssessmentParentFormula ✓
            -->
            <Card padding="compact" elevation="low">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); flex: 1">
                  Do these Test Guidelines cover uniformity assessment where the parent formula is used?
                </label>
                <RadioGroup
                  :model-value="s('UniformityAssessmentParentFormula')"
                  direction="horizontal"
                  @update:model-value="setRadio('UniformityAssessmentParentFormula', $event)"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- ASW 8(e) -->
              <div
                v-if="s('UniformityAssessmentParentFormula') === 'Y'"
                style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                       padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px"
              >
                Where the assessment of a hybrid variety involves the parent lines, the uniformity
                of the hybrid variety should, in addition to an examination of the hybrid variety
                itself, also be assessed by examination of the uniformity of its parent lines.
                <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                  <i>(ASW 8(e))</i>
                </a>
              </div>

              <!-- Additional info for parent formula -->
              <div
                v-if="s('UniformityAssessmentParentFormula') === 'Y'"
                style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px"
              >
                <div v-if="!s('UniformityParentFormulaAddInfo')">
                  <Button type="secondary" size="small" @click="onFieldChange('UniformityParentFormulaAddInfo', '<p></p>')">
                    + Add Paragraph
                  </Button>
                  <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                    Additional information where the parent formula is used
                  </span>
                </div>
                <div v-else>
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                    <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                      Additional information (parent formula)
                    </label>
                    <Button type="danger" size="small" @click="onFieldChange('UniformityParentFormulaAddInfo', '')">
                      Remove Paragraph
                    </Button>
                  </div>
                  <Editor
                    :model-value="s('UniformityParentFormulaAddInfo')"
                    :api-key="apiKey"
                    :init="init"
                    @update:model-value="onFieldChange('UniformityParentFormulaAddInfo', $event)"
                  />
                </div>
              </div>
            </Card>

            <!-- ── Q4: Uniformity by off-types (same sample) ── -->
            <!--
              DB: UniformityAssessmentSameSample = "TGCoveringOnlyVarieties" or "TGCoveringOtherTypeOfVarieties"
              Legacy uses this field for Question 4, not UniformityAssessmentDifferentSample
            -->
            <Card padding="compact" elevation="low">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); flex: 1">
                  Do these Test Guidelines cover uniformity assessment by off-type(s)
                  (all characteristics observed on the same sample size)?
                </label>
                <RadioGroup
                  :model-value="s('UniformityAssessmentSameSample') === 'TGCoveringOnlyVarieties' ? 'Y' : 'N'"
                  direction="horizontal"
                  @update:model-value="setRadio('UniformityAssessmentSameSample', $event === 'Y' ? 'TGCoveringOnlyVarieties' : 'TGCoveringOtherTypeOfVarieties')"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- Off-type assessment fields (shown when Yes) -->
              <div
                v-if="s('UniformityAssessmentSameSample') === 'TGCoveringOnlyVarieties'"
                style="display: flex; flex-direction: column; gap: 8px; padding: 8px 10px;
                       background: var(--color-neutral-50); border-radius: 4px"
              >
                <div style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8">
                  For the assessment of uniformity of
                  <Input
                    :model-value="getFieldOrOther('UniformityPropogationType', 'OtherUniformityPropogationType')"
                    placeholder="(propagation type)"
                    size="small"
                    style="display: inline-block; width: 200px; margin: 0 4px"
                    @update:model-value="setFieldOrOther('UniformityPropogationType', 'OtherUniformityPropogationType', $event)"
                  />
                  varieties, a population standard of
                  <Input
                    :model-value="s('PopulationStandard')"
                    placeholder="%"
                    size="small"
                    type="number"
                    step="0.01"
                    style="display: inline-block; width: 70px; margin: 0 4px"
                    @update:model-value="onFieldChange('PopulationStandard', $event)"
                  />
                  % and an acceptance probability of at least
                  <Input
                    :model-value="s('AcceptanceProbability')"
                    placeholder="%"
                    size="small"
                    type="number"
                    step="0.01"
                    style="display: inline-block; width: 70px; margin: 0 4px"
                    @update:model-value="onFieldChange('AcceptanceProbability', $event)"
                  />
                  % should be applied. In the case of a sample size of
                  <Input
                    :model-value="s('PlantSampleSize')"
                    placeholder="(number)"
                    size="small"
                    style="display: inline-block; width: 70px; margin: 0 4px"
                    @update:model-value="onFieldChange('PlantSampleSize', $event)"
                  />
                  plants,
                  <Input
                    :model-value="s('OffType')"
                    placeholder="(number)"
                    size="small"
                    style="display: inline-block; width: 70px; margin: 0 4px"
                    @update:model-value="onFieldChange('OffType', $event)"
                  />
                  off-type(s) are allowed.
                  <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                    <i>(ASW 8(c)(ii))</i>
                  </a>
                </div>

                <!-- Editable sentence (inline contenteditable) -->
                <div
                  contenteditable="true"
                  style="font-size: 13px; color: var(--color-neutral-700); padding: 6px 8px;
                         border: 1px dashed var(--color-neutral-300); border-radius: 4px;
                         min-height: 30px; cursor: text"
                  @blur="onFieldChange('UniformityOfftypeSameSampleAddSentence', ($event.target as HTMLElement).textContent)"
                  v-html="s('UniformityOfftypeSameSampleAddSentence') || '<u>Add sentence</u>'"
                />

                <!-- Additional info editor -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px">
                  <div v-if="!s('UniformityOfftypeSameSampleAddInfo')">
                    <Button type="secondary" size="small" @click="onFieldChange('UniformityOfftypeSameSampleAddInfo', '<p></p>')">
                      + Add Paragraph
                    </Button>
                    <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                      Additional information (off-types, same sample size)
                    </span>
                  </div>
                  <div v-else>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                      <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                        Additional information (off-types, same sample)
                      </label>
                      <Button type="danger" size="small" @click="onFieldChange('UniformityOfftypeSameSampleAddInfo', '')">
                        Remove Paragraph
                      </Button>
                    </div>
                    <Editor
                      :model-value="s('UniformityOfftypeSameSampleAddInfo')"
                      :api-key="apiKey"
                      :init="init"
                      @update:model-value="onFieldChange('UniformityOfftypeSameSampleAddInfo', $event)"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <!-- ── Q5: Different sample sizes ── -->
            <Card padding="compact" elevation="low">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); flex: 1">
                  Do these Test Guidelines cover uniformity assessment by off-type(s)
                  (all characteristics observed on different sample sizes)?
                </label>
                <RadioGroup
                  :model-value="s('UniformityAssessmentDifferentSample').split(';')[0] || 'N'"
                  direction="horizontal"
                  @update:model-value="setRadio('UniformityAssessmentDifferentSample', $event)"
                >
                  <RadioOption value="Y" label="Yes" />
                  <RadioOption value="N" label="No" />
                </RadioGroup>
              </div>

              <!-- Sub-options when Yes -->
              <div
                v-if="s('UniformityAssessmentDifferentSample').split(';')[0] === 'Y'"
                style="display: flex; flex-direction: column; gap: 12px; padding-left: 4px"
              >
                <!-- Option A: All plants -->
                <Card padding="compact" elevation="low">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
                    <input
                      type="checkbox"
                      :checked="isDiffSampleAllPlants()"
                      @change="toggleDiffSampleAllPlants(($event.target as HTMLInputElement).checked)"
                      style="width: 18px; height: 18px; cursor: pointer"
                    />
                    <span style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                      Off-type(s) on all plants in the test
                    </span>
                  </label>

                  <div
                    v-if="isDiffSampleAllPlants()"
                    style="display: flex; flex-direction: column; gap: 8px; padding-left: 26px"
                  >
                    <div style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8">
                      For the assessment of uniformity of
                      <Input
                        :model-value="s('DiffUniformityPlantSample')"
                        placeholder="(type)"
                        size="small"
                        style="display: inline-block; width: 180px; margin: 0 4px"
                        @update:model-value="onFieldChange('DiffUniformityPlantSample', $event)"
                      />
                      varieties, a population standard of
                      <Input
                        :model-value="s('DiffPopulationStandard')"
                        placeholder="%"
                        size="small"
                        type="number"
                        step="0.01"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('DiffPopulationStandard', $event)"
                      />
                      % and an acceptance probability of at least
                      <Input
                        :model-value="s('DiffAcceptanceProbability')"
                        placeholder="%"
                        size="small"
                        type="number"
                        step="0.01"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('DiffAcceptanceProbability', $event)"
                      />
                      % should be applied. In the case of a sample size of
                      <Input
                        :model-value="s('DiffPlantSampleSize')"
                        placeholder="(number)"
                        size="small"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('DiffPlantSampleSize', $event)"
                      />
                      plants,
                      <Input
                        :model-value="s('DiffOffType')"
                        placeholder="(number)"
                        size="small"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('DiffOffType', $event)"
                      />
                      off-type(s) are allowed.
                    </div>

                    <!-- Editable sentence -->
                    <div
                      contenteditable="true"
                      style="font-size: 13px; color: var(--color-neutral-700); padding: 6px 8px;
                             border: 1px dashed var(--color-neutral-300); border-radius: 4px;
                             min-height: 30px; cursor: text"
                      @blur="onFieldChange('UniformityOfftypeAllPlantsAddSentence', ($event.target as HTMLElement).textContent)"
                      v-html="s('UniformityOfftypeAllPlantsAddSentence') || '<u>Add sentence</u>'"
                    />

                    <!-- Additional info -->
                    <div style="display: flex; flex-direction: column; gap: 6px">
                      <div v-if="!s('UniformityOfftypeAllPlantsAddInfo')">
                        <Button type="secondary" size="small" @click="onFieldChange('UniformityOfftypeAllPlantsAddInfo', '<p></p>')">
                          + Add Paragraph
                        </Button>
                        <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                          Additional information (all plants)
                        </span>
                      </div>
                      <div v-else>
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                          <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                            Additional information
                          </label>
                          <Button type="danger" size="small" @click="onFieldChange('UniformityOfftypeAllPlantsAddInfo', '')">
                            Remove Paragraph
                          </Button>
                        </div>
                        <Editor
                          :model-value="s('UniformityOfftypeAllPlantsAddInfo')"
                          :api-key="apiKey"
                          :init="init"
                          @update:model-value="onFieldChange('UniformityOfftypeAllPlantsAddInfo', $event)"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <!-- Option B: Subsample -->
                <Card padding="compact" elevation="low">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
                    <input
                      type="checkbox"
                      :checked="isDiffSampleSubSample()"
                      @change="toggleDiffSampleSubSample(($event.target as HTMLInputElement).checked)"
                      style="width: 18px; height: 18px; cursor: pointer"
                    />
                    <span style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800)">
                      Off-type(s) on a sub-sample
                    </span>
                  </label>

                  <div
                    v-if="isDiffSampleSubSample()"
                    style="display: flex; flex-direction: column; gap: 8px; padding-left: 26px"
                  >
                    <div style="font-size: 14px; color: var(--color-neutral-800); line-height: 1.8">
                      For the assessment of uniformity of
                      <Input
                        :model-value="getFieldOrOther('SubSampleTypeA', 'OtherSubSampleTypeA')"
                        placeholder="(type A)"
                        size="small"
                        style="display: inline-block; width: 150px; margin: 0 4px"
                        @update:model-value="setFieldOrOther('SubSampleTypeA', 'OtherSubSampleTypeA', $event)"
                      />
                      varieties, a population standard of
                      <Input
                        :model-value="s('SubSamplePopulationStandard')"
                        placeholder="%"
                        size="small"
                        type="number"
                        step="0.01"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('SubSamplePopulationStandard', $event)"
                      />
                      % and an acceptance probability of
                      <Input
                        :model-value="s('SubSampleAcceptanceProbability')"
                        placeholder="%"
                        size="small"
                        type="number"
                        step="0.01"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('SubSampleAcceptanceProbability', $event)"
                      />
                      % should be applied. In the case of a sample size of
                      <Input
                        :model-value="s('SubSampleSize')"
                        placeholder="(number)"
                        size="small"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('SubSampleSize', $event)"
                      />
                      <Input
                        :model-value="getFieldOrOther('SubSampleTypeB', 'OtherSubSampleTypeB')"
                        placeholder="(type B)"
                        size="small"
                        style="display: inline-block; width: 150px; margin: 0 4px"
                        @update:model-value="setFieldOrOther('SubSampleTypeB', 'OtherSubSampleTypeB', $event)"
                      />
                      ,
                      <Input
                        :model-value="s('SubSampleOffType')"
                        placeholder="(number)"
                        size="small"
                        style="display: inline-block; width: 70px; margin: 0 4px"
                        @update:model-value="onFieldChange('SubSampleOffType', $event)"
                      />
                      off-type(s) in
                      <Input
                        :model-value="getFieldOrOther('SubSampleTypeC', 'OtherSubSampleTypeC')"
                        placeholder="(type C)"
                        size="small"
                        style="display: inline-block; width: 150px; margin: 0 4px"
                        @update:model-value="setFieldOrOther('SubSampleTypeC', 'OtherSubSampleTypeC', $event)"
                      />
                      are allowed.<br/>
                      For the rows of
                      <Input
                        :model-value="getFieldOrOther('RowsSubSampleTypeA', 'OtherRowsSubSampleTypeA')"
                        placeholder="(rows type A)"
                        size="small"
                        style="display: inline-block; width: 150px; margin: 0 4px"
                        @update:model-value="setFieldOrOther('RowsSubSampleTypeA', 'OtherRowsSubSampleTypeA', $event)"
                      />
                      and
                      <Input
                        :model-value="getFieldOrOther('RowsSubSampleTypeB', 'OtherRowsSubSampleTypeB')"
                        placeholder="(rows type B)"
                        size="small"
                        style="display: inline-block; width: 150px; margin: 0 4px"
                        @update:model-value="setFieldOrOther('RowsSubSampleTypeB', 'OtherRowsSubSampleTypeB', $event)"
                      />
                      , the plants are examined individually in
                      <Input
                        :model-value="getFieldOrOther('RowsSubSampleTypeC', 'OtherRowsSubSampleTypeC')"
                        placeholder="(rows type C)"
                        size="small"
                        style="display: inline-block; width: 150px; margin: 0 4px"
                        @update:model-value="setFieldOrOther('RowsSubSampleTypeC', 'OtherRowsSubSampleTypeC', $event)"
                      />
                      .
                    </div>

                    <!-- Editable sentence -->
                    <div
                      contenteditable="true"
                      style="font-size: 13px; color: var(--color-neutral-700); padding: 6px 8px;
                             border: 1px dashed var(--color-neutral-300); border-radius: 4px;
                             min-height: 30px; cursor: text"
                      @blur="onFieldChange('UniformityOfftypeSubsampleAddSentence', ($event.target as HTMLElement).textContent)"
                      v-html="s('UniformityOfftypeSubsampleAddSentence') || '<u>Add sentence</u>'"
                    />

                    <!-- Additional info -->
                    <div style="display: flex; flex-direction: column; gap: 6px">
                      <div v-if="!s('UniformityOfftypeSubsampleAddInfo')">
                        <Button type="secondary" size="small" @click="onFieldChange('UniformityOfftypeSubsampleAddInfo', '<p></p>')">
                          + Add Paragraph
                        </Button>
                        <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                          Additional information (subsample)
                        </span>
                      </div>
                      <div v-else>
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                          <label style="font-size: 13px; font-weight: 600; color: var(--color-neutral-700)">
                            Additional information
                          </label>
                          <Button type="danger" size="small" @click="onFieldChange('UniformityOfftypeSubsampleAddInfo', '')">
                            Remove Paragraph
                          </Button>
                        </div>
                        <Editor
                          :model-value="s('UniformityOfftypeSubsampleAddInfo')"
                          :api-key="apiKey"
                          :init="init"
                          @update:model-value="onFieldChange('UniformityOfftypeSubsampleAddInfo', $event)"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

            <!-- General Uniformity Additional Info -->
            <div style="display: flex; flex-direction: column; gap: 6px">
              <div v-if="!s('UniformityAddInfo')">
                <Button type="secondary" size="small" @click="onFieldChange('UniformityAddInfo', '<p></p>')">
                  + Add Paragraph
                </Button>
                <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                  Additional information on assessment of uniformity
                </span>
              </div>
              <div v-else>
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                  <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800)">
                    Additional information on assessment of uniformity
                  </label>
                  <Button type="danger" size="small" @click="onFieldChange('UniformityAddInfo', '')">
                    Remove Paragraph
                  </Button>
                </div>
                <Editor
                  :model-value="s('UniformityAddInfo')"
                  :api-key="apiKey"
                  :init="init"
                  @update:model-value="onFieldChange('UniformityAddInfo', $event)"
                />
              </div>
            </div>

          </div>
        </SectionAccordion>

        <!-- ══════════════════════════════════════════════════════════
             4.3  STABILITY
        ══════════════════════════════════════════════════════════ -->
        <SectionAccordion number="4.3" title="Stability">
          <div style="display: flex; flex-direction: column; gap: 16px">

            <!-- Stability assessment: general -->
            <!--
              DB: TGCovering = "SeedVegetative"  ALLOWED_FIELDS: TGCovering ✓
            -->
            <div style="display: flex; flex-direction: column; gap: 10px">
              <h3 style="font-size: 15px; font-weight: 700; color: var(--color-neutral-800); margin: 0">
                Stability assessment: general
                <span style="color: #D32F2F"> *</span>
              </h3>
              <RadioGroup
                :model-value="s('TGCovering')"
                direction="vertical"
                @update:model-value="setRadio('TGCovering', $event)"
              >
                <RadioOption value="SeedVegetative"
                  label="Test Guidelines covering seed-propagated and vegetatively propagated varieties" />
                <RadioOption value="Seed"
                  label="Test Guidelines covering only seed-propagated varieties" />
                <RadioOption value="Vegetative"
                  label="Test Guidelines covering only vegetatively propagated varieties" />
              </RadioGroup>

              <!-- ASW 9(a/b/c) -->
              <div v-if="s('TGCovering') === 'SeedVegetative'"
                style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                       padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px">
                Where appropriate, or in cases of doubt, stability may be further examined by
                testing a new seed stock to ensure that it exhibits the same characteristics as
                those shown by the initial material supplied.
                <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px"><i>(ASW 9(a))</i></a>
              </div>
              <div v-else-if="s('TGCovering') === 'Seed'"
                style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                       padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px">
                Where appropriate, or in cases of doubt, stability may be further examined by
                testing a new seed stock to ensure that it exhibits the same characteristics as
                those shown by the initial material supplied.
                <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px"><i>(ASW 9(b))</i></a>
              </div>
              <div v-else-if="s('TGCovering') === 'Vegetative'"
                style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                       padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px">
                Where appropriate, or in cases of doubt, stability may be further examined by
                testing a new plant stock to ensure that it exhibits the same characteristics as
                those shown by the initial material supplied.
                <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px"><i>(ASW 9(c))</i></a>
              </div>
            </div>

            <!-- Stability assessment: hybrid varieties -->
            <!--
              DB: IsParentLineAssessed = "Y"  ALLOWED_FIELDS: IsParentLineAssessed ✓
            -->
            <div style="display: flex; flex-direction: column; gap: 10px">
              <h3 style="font-size: 15px; font-weight: 700; color: var(--color-neutral-800); margin: 0">
                Stability assessment: hybrid varieties
              </h3>
              <Card padding="compact" elevation="low">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                  <label style="font-size: 14px; font-weight: 500; color: var(--color-neutral-800); flex: 1">
                    Does uniformity and stability of parent lines need to be assessed?
                    <span style="color: #D32F2F"> *</span>
                  </label>
                  <RadioGroup
                    :model-value="s('IsParentLineAssessed')"
                    direction="horizontal"
                    @update:model-value="setRadio('IsParentLineAssessed', $event)"
                  >
                    <RadioOption value="Y" label="Yes" />
                    <RadioOption value="N" label="No" />
                  </RadioGroup>
                </div>

                <!-- ASW 10 -->
                <div v-if="s('IsParentLineAssessed') === 'Y'"
                  style="font-size: 13px; color: var(--color-neutral-700); line-height: 1.6;
                         padding: 6px 10px; background: var(--color-neutral-100); border-radius: 4px">
                  Where appropriate, or in cases of doubt, the stability of a hybrid variety may,
                  in addition to an examination of the hybrid variety itself, also be assessed by
                  examination of the uniformity and stability of its parent lines.
                  <a href="#" style="color: #496D31; font-size: 12px; margin-left: 4px">
                    <i>(ASW 10)</i>
                  </a>
                </div>
              </Card>
            </div>

            <!-- Additional stability information -->
            <!--
              DB: StabilityAddInfo = "<p>test 4.3</p>"  ALLOWED_FIELDS: StabilityAddInfo ✓
            -->
            <div style="display: flex; flex-direction: column; gap: 6px">
              <div v-if="!s('StabilityAddInfo')">
                <Button type="secondary" size="small" @click="onFieldChange('StabilityAddInfo', '<p></p>')">
                  + Add Paragraph
                </Button>
                <span style="font-size: 12px; color: var(--color-neutral-600); margin-left: 8px">
                  Additional information on stability
                </span>
              </div>
              <div v-else>
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
                  <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800)">
                    Additional information on stability
                  </label>
                  <Button type="danger" size="small" @click="onFieldChange('StabilityAddInfo', '')">
                    Remove Paragraph
                  </Button>
                </div>
                <Editor
                  :model-value="s('StabilityAddInfo')"
                  :api-key="apiKey"
                  :init="init"
                  @update:model-value="onFieldChange('StabilityAddInfo', $event)"
                />
              </div>
            </div>

          </div>
        </SectionAccordion>

      </div>
    </template>

    <!-- Preview pane -->
    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>