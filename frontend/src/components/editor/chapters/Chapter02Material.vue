<script setup lang="ts">
import { computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { RadioGroup, RadioOption } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';
import SectionAccordion from '@/components/editor/shared/SectionAccordion.vue';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 200 });

const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('02');

const data = computed(() => store.chapters['02'] || {});

function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('02', field, value);
  markDirty();
}

const isMushroomVariety = computed(() => store.tgFlags?.isMushroom ?? false);

const seedOptions = [
  {
    group: '',
    groupLabel: 'Test Guidelines which only apply to seed-propagated varieties:',
    options: [
      {
        value: 'ASW1(a)',
        text: 'The seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority. In cases where the seed is to be stored, the germination capacity should be as high as possible and should be stated by the applicant.',
        tag: 'ASW 1 (a) Alternative 1'
      },
      {
        value: 'ASW1(b)',
        text: 'The seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority.',
        tag: 'ASW 1 (a) Alternative 2'
      }
    ]
  },
  {
    group: '',
    groupLabel: 'Test Guidelines which apply to seed-propagated varieties as well as other types of varieties:',
    options: [
      {
        value: 'ASW2(a)',
        text: 'In the case of seed, the seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority. In cases where the seed is to be stored, the germination capacity should be as high as possible and should be stated by the applicant.',
        tag: 'ASW 1 (b) Alternative 1'
      },
      {
        value: 'ASW2(b)',
        text: 'In the case of seed, the seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority.',
        tag: 'ASW 1 (b) Alternative 2'
      }
    ]
  }
];

// Derive the currently selected option's value key by matching stored value
const selectedSeedValue = computed(() => data.value?.SeedQualityReq ?? null);


</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <div style="display: flex; flex-direction: column; gap: 12px">

        <!-- 2.2 The material is to be supplied in the form of -->
        <SectionAccordion number="2.2" title="The material is to be supplied in the form of:">
          <div style="display: flex; flex-direction: column; gap: 8px">
            <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              The material is to be supplied in the form of
              <span style="color: #D32F2F; margin-left: 1px">*</span>
            </p>
            <Editor
              :model-value="data.Material_Supplied || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('Material_Supplied', $event)"
            />
          </div>
        </SectionAccordion>

        <!-- 2.3 Minimum quantity of material -->
        <SectionAccordion
          number="2.3"
          :title="isMushroomVariety
            ? 'The minimum quantity of material, to be supplied by the applicant, should be:'
            : 'The minimum quantity of plant material, to be supplied by the applicant, should be:'"
        >
          <div style="display: flex; flex-direction: column; gap: 8px">
            <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              {{ isMushroomVariety
                ? 'The minimum quantity of material, to be supplied by the applicant, should be'
                : 'The minimum quantity of plant material, to be supplied by the applicant, should be' }}
              <span style="color: #D32F2F; margin-left: 1px">*</span>
            </p>
            <Editor
              :model-value="data.Min_Plant_Material || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('Min_Plant_Material', $event)"
            />
          </div>
        </SectionAccordion>

        <!-- 2.4 Seed Quality Requirements -->
        <SectionAccordion number="2.4" title="Seed Quality Requirements" :open="true">
          <div style="display: flex; flex-direction: column; gap: 20px">

            <p style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              Please select one of the options (if applicable).
            </p>

            <div
              v-for="group in seedOptions"
              :key="group.group"
              style="display: flex; flex-direction: column; gap: 10px"
            >
              <!-- Group heading -->
              <h3 style="font-size: 16px; font-weight: 700; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                {{ group.group }} {{ group.groupLabel }}
              </h3>

              <!-- Radio options -->
              <div
                v-for="opt in group.options"
                :key="opt.value"
                style="display: flex; flex-direction: column; gap: 2px"
              >
                <RadioGroup
                  :model-value="selectedSeedValue"
                  direction="vertical"
                  @update:model-value="onFieldChange('SeedQualityReq', $event)"
                >
                  <RadioOption :value="opt.value" :label="opt.tag" />
                </RadioGroup>
                <span style="padding-left: 26px; font-size: 14px; line-height: 22px; color: var(--color-neutral-800)">
                  {{ opt.text }}
                </span>
              </div>
            </div>

            <!-- Deselect -->
            <div>
              <button
                type="button"
                style="font-size: 13px; color: var(--color-neutral-600); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline;"
                @click="onFieldChange('SeedQualityReq', null)"
              >
                Deselect
              </button>
            </div>

          </div>
        </SectionAccordion>

        <!-- Additional information -->
        <SectionAccordion v-if="data.Material_AddInfo" title="Additional information on required material" :open="false">
          <div style="display: flex; flex-direction: column; gap: 16px">
            <Editor
              :model-value="data.Material_AddInfo || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('Material_AddInfo', $event)"
            />
          </div>
        </SectionAccordion>

      </div>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>