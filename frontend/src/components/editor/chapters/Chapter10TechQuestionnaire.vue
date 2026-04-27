<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button, Select, Chip, RadioGroup, RadioOption, Input, Textarea, Table } from '@upov/upov-ui';
import type { SelectOption } from 'upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import { useEditorStore } from '@/stores/editor';
import { editorApi } from '@/services/editor-api';
import { useChapterPreview } from '@/composables/useChapterPreview';
import SectionAccordion from '../shared/SectionAccordion.vue';
import type {
  TqSubject,
  TqBreedingScheme,
  TqPropagationMethod,
  TqCharacteristic,
  Characteristic,
  LookupOption,
} from '@/types/editor';

const store = useEditorStore();
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('10');

const data = computed(() => store.chapters['10'] || {});
const subjects = computed<TqSubject[]>(() => data.value?.subjects ?? []);
const breedingSchemes = computed<TqBreedingScheme[]>(() => data.value?.breedingSchemes ?? []);
const propagationMethods = computed<TqPropagationMethod[]>(() => data.value?.propagationMethods ?? []);
const tqChars = computed<TqCharacteristic[]>(() => data.value?.characteristics ?? []);

const ch07Chars = computed(() => store.chapters['07']?.characteristics ?? []);

const bsMethods = computed(() => store.lookups?.breedingSchemeMethods ?? []);
const pmTypes = computed(() => store.lookups?.propagationMethodTypes ?? []);

function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('10', field, value);
  markDirty();
}

async function refreshCh10() {
  const res = await editorApi.open(store.tgId!);
  store.chapters['10'] = res.chapters['10'];
}

async function addSubject() {
  await editorApi.createTqSubject(store.tgId!, { TqBotanicalName: '', TqCommonName: '' });
  await refreshCh10();
  markDirty();
}

async function deleteSubject(id: number) {
  await editorApi.deleteTqSubject(store.tgId!, id);
  await refreshCh10();
  markDirty();
}

const subjectTimers: Record<number, ReturnType<typeof setTimeout>> = {};
function autosaveSubject(subject: TqSubject, field: keyof TqSubject, value: string) {
  (subject as Record<string, string | number>)[field] = value;
  const key = subject.TqSubjectID;
  if (subjectTimers[key]) clearTimeout(subjectTimers[key]);
  subjectTimers[key] = setTimeout(async () => {
    await editorApi.updateTqSubject(store.tgId!, key, { [field]: value });
    markDirty();
  }, 500);
}

const newBsMethod = ref('');

async function addBreedingScheme() {
  if (!newBsMethod.value) return;
  await editorApi.createBreedingScheme(store.tgId!, { TqBreedingSchemeMethodID: newBsMethod.value });
  newBsMethod.value = '';
  await refreshCh10();
  markDirty();
}

async function deleteBreedingScheme(id: number) {
  await editorApi.deleteBreedingScheme(store.tgId!, id);
  await refreshCh10();
  markDirty();
}

const newPmType = ref('');

async function addPropMethod() {
  if (!newPmType.value) return;
  await editorApi.createTqPropMethod(store.tgId!, { TqVarietyPropagationMethodID: newPmType.value });
  newPmType.value = '';
  await refreshCh10();
  markDirty();
}

async function deletePropMethod(id: number) {
  await editorApi.deleteTqPropMethod(store.tgId!, id);
  await refreshCh10();
  markDirty();
}

const newCharTocIdStr = ref('');

async function addTqChar() {
  if (!newCharTocIdStr.value) return;
  const tocId = Number(newCharTocIdStr.value);
  const ch07Char = ch07Chars.value.find((c: Characteristic) => c.TOC_ID === tocId);
  await editorApi.createTqChar(store.tgId!, { TOC_ID: tocId, Name: ch07Char?.TOC_Name || '' });
  newCharTocIdStr.value = '';
  await refreshCh10();
  markDirty();
}

async function deleteTqChar(id: number) {
  await editorApi.deleteTqChar(store.tgId!, id);
  await refreshCh10();
  markDirty();
}

const availableChars = computed(() => {
  const usedIds = new Set(tqChars.value.map((c) => c.TOC_ID));
  return ch07Chars.value.filter((c: Characteristic) => !usedIds.has(c.TOC_ID));
});

const bsSelectOptions = computed<SelectOption[]>(() =>
  bsMethods.value.map((m: LookupOption) => ({ value: m.code, label: m.label })),
);
const pmSelectOptions = computed<SelectOption[]>(() =>
  pmTypes.value.map((m: LookupOption) => ({ value: m.code, label: m.label })),
);
const charSelectOptions = computed<SelectOption[]>(() =>
  availableChars.value.map((c: Characteristic) => ({
    value: String(c.TOC_ID),
    label: `${c.CharacteristicOrder}. ${c.TOC_Name}`,
  })),
);

function bsLabel(code: string) { return bsMethods.value.find((m: LookupOption) => m.code === code)?.label || code; }
function pmLabel(code: string) { return pmTypes.value.find((m: LookupOption) => m.code === code)?.label || code; }
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <div style="display: flex; flex-direction: column; gap: 16px">

        <!-- 10.1 Subjects -->
        <SectionAccordion number="10.1" title="Subjects" :open="true">
          <div style="display: flex; flex-direction: column; gap: 8px">
            <Table v-if="subjects.length > 0">
              <thead>
                <tr><th>#</th><th>Botanical Name</th><th>Common Name</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="sub in subjects" :key="sub.TqSubjectID">
                  <td class="col-num">{{ sub.insert_order }}</td>
                  <td><Input :model-value="sub.TqBotanicalName || ''" placeholder="Botanical name..." @update:model-value="autosaveSubject(sub, 'TqBotanicalName', $event)" /></td>
                  <td><Input :model-value="sub.TqCommonName || ''" placeholder="Common name..." @update:model-value="autosaveSubject(sub, 'TqCommonName', $event)" /></td>
                  <td class="col-actions"><Button type="danger" size="small" icon-left="x-lg" @click="deleteSubject(sub.TqSubjectID)" /></td>
                </tr>
              </tbody>
            </Table>
            <p v-else style="font-size: 14px; color: #999; margin-bottom: 12px">No subjects added yet.</p>
            <Button type="primary" size="small" @click="addSubject">+ Add subject</Button>
          </div>
        </SectionAccordion>

        <!-- 10.2 Breeding Scheme -->
        <SectionAccordion number="10.2" title="Breeding Scheme">
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Standard breeding scheme displayed?</label>
            <RadioGroup :model-value="data?.IsStandardBreedingScheme === 'Y' ? 'Y' : 'N'" direction="horizontal"
              @update:model-value="onFieldChange('IsStandardBreedingScheme', $event)">
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Breeding scheme methods</label>
            <div v-if="breedingSchemes.length > 0" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px">
              <Chip v-for="bs in breedingSchemes" :key="bs.TqBreedingSchemeID" :label="bsLabel(bs.TqBreedingSchemeMethodID)" removable @removed="deleteBreedingScheme(bs.TqBreedingSchemeID)" />
            </div>
            <div style="display: flex; gap: 8px; align-items: center">
              <Select v-model="newBsMethod" :options="bsSelectOptions" placeholder="Select method..." style="flex: 1; min-width: 0" />
              <Button type="primary" size="small" :disabled="!newBsMethod" @click="addBreedingScheme">Add</Button>
            </div>
          </div>
          <Textarea :model-value="data?.BreedingSchemeInfo || ''" rows="3" label="Breeding scheme additional info" placeholder="Additional breeding scheme information..." @update:model-value="onFieldChange('BreedingSchemeInfo', $event)" />
        </SectionAccordion>

        <!-- 10.3 Propagation Methods -->
        <SectionAccordion number="10.3" title="Propagation Methods">
          <div style="display: flex; flex-direction: column; gap: 6px">
            <div v-if="propagationMethods.length > 0" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px">
              <Chip v-for="pm in propagationMethods" :key="pm.TqPropagationMethodID" :label="pmLabel(pm.TqVarietyPropagationMethodID)" removable @removed="deletePropMethod(pm.TqPropagationMethodID)" />
            </div>
            <div style="display: flex; gap: 8px; align-items: center">
              <Select v-model="newPmType" :options="pmSelectOptions" placeholder="Select method..." style="flex: 1; min-width: 0" />
              <Button type="primary" size="small" :disabled="!newPmType" @click="addPropMethod">Add</Button>
            </div>
          </div>
        </SectionAccordion>

        <!-- 10.4 TQ Characteristics -->
        <SectionAccordion number="10.4" title="Characteristics for Technical Questionnaire">
          <Table v-if="tqChars.length > 0">
            <thead><tr><th>#</th><th>Characteristic</th><th></th></tr></thead>
            <tbody>
              <tr v-for="ch in tqChars" :key="ch.TQ_CharacteristicsID">
                <td class="col-num">{{ ch.SequenceNumber }}</td>
                <td>{{ ch.Name }}</td>
                <td class="col-actions"><Button type="danger" size="small" icon-left="x-lg" @click="deleteTqChar(ch.TQ_CharacteristicsID)" /></td>
              </tr>
            </tbody>
          </Table>
          <p v-else style="font-size: 14px; color: #999; margin-bottom: 12px">No TQ characteristics yet.</p>
          <div v-if="availableChars.length > 0" style="display: flex; gap: 8px; align-items: center">
            <Select v-model="newCharTocIdStr" :options="charSelectOptions" placeholder="Select characteristic..." style="flex: 1; min-width: 0" />
            <Button type="primary" size="small" :disabled="!newCharTocIdStr" @click="addTqChar">Add</Button>
          </div>
          <p v-else-if="tqChars.length > 0" style="font-size: 13px; color: var(--color-neutral-500); margin-top: 8px">All ch07 characteristics have been added.</p>
        </SectionAccordion>

        <!-- 10.5 Hybrid Varieties -->
        <SectionAccordion number="10.5" title="Hybrid Varieties">
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Hybrid variety section included?</label>
            <RadioGroup :model-value="data?.TqHybridVariety === 'Y' ? 'Y' : 'N'" direction="horizontal"
              @update:model-value="onFieldChange('TqHybridVariety', $event)">
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>
          </div>
          <div v-if="data?.TqHybridVariety === 'Y'" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Production scheme for hybrid?</label>
            <RadioGroup :model-value="data?.IsProdSchemeForHybrid === 'Y' ? 'Y' : 'N'" direction="horizontal"
              @update:model-value="onFieldChange('IsProdSchemeForHybrid', $event)">
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>
            <div v-if="data?.IsProdSchemeForHybrid === 'Y'" style="margin-top: 8px">
              <Textarea :model-value="data?.ProdSchemeInfo || ''" rows="3" label="Production scheme info" placeholder="Production scheme details..." @update:model-value="onFieldChange('ProdSchemeInfo', $event)" />
            </div>
          </div>
        </SectionAccordion>

        <!-- 10.6 Color Image & Virus -->
        <SectionAccordion number="10.6" title="Color Image & Disease Information">
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Color image required?</label>
            <RadioGroup :model-value="data?.IsTqColorImage === 'Y' ? 'Y' : 'N'" direction="horizontal"
              @update:model-value="onFieldChange('IsTqColorImage', $event)">
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>
          </div>
          <div v-if="data?.IsTqColorImage === 'Y'" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Image title</label>
            <Input :model-value="data?.ColorImageTitle || ''" placeholder="e.g. Photo of plant" @update:model-value="onFieldChange('ColorImageTitle', $event)" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 16px; margin-bottom: 12px">
            <label style="font-size: 13px; font-weight: 600; color: #606060">Virus/disease presence information required?</label>
            <RadioGroup :model-value="data?.ProvideVirusPresence === 'Y' ? 'Y' : 'N'" direction="horizontal"
              @update:model-value="onFieldChange('ProvideVirusPresence', $event)">
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>
          </div>
          <div v-if="data?.ProvideVirusPresence === 'Y'" style="margin-bottom: 12px">
            <Textarea :model-value="data?.VirusPresenceInfo || ''" rows="3" label="Virus presence details" placeholder="Virus/disease information..." @update:model-value="onFieldChange('VirusPresenceInfo', $event)" />
          </div>
        </SectionAccordion>

        <!-- 10.7 Similar Varieties & Additional -->
        <SectionAccordion number="10.7" title="Similar Varieties & Additional Information">
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <Input :model-value="data?.DiffCharacteristic || ''" placeholder="e.g. Characteristic" label="Differentiating characteristic label" @update:model-value="onFieldChange('DiffCharacteristic', $event)" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <Input :model-value="data?.SimilarVarietyExpression || ''" placeholder="e.g. Similar Variety" label="Similar variety expression label" @update:model-value="onFieldChange('SimilarVarietyExpression', $event)" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <Input :model-value="data?.CandidateVarietyExpression || ''" placeholder="e.g. Candidate Variety" label="Candidate variety expression label" @update:model-value="onFieldChange('CandidateVarietyExpression', $event)" />
          </div>
          <div style="margin-top: 16px; margin-bottom: 12px">
            <Textarea :model-value="data?.ExaminationAddInfo || ''" rows="3" label="Additional examination information" placeholder="Additional info for examination..." @update:model-value="onFieldChange('ExaminationAddInfo', $event)" />
          </div>
          <Textarea :model-value="data?.TqAddSentence || ''" rows="2" label="Additional TQ sentence" placeholder="Additional sentence..." @update:model-value="onFieldChange('TqAddSentence', $event)" />
        </SectionAccordion>

      </div>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>

<style scoped>
.col-num { width: 40px; text-align: center; }
.col-actions { width: 40px; }
</style>