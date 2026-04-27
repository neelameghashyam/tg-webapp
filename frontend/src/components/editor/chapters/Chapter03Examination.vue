<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { RadioGroup, RadioOption, Input, Button, Card } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';
import { editorApi } from '@/services/editor-api';
import SectionAccordion from '@/components/editor/shared/SectionAccordion.vue';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 200 });

const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('03');

const data = computed(() => store.chapters['03'] || {});
const isMushroom = computed(() => store.tg?.isMushroom ?? false);
const examinationPropMethods = ref(store.propagationMethods.examination || []);

// Watch for store changes to update local prop methods
watch(() => store.propagationMethods.examination, (newMethods) => {
  if (newMethods) {
    examinationPropMethods.value = newMethods;
    console.log('Loaded propagation methods:', newMethods);
  }
}, { immediate: true });

// Watch for IsOneMethodOfPropogation changes - ensure at least one method exists
watch(() => data.value?.IsOneMethodOfPropogation, async (newVal) => {
  if (newVal === 'Y' && examinationPropMethods.value.length === 0) {
    // Automatically create first propagation method
    await addPropagationMethod();
  }
});

// ASW Explanation texts - These should be fetched from backend in production
const aswExplanations = ref<Record<string, string>>({
  ASW2a: 'The minimum duration of tests should normally be a single growing cycle.',
  ASW2b: 'The minimum duration of tests should normally be two independent growing cycles.',
  ASW3a: 'The growing cycle is considered to be the duration of a single growing season, beginning with the dormancy period, followed by bud burst (flowering and/or vegetative), flowering and fruit harvest and concluding when the following dormant period starts.',
  ASW3b: 'The growing cycle is considered to be the period ranging from the beginning of active vegetative growth or flowering, continuing through active vegetative growth or flowering and fruit development and concluding with the harvesting of fruit.',
  ASW3c: 'The growing cycle is considered to be the period ranging from the beginning of development of an individual flower or inflorescence, through fruit development and concluding with the harvesting of fruit from the corresponding individual flower or inflorescence.',
  ASW3d_part1: 'The examination should be conducted with varieties that, as a',
  ASW3d_part2: 'crop, should have reached a stage of development where the characteristics in the Table of Characteristics can be observed.',
  ASW3e: 'The two independent growing cycles should be in the form of two separate plantings.',
  ASW3f: 'The two independent growing cycles may be observed from a single planting, examined in two separate growing cycles.',
  ASW4a: 'The optimum stage of development for the assessment of each characteristic is indicated by a reference in the Table of Characteristics. The stages of development denoted by each reference are described in Chapter 8.',
  ASW4b: 'The recommended type of plot in which to observe the characteristic is indicated by the following key in the Table of Characteristics.',
  ASW4c: 'Because daylight varies, color determinations made against a color chart should be made either in a suitable cabinet providing artificial daylight or in the middle of the day in a room without direct sunlight. The spectral distribution of the illuminant for artificial daylight should conform with the CIE Standard of Preferred Daylight D 6500 and should fall within the tolerances set out in the British Standard 950, Part I. These determinations should be made with the plant part placed against a white background. The color chart and version used should be specified in the variety description.',
  ASW6plants: 'The design of the tests should be such that plants or parts of plants may be removed for measurement or counting without prejudice to the observations which must be made up to the end of the growing cycle',
  ASW6mushrooms: 'The design should allow for the removal of fruit bodies for measurement without prejudice to the observations.'
});

// Editable plot type descriptions
const plotTypeDescriptions = ref({
  A: data.value?.PlotTypeA || '<u>Add type of plot</u>',
  B: data.value?.PlotTypeB || '<u>Add type of plot</u>',
  C: data.value?.PlotTypeC || '<u>Add type of plot</u>',
  D: data.value?.PlotTypeD || '<u>Add type of plot</u>'
});

// Watch for data changes to update plot type descriptions
watch(() => data.value, (newData) => {
  if (newData) {
    plotTypeDescriptions.value.A = newData.PlotTypeA || '<u>Add type of plot</u>';
    plotTypeDescriptions.value.B = newData.PlotTypeB || '<u>Add type of plot</u>';
    plotTypeDescriptions.value.C = newData.PlotTypeC || '<u>Add type of plot</u>';
    plotTypeDescriptions.value.D = newData.PlotTypeD || '<u>Add type of plot</u>';
  }
}, { deep: true, immediate: true });

// Update plot type description
function updatePlotTypeDescription(plot: 'A' | 'B' | 'C' | 'D', value: string) {
  const fieldName = `PlotType${plot}`;
  plotTypeDescriptions.value[plot] = value;
  onFieldChange(fieldName, value);
}

// Show ASW explanation based on selection
const showASWExplanation = ref<string | null>(null);

function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('03', field, value);
  markDirty();
}

const plotDesigns = computed(() => store.lookups?.plotDesigns ?? []);

// Watch for growing cycle changes
watch(() => data.value?.GrowingCycle, (newVal) => {
  if (newVal === 'Single') {
    showASWExplanation.value = 'ASW2a';
    onFieldChange('PlantingForm', null);
  } else if (newVal === 'Two') {
    showASWExplanation.value = 'ASW2b';
  }
});

// Watch for planting form changes
watch(() => data.value?.PlantingForm, (newVal) => {
  if (newVal === 'in the form of two separate plantings') {
    showASWExplanation.value = 'ASW3e';
  } else if (newVal === 'from a single planting') {
    showASWExplanation.value = 'ASW3f';
  }
});

// Watch for fruit crop changes
watch(() => data.value?.IsFruitCrop, (newVal) => {
  if (newVal === 'N') {
    onFieldChange('FruitDormantPeriod', null);
    onFieldChange('CropType', null);
  }
});

// Open UPOV PDF link
function openUPOVLink(section: string) {
  const pageMap: Record<string, number> = {
    'ASW2': 37,
    'GN8': 47,
    'ASW3': 38,
    'GN9': 48,
    'ASW4': 38,
    'GN10': 48,
    'ASW5': 39,
    'ASW6': 39
  };
  const page = pageMap[section] || 1;
  const url = `http://www.upov.int/export/sites/upov/tgp/en/tgp_7_en_with_links_to_gn_and_asw.pdf#page=${page}`;
  window.open(url, '_blank', 'height=600,width=1000,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes');
}

// Open view example documents
function openViewExample(type: string) {
  const urlMap: Record<string, string> = {
    'noGrowCycle': 'http://www.upov.int/export/sites/upov/tgp/en/NumberGrowingCycles.doc',
    'condConductiongExam': 'http://www.upov.int/export/sites/upov/tgp/en/ConditionsConductingExamination.doc',
    'testDesignExample': 'http://www.upov.int/export/sites/upov/tgp/en/TestDesign.doc'
  };
  const url = urlMap[type];
  if (url) {
    window.open(url, '_blank', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=1,width=1000,height=850,left=50,top=50');
  }
}



// ── Propagation Methods Management ──────────────────────────────────────────

async function addPropagationMethod() {
  try {
    const newMethod = await editorApi.createCh03PropMethod(store.tgId!, {
      PropogationMethod: '',
      PlotDesign: null,
      PlantNumber: null,


      PlantType: 'trees',  // Default value
      Replicatenum: null,
      PlantTypeA: 'trees',  // Default for Plot A
      PlantTypeB: 'trees',  // Default for Plot B
      PlantTypeC: 'trees',  // Default for Plot C
      PlantTypeD: 'trees'   // Default for Plot D
    });
    examinationPropMethods.value.push(newMethod);
    markDirty();
  } catch (err: any) {
    console.error('Failed to add propagation method:', err);
    console.error('Error details:', err.response?.data);
    alert(`Failed to add propagation method: ${err.response?.data?.error?.message || err.message}`);
  }
}

async function removePropagationMethod(index: number) {
  const method = examinationPropMethods.value[index];
  if (!method?.ExaminationPropagationMethod_ID) return;
  
  try {
    await editorApi.deleteCh03PropMethod(store.tgId!, method.ExaminationPropagationMethod_ID);
    examinationPropMethods.value.splice(index, 1);
    markDirty();
  } catch (err) {
    console.error('Failed to remove propagation method:', err);
  }
}

async function updatePropMethod(index: number, field: string, value: any) {
  const method = examinationPropMethods.value[index];
  if (!method?.ExaminationPropagationMethod_ID) return;
  
  // Optimistic update
  (method as any)[field] = value;
  
  try {
    await editorApi.updateCh03PropMethod(
      store.tgId!,
      method.ExaminationPropagationMethod_ID,
      { [field]: value }
    );
    markDirty();
  } catch (err) {
    console.error('Failed to update propagation method:', err);
  }
}

// Get plot type description for a specific method and plot
function getPlotTypeDescription(method: any, plot: 'A' | 'B' | 'C' | 'D'): string {
  const fieldName = `TestDesignPlotType${plot}`;
  return (method as any)[fieldName] || '<u>Add type of plot</u>';
}

function updateMethodPlotType(index: number, plot: 'A' | 'B' | 'C' | 'D', value: string) {
  const fieldName = `TestDesignPlotType${plot}`;
  updatePropMethod(index, fieldName, value);
}
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <div style="display: flex; flex-direction: column; gap: 12px">

        <!-- 3.1 Number of Growing Cycles -->
        <SectionAccordion number="3.1" title="Number of Growing Cycles">
          <div style="display: flex; gap: 24px">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 16px">
            <div style="display: flex; align-items: center; gap: 16px">
              <a href="#" @click.prevent="openUPOVLink('ASW2')" style="color: #808080; font-size: 13px" title="ASW 2">(ASW 2)</a>
              <a href="#" @click.prevent="openViewExample('noGrowCycle')" style="color: #4CAF50; font-size: 13px; margin-left: auto" title="View example">
                <u>View example</u>
              </a>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px">
              
              <!-- Single Growing Cycle -->
              <Card :elevation="data.GrowingCycle === 'Single' ? 'medium' : 'none'" :variant="data.GrowingCycle === 'Single' ? 'outlined' : 'default'">
                <RadioGroup :model-value="data.GrowingCycle" direction="vertical"
                  @update:model-value="onFieldChange('GrowingCycle', $event)">
                  <RadioOption value="Single" label="Single growing cycle" />
                </RadioGroup>
                <div v-if="data.GrowingCycle === 'Single'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 14px">
                  {{ aswExplanations.ASW2a }}
                  <a href="#" @click.prevent="openUPOVLink('ASW2')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 2(a)">(ASW 2(a))</a>
                </div>
              </Card>

              <!-- Two Growing Cycles -->
              <Card :elevation="data.GrowingCycle === 'Two' ? 'medium' : 'none'" :variant="data.GrowingCycle === 'Two' ? 'outlined' : 'default'">
                <RadioGroup :model-value="data.GrowingCycle" direction="vertical"
                  @update:model-value="onFieldChange('GrowingCycle', $event)">
                  <RadioOption value="Two" label="Two independent growing cycles" />
                </RadioGroup>
                <div v-if="data.GrowingCycle === 'Two'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 14px">
                  {{ aswExplanations.ASW2b }}
                  <a href="#" @click.prevent="openUPOVLink('ASW2')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 2(b)">(ASW 2(b))</a>
                  
                  <!-- Nested Planting Form Options -->
                  <div v-if="data.GrowingCycle === 'Two'" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px">
                    <!-- Two separate plantings -->
                    <Card :elevation="data.PlantingForm === 'in the form of two separate plantings' ? 'medium' : 'none'" :variant="data.PlantingForm === 'in the form of two separate plantings' ? 'outlined' : 'default'">
                      <RadioGroup :model-value="data.PlantingForm" direction="vertical"
                        @update:model-value="onFieldChange('PlantingForm', $event)">
                        <RadioOption value="in the form of two separate plantings" label="Two independent cycles in the form of two separate plantings" />
                      </RadioGroup>
                      <div  v-if="data.PlantingForm === 'in the form of two separate plantings'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 13px">
                        {{ aswExplanations.ASW3e }}
                        <a href="#" @click.prevent="openUPOVLink('ASW3')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 3(e)">(ASW 3(e))</a>
                      </div>
                    </Card>

                    <!-- From a single planting -->
                    <Card :elevation="data.PlantingForm === 'from a single planting' ? 'medium' : 'none'" :variant="data.PlantingForm === 'from a single planting' ? 'outlined' : 'default'">
                      <RadioGroup :model-value="data.PlantingForm" direction="vertical"
                        @update:model-value="onFieldChange('PlantingForm', $event)">
                        <RadioOption value="from a single planting" label="Two independent cycles from a single planting" />
                      </RadioGroup>
                      <div v-if="data.PlantingForm === 'from a single planting'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 13px">
                        {{ aswExplanations.ASW3f }}
                        <a href="#" @click.prevent="openUPOVLink('ASW3')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 3(f)">(ASW 3(f))</a>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </div>

            <Editor
              :model-value="data.OtherGrowingCycleInfo || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('OtherGrowingCycleInfo', $event)"
            />

            <!-- Fruit Crop -->
            <Card>
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 10px">
              <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                Is a satisfactory crop of fruit required?
              </p>
              <RadioGroup :model-value="data.IsFruitCrop" direction="horizontal"
                @update:model-value="onFieldChange('IsFruitCrop', $event)">
                <RadioOption value="Y" label="Yes" />
                <RadioOption value="N" label="No" />
              </RadioGroup>

              <!-- Crop Type Input (shown when Yes) -->
              <div v-if="data.IsFruitCrop === 'Y'" style="margin-top: 8px; padding-left: 24px">
                <div style="color: var(--color-neutral-700); font-size: 14px; margin-bottom: 8px; line-height: 2">
                  <span>{{ aswExplanations.ASW3d_part1 }}</span>
                  <Input 
                    :model-value="data.CropTypeOtherInfo || ''"
                    placeholder="fruit"
                    size="small"
                    style="display: inline-block; width: 150px; margin: 0 4px"
                    @update:model-value="onFieldChange('CropType', $event)"
                  />
                  <span>{{ aswExplanations.ASW3d_part2 }}</span>
                  <a href="#" @click.prevent="openUPOVLink('ASW3')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 3(d)">(ASW 3(d))</a>
                </div>

                <!-- Dormant Period Options -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px">
                  <!-- Clearly defined dormant period -->
                  <Card :elevation="data.FruitDormantPeriod === 'Defined' ? 'medium' : 'none'" :variant="data.FruitDormantPeriod === 'Defined' ? 'outlined' : 'default'">
                    <RadioGroup :model-value="data.FruitDormantPeriod" direction="vertical"
                      @update:model-value="onFieldChange('FruitDormantPeriod', $event)">
                      <RadioOption value="Defined" label="Fruit species with Clearly defined dormant period" />
                    </RadioGroup>
                    <div v-if="data.FruitDormantPeriod === 'Defined'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 13px">
                      {{ aswExplanations.ASW3a }}
                      <a href="#" @click.prevent="openUPOVLink('ASW3')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 3(a)">(ASW 3(a))</a>
                    </div>
                  </Card>

                  <!-- No clearly defined dormant period -->
                  <Card :elevation="data.FruitDormantPeriod === 'Not defined' ? 'medium' : 'none'" :variant="data.FruitDormantPeriod === 'Not defined' ? 'outlined' : 'default'">
                    <RadioGroup :model-value="data.FruitDormantPeriod" direction="vertical"
                      @update:model-value="onFieldChange('FruitDormantPeriod', $event)">
                      <RadioOption value="Not defined" label="Fruit species with no clearly defined dormant period" />
                    </RadioGroup>
                    <div v-if="data.FruitDormantPeriod === 'Not defined'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 13px">
                      {{ aswExplanations.ASW3b }}
                      <a href="#" @click.prevent="openUPOVLink('ASW3')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 3(b)">(ASW 3(b))</a>
                    </div>
                  </Card>

                  <!-- Evergreen species -->
                  <Card :elevation="data.FruitDormantPeriod === 'Evergreen' ? 'medium' : 'none'" :variant="data.FruitDormantPeriod === 'Evergreen' ? 'outlined' : 'default'">
                    <RadioGroup :model-value="data.FruitDormantPeriod" direction="vertical"
                      @update:model-value="onFieldChange('FruitDormantPeriod', $event)">
                      <RadioOption value="Evergreen" label="Evergreen species with indeterminate growth" />
                    </RadioGroup>
                    <div v-if="data.FruitDormantPeriod === 'Evergreen'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 13px">
                      {{ aswExplanations.ASW3c }}
                      <a href="#" @click.prevent="openUPOVLink('ASW3')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 3(c)">(ASW 3(c))</a>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
            </Card>

            <!-- 3.1 Additional Information -->
            <div style="display: flex; flex-direction: column; gap: 10px">
              <Editor
                :model-value="data.GrowingCycleAddInfo || ''"
                :api-key="apiKey"
                :init="init"
                @update:model-value="onFieldChange('GrowingCycleAddInfo', $event)"
              />
            </div>
          </div>
          
          <!-- Side navigation -->
          <div style="width: 200px; padding-top: 40px">
            <a 
              href="#" 
              @click.prevent="openUPOVLink('GN8')" 
              style="display: block; color: #496D31; font-size: 14px; padding: 8px 0; text-decoration: none"
              title="Explanation of the growing cycle (GN 8)"
            >
              Explanation of the growing cycle (GN 8)
            </a>
          </div>
        </div>
        </SectionAccordion>

        <!-- 3.2 Testing Place -->
        <SectionAccordion number="3.2" title="Testing Place">
          <div style="display: flex; flex-direction: column; gap: 16px">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--color-neutral-800); line-height: 20px">Standard items are configured by default</h3>
          </div>
        </SectionAccordion> 

        <!-- 3.3 Conditions for Conducting the Examination -->
        <SectionAccordion number="3.3" title="Conditions for Conducting the Examination">
          <div style="display: flex; gap: 24px">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 16px">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px">
              <a href="#" @click.prevent="openViewExample('condConductiongExam')" style="color: #4CAF50; font-size: 13px" title="View example">
                <u>View example</u>
              </a>
            </div>

            <!-- 3.3.1 Development stages -->
            <Card :elevation="data.Devlopmentstage === 'Y' ? 'medium' : 'none'" :variant="data.Devlopmentstage === 'Y' ? 'outlined' : 'default'">
              <div style="display: flex; flex-direction: column; gap: 10px">
              <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                Indicate if there are stages of development in the Table of Characteristics
              </p>
              <RadioGroup :model-value="data.Devlopmentstage" direction="horizontal"
                @update:model-value="onFieldChange('Devlopmentstage', $event)">
                <RadioOption value="Y" label="Yes" />
                <RadioOption value="N" label="No" />
              </RadioGroup>
              <div v-if="data.Devlopmentstage === 'Y'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 14px">
                {{ aswExplanations.ASW4a }}
                <a href="#" @click.prevent="openUPOVLink('ASW4')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 4(a)">(ASW 4(a))</a>
              </div>
            </div>
            </Card>

            <!-- 3.3.2 Plot types -->
            <Card :elevation="data.DifferentPlotsForObservation === 'Y' ? 'medium' : 'none'" :variant="data.DifferentPlotsForObservation === 'Y' ? 'outlined' : 'default'">
              <div style="display: flex; flex-direction: column; gap: 10px">
              <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                Are there different types of plots for observation?
              </p>
              <RadioGroup :model-value="data.DifferentPlotsForObservation" direction="horizontal"
                @update:model-value="onFieldChange('DifferentPlotsForObservation', $event)">
                <RadioOption value="Y" label="Yes" />
                <RadioOption value="N" label="No" />
              </RadioGroup>
              <div v-if="data.DifferentPlotsForObservation === 'Y'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 14px">
                {{ aswExplanations.ASW4b }}
                <a href="#" @click.prevent="openUPOVLink('ASW4')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 4(b)">(ASW 4(b))</a>
                
                <!-- Plot Type Descriptions -->
                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px">
                  <div>
                    <strong>A:</strong> <span >row plots</span>
                  </div>
                  <div>
                    <strong>B:</strong> <span >Single palnts</span>
                  </div>
                  <div>
                    <strong>C:</strong> <span style="text-decoration: underline">Add type B</span>
                  </div>
                  <div>
                    <strong>D:</strong> <span style="text-decoration: underline">Add type C</span>
                  </div>
                </div>
              </div>
            </div>
            </Card>

            <!-- 3.3.3 Color observation -->
            <Card :elevation="data.EyeColorObservation === 'Y' ? 'medium' : 'none'" :variant="data.EyeColorObservation === 'Y' ? 'outlined' : 'default'">
              <div style="display: flex; flex-direction: column; gap: 10px">
              <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                Indicate if the observation of color by eye applies
              </p>
              <RadioGroup :model-value="data.EyeColorObservation" direction="horizontal"
                @update:model-value="onFieldChange('EyeColorObservation', $event)">
                <RadioOption value="Y" label="Yes" />
                <RadioOption value="N" label="No" />
              </RadioGroup>
              <div v-if="data.EyeColorObservation === 'Y'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 14px">
                {{ aswExplanations.ASW4c }}
                <a href="#" @click.prevent="openUPOVLink('ASW4')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 4(c)">(ASW 4(c))</a>
              </div>
            </div>
            </Card>

            <div style="display: flex; flex-direction: column; gap: 6px">
              <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800)">Additional conditions information</label>
              <Editor
                :model-value="data.ConditionAddInfo || ''"
                :api-key="apiKey"
                :init="init"
                @update:model-value="onFieldChange('ConditionAddInfo', $event)"
              />
            </div>
          </div>
          
          <!-- Side navigation -->
          <div style="width: 200px; padding-top: 10px">
            <a 
              href="#" 
              @click.prevent="openUPOVLink('GN9')" 
              style="display: block; color: #496D31; font-size: 14px; padding: 8px 0; text-decoration: none"
              title="Growth stage key (GN 9)"
            >
              Growth stage key (GN 9)
            </a>
          </div>
        </div>
        </SectionAccordion>

        <!-- 3.4 Test Design -->
        <SectionAccordion number="3.4" title="Test Design">
          <div style="display: flex; gap: 24px">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 16px">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px">
              <a href="#" @click.prevent="openViewExample('testDesignExample')" style="color: #4CAF50; font-size: 13px" title="View example">
                <u>View example</u>
              </a>
            </div>

            <!-- 3.4.1 Propagation methods -->
            <div style="display: flex; flex-direction: column; gap: 10px">
              <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                Is there more than one method of propagation? <span style="color: #D32F2F; margin-left: 2px">*</span>
              </p>
              <RadioGroup :model-value="data.IsOneMethodOfPropogation" direction="horizontal"
                @update:model-value="onFieldChange('IsOneMethodOfPropogation', $event)">
                <RadioOption value="Y" label="Yes" />
                <RadioOption value="N" label="No" />
              </RadioGroup>

              <!-- Show propagation method name input when Yes -->
              <div v-if="data.IsOneMethodOfPropogation === 'Y'" style="margin-top: 12px; padding-left: 24px">
                <label style="font-size: 14px;  color: var(--color-neutral-800); display: block; margin-bottom: 4px">
                  In the case of:
                </label>
                <Input 
                  v-if="examinationPropMethods[0]"
                  :model-value="examinationPropMethods[0].PropogationMethod || ''"
                  placeholder="e.g., seeds, cuttings, grafting"
                  size="small"
                  style="width: 300px"
                  @update:model-value="updatePropMethod(0, 'PropogationMethod', $event)"
                />
              </div>
            </div>

            <!-- Propagation Methods List -->
            <div v-for="(method, index) in examinationPropMethods" :key="method.ExaminationPropagationMethod_ID || index" style="display: flex; flex-direction: column; gap: 16px">
              <!-- Separator for additional methods -->
              <hr v-if="index > 0" style="border: none; border-top: 2px solid #CEDD80; margin: 16px 0" />
              
              <!-- Method name for additional methods -->
              <div v-if="index > 0" style="padding-left: 24px">
                <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); display: block; margin-bottom: 4px">
                  Case {{ index + 1 }}:
                </label>
                <Input 
                  :model-value="method.PropogationMethod || ''"
                  placeholder="e.g., seeds, cuttings, grafting"
                  size="small"
                  style="width: 300px"
                  @update:model-value="updatePropMethod(index, 'PropogationMethod', $event)"
                />
              </div>

            <!-- 3.4.2 Plot design (for this propagation method) -->
            <Card :elevation="method.PlotDesign ? 'medium' : 'none'" :variant="method.PlotDesign ? 'outlined' : 'default'" style="margin-top: 16px">
              <div style="display: flex; flex-direction: column; gap: 10px">
              
              <!-- Single plot -->
              <Card :elevation="method.PlotDesign === 'Singleplot' ? 'low' : 'none'" :variant="method.PlotDesign === 'Singleplot' ? 'outlined' : 'default'">
                <RadioGroup :model-value="method.PlotDesign" direction="vertical"
                  @update:model-value="updatePropMethod(index, 'PlotDesign', $event)">
                  <RadioOption value="Singleplot" label="Single plot" />
                </RadioGroup>
                <div v-if="method.PlotDesign === 'Singleplot'" style="margin-top: 12px; padding-left: 24px">
                  <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap">
                    <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">Each test should be designed to result in at least</span>
                    <div style="min-width: 80px">
                      <Input 
                        :model-value="method.PlantNumber || ''"
                        placeholder="number"
                        size="small"
                        type="number"
                        @update:model-value="updatePropMethod(index, 'PlantNumber', $event)"
                      />
                    </div>
                    <div style="min-width: 150px">
                      <Input 
                        :model-value="method.PlantType || ''"
                        placeholder="trees"
                        size="small"
                        @update:model-value="updatePropMethod(index, 'PlantType', $event)"
                      />
                    </div>
                    <a href="#" @click.prevent="openUPOVLink('ASW5')" style="color: #808080; font-size: 12px; white-space: nowrap; padding-top: 8px" title="ASW 5">(ASW 5(a))</a>
                  </div>
                </div>
              </Card>

              <!-- Replicated plot -->
              <Card :elevation="method.PlotDesign === 'OneRepplot' ? 'low' : 'none'" :variant="method.PlotDesign === 'OneRepplot' ? 'outlined' : 'default'">
                <RadioGroup :model-value="method.PlotDesign" direction="vertical"
                  @update:model-value="updatePropMethod(index, 'PlotDesign', $event)">
                  <RadioOption value="OneRepplot" label="One type of plot but replicated" />
                </RadioGroup>
                <div v-if="method.PlotDesign === 'OneRepplot'" style="margin-top: 12px; padding-left: 24px">
                  <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap">
                    <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">Each test should be designed to result in at least</span>
                    <div style="min-width: 80px">
                      <Input 
                        :model-value="method.PlantNumber || ''"
                        placeholder="number"
                        size="small"
                        type="number"
                        @update:model-value="updatePropMethod(index, 'PlantNumber', $event)"
                      />
                    </div>
                    <div style="min-width: 150px">
                      <Input 
                        :model-value="method.PlantType || ''"
                        placeholder="trees"
                        size="small"
                        @update:model-value="updatePropMethod(index, 'PlantType', $event)"
                      />
                    </div>
                    <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">(if applicable). which should be divided between at least</span>
                    <div style="min-width: 80px">
                      <Input 
                        :model-value="method.Replicatenum || ''"
                        placeholder=""
                        size="small"
                        type="number"
                        @update:model-value="updatePropMethod(index, 'Replicatenum', $event)"
                      />
                    </div>
                    <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">replicates.</span>
                    <a href="#" @click.prevent="openUPOVLink('ASW5')" style="color: #808080; font-size: 12px; white-space: nowrap; padding-top: 8px" title="ASW 5">(ASW 5(c))</a>
                  </div>
                </div>
              </Card>

              <!-- Different types of plots -->
              <Card :elevation="method.PlotDesign === 'Diffplot' ? 'low' : 'none'" :variant="method.PlotDesign === 'Diffplot' ? 'outlined' : 'default'">
                <RadioGroup :model-value="method.PlotDesign" direction="vertical"
                  @update:model-value="updatePropMethod(index, 'PlotDesign', $event)">
                  <RadioOption value="Diffplot" label="if different types of plots" />
                </RadioGroup>
                <div v-if="method.PlotDesign === 'Diffplot'" style="margin-top: 12px; padding-left: 24px; display: flex; flex-direction: column; gap: 16px">
                  <!-- Plot A -->
                  <div>
                    <div style="font-weight: 600; margin-bottom: 8px">
                      <span style="font-weight: 600">A:</span>
                      <Editor
                        :model-value="getPlotTypeDescription(method, 'A')"
                        :api-key="apiKey"
                        :init="{ ...init, inline: true, menubar: false, toolbar: 'bold italic underline', height: 30 }"
                        tag-name="span"
                        style="display: inline-block; min-width: 200px; border-bottom: 1px dashed #ccc; padding: 2px 4px"
                        @update:model-value="updateMethodPlotType(index, 'A', $event)"
                      />
                    </div>
                    <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; padding-left: 20px">
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">Each test should be designed to result in at least</span>
                      <div style="min-width: 80px">
                        <Input 
                          :model-value="method.PlantNumberA || ''" 
                          placeholder="number" 
                          size="small" 
                          type="number" 
                          @update:model-value="updatePropMethod(index, 'PlantNumberA', $event)" 
                        />
                      </div>
                      <div style="min-width: 150px">
                        <Input 
                          :model-value="method.OtherPlantTypeA || ''" 
                          placeholder="trees" 
                          size="small" 
                          @update:model-value="updatePropMethod(index, 'PlantTypeA', $event)" 
                        />
                      </div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">, which should be divided between at least</span>
                      <div style="min-width: 80px">
                        <Input 
                          :model-value="method.RowPlotSizeA || ''" 
                          placeholder="" 
                          size="small" 
                          type="number" 
                          @update:model-value="updatePropMethod(index, 'RowPlotSizeA', $event)" 
                        />
                      </div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">replicates.</span>
                      <a href="#" @click.prevent="openUPOVLink('ASW5')" style="color: #808080; font-size: 12px; white-space: nowrap; padding-top: 8px" title="ASW 5">(ASW 5(c))</a>
                    </div>
                  </div>

                  <!-- Plot B -->
                  <div>
                    <div style="font-weight: 600; margin-bottom: 8px">
                      <span style="font-weight: 600">B:</span>
                      <Editor
                        :model-value="getPlotTypeDescription(method, 'B')"
                        :api-key="apiKey"
                        :init="{ ...init, inline: true, menubar: false, toolbar: 'bold italic underline', height: 30 }"
                        tag-name="span"
                        style="display: inline-block; min-width: 200px; border-bottom: 1px dashed #ccc; padding: 2px 4px"
                        @update:model-value="updateMethodPlotType(index, 'B', $event)"
                      />
                    </div>
                    <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; padding-left: 20px">
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">Each test should be designed to result in at least</span>
                      <div style="min-width: 80px"><Input :model-value="method.PlantNumberB || ''" placeholder="60" size="small" type="number" @update:model-value="updatePropMethod(index, 'PlantNumberB', $event)" /></div>
                      <div style="min-width: 150px"><Input :model-value="method.OtherPlantTypeB || ''" placeholder="trees" size="small" @update:model-value="updatePropMethod(index, 'PlantTypeB', $event)" /></div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">, which should be divided between at least</span>
                      <div style="min-width: 80px"><Input :model-value="method.RowPlotSizeB || ''" placeholder="" size="small" type="number" @update:model-value="updatePropMethod(index, 'RowPlotSizeB', $event)" /></div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">replicates.</span>
                      <a href="#" @click.prevent="openUPOVLink('ASW5')" style="color: #808080; font-size: 12px; white-space: nowrap; padding-top: 8px" title="ASW 5">(ASW 5(c))</a>
                    </div>
                  </div>

                  <!-- Plot C -->
                  <div>
                    <div style="font-weight: 600; margin-bottom: 8px">
                      <span style="font-weight: 600">C:</span>
                      <Editor
                        :model-value="getPlotTypeDescription(method, 'C')"
                        :api-key="apiKey"
                        :init="{ ...init, inline: true, menubar: false, toolbar: 'bold italic underline', height: 30 }"
                        tag-name="span"
                        style="display: inline-block; min-width: 200px; border-bottom: 1px dashed #ccc; padding: 2px 4px"
                        @update:model-value="updateMethodPlotType(index, 'C', $event)"
                      />
                    </div>
                    <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; padding-left: 20px">
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">Each test should be designed to result in at least</span>
                      <div style="min-width: 80px"><Input :model-value="method.PlantNumberC || ''" placeholder="number" size="small" type="number" @update:model-value="updatePropMethod(index, 'PlantNumberC', $event)" /></div>
                      <div style="min-width: 150px"><Input :model-value="method.OtherPlantTypeC || ''" placeholder="trees" size="small" @update:model-value="updatePropMethod(index, 'PlantTypeC', $event)" /></div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">, which should be divided between at least</span>
                      <div style="min-width: 80px"><Input :model-value="method.RowPlotSizeC || ''" placeholder="" size="small" type="number" @update:model-value="updatePropMethod(index, 'RowPlotSizeC', $event)" /></div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">replicates.</span>
                      <a href="#" @click.prevent="openUPOVLink('ASW5')" style="color: #808080; font-size: 12px; white-space: nowrap; padding-top: 8px" title="ASW 5">(ASW 5(c))</a>
                    </div>
                  </div>

                  <!-- Plot D -->
                  <div>
                    <div style="font-weight: 600; margin-bottom: 8px">
                      <span style="font-weight: 600">D:</span>
                      <Editor
                        :model-value="getPlotTypeDescription(method, 'D')"
                        :api-key="apiKey"
                        :init="{ ...init, inline: true, menubar: false, toolbar: 'bold italic underline', height: 30 }"
                        tag-name="span"
                        style="display: inline-block; min-width: 200px; border-bottom: 1px dashed #ccc; padding: 2px 4px"
                        @update:model-value="updateMethodPlotType(index, 'D', $event)"
                      />
                    </div>
                    <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; padding-left: 20px">
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">Each test should be designed to result in at least</span>
                      <div style="min-width: 80px"><Input :model-value="method.PlantNumberD || ''" placeholder="number" size="small" type="number" @update:model-value="updatePropMethod(index, 'PlantNumberD', $event)" /></div>
                      <div style="min-width: 150px"><Input :model-value="method.OtherPlantTypeD || ''" placeholder="trees" size="small" @update:model-value="updatePropMethod(index, 'PlantTypeD', $event)" /></div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">, which should be divided between at least</span>
                      <div style="min-width: 80px"><Input :model-value="method.RowPlotSizeD || ''" placeholder="" size="small" type="number" @update:model-value="updatePropMethod(index, 'RowPlotSizeD', $event)" /></div>
                      <span style="font-size: 14px; color: var(--color-neutral-800); padding-top: 8px">replicates.</span>
                      <a href="#" @click.prevent="openUPOVLink('ASW5')" style="color: #808080; font-size: 12px; white-space: nowrap; padding-top: 8px" title="ASW 5">(ASW 5(c))</a>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            </Card>

            <!-- End of this propagation method -->
            </div>

            <!-- Add/Remove Propagation Method Buttons -->
            <div v-if="data.IsOneMethodOfPropogation === 'Y'" style="display: flex; gap: 12px; margin-top: 16px; padding-left: 24px">
              <Button 
                variant="primary"
                size="small"
                @click="addPropagationMethod"
              >
                Add Method of Propagation
              </Button>
              <Button 
                v-if="examinationPropMethods.length > 1"
                variant="secondary"
                size="small"
                @click="removePropagationMethod(examinationPropMethods.length - 1)"
              >
                Remove Method of Propagation
              </Button>
            </div>

            <!-- 3.4.3 Plant removal -->
            <Card :elevation="data.PlantRemoval === 'Y' ? 'medium' : 'none'" :variant="data.PlantRemoval === 'Y' ? 'outlined' : 'default'">
              <div style="display: flex; flex-direction: column; gap: 10px">
              <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                {{ isMushroom ? 'Is it necessary to state that the design should allow fruit body removal without prejudice to observations?' : 'Is it necessary to state that the design should allow plant removal without prejudice to observations?' }}
              </p>
              <RadioGroup :model-value="data.PlantRemoval" direction="horizontal"
                @update:model-value="onFieldChange('PlantRemoval', $event)">
                <RadioOption value="Y" label="Yes" />
                <RadioOption value="N" label="No" />
              </RadioGroup>
              <div v-if="data.PlantRemoval === 'Y'" style="margin-top: 8px; padding-left: 24px; color: var(--color-neutral-700); font-size: 14px">
                {{ isMushroom ? aswExplanations.ASW6mushrooms : aswExplanations.ASW6plants }}
                <a href="#" @click.prevent="openUPOVLink('ASW6')" style="color: #808080; font-size: 12px; margin-left: 4px" title="ASW 6">(ASW 6)</a>
              </div>
            </div>
            </Card>

            <div style="display: flex; flex-direction: column; gap: 6px">
              <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800)">Additional test design information</label>
              <Editor
                :model-value="data.TestDesignAddInfo || ''"
                :api-key="apiKey"
                :init="init"
                @update:model-value="onFieldChange('TestDesignAddInfo', $event)"
              />
            </div>
          </div>
          
          <!-- Side navigation -->
          <div style="width: 200px; padding-top: 10px">
            <a 
              href="#" 
              @click.prevent="openUPOVLink('GN10')" 
              style="display: block; color: #496D31; font-size: 14px; padding: 8px 0; text-decoration: none"
              title="Test design (GN 10.1)"
            >
              Test design (GN 10.1)
            </a>
          </div>
        </div>
        </SectionAccordion>

      </div>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>

<style scoped>
/* Ensure inputs are properly aligned */
:deep(.upov-input) {
  display: inline-block;
}

/* Link styling */
a {
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  text-decoration: underline;
}

/* Section spacing */
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-neutral-800);
  line-height: 20px;
}

.asw-link {
  color: #808080;
  font-size: 12px;
}

.example-link {
  color: #4CAF50;
  font-size: 13px;
  margin-left: auto;
}

.explanation-text {
  margin-top: 8px;
  padding-left: 24px;
  color: var(--color-neutral-700);
  font-size: 14px;
  line-height: 1.5;
}

/* Nested options indentation */
.nested-options {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Plot design fields */
.plot-design-fields {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
  padding-left: 20px;
}

.plot-design-fields span {
  font-size: 14px;
  color: var(--color-neutral-800);
}

/* Different plots section */
.plot-type-header {
  font-weight: 600;
  margin-bottom: 4px;
}

.plot-type-header span {
  text-decoration: underline;
  font-weight: normal;
  color: var(--color-neutral-600);
}

</style>