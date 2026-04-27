<script setup lang="ts">
import { computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card, ToggleSwitch } from '@upov/upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 200 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('06');

const data = computed(() => store.chapters['06'] || {});

function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('06', field, value);
  markDirty();
}

function onLegendToggle(val: 'left' | 'right') {
  onFieldChange('isCharacteristicsLegend', val === 'right' ? 'Y' : 'N');
}

function onExampleVarietyToggle(val: 'left' | 'right') {
  onFieldChange('isExampleVarietyText', val === 'right' ? 'Y' : 'N');
}
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <Card elevation="low">
        <div style="display: flex; flex-direction: column; gap: 24px;">

          <!-- Legend section -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <h2 style="font-size: 18px; font-weight: 700; color: var(--color-neutral-800); line-height: 22px;">6.1 Characteristics legend</h2>
              <ToggleSwitch
                :model-value="data.isCharacteristicsLegend === 'Y' ? 'right' : 'left'"
                left-label="Disabled"
                right-label="Enabled"
                @update:model-value="onLegendToggle"
              />
            </div>
            <p style="font-size: 14px; font-weight: 400; color: #606060; line-height: 20px;">
              Enable to add a legend explaining symbols and abbreviations used in the table of characteristics.
            </p>
            <Editor
              v-if="data.isCharacteristicsLegend === 'Y'"
              :model-value="data.CharacteristicLegend || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('CharacteristicLegend', $event)"
            />
          </div>

          <!-- Example variety text section -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <h2 style="font-size: 18px; font-weight: 700; color: var(--color-neutral-800); line-height: 22px;">6.2 Example variety text</h2>
              <ToggleSwitch
                :model-value="data.isExampleVarietyText === 'Y' ? 'right' : 'left'"
                left-label="Disabled"
                right-label="Enabled"
                @update:model-value="onExampleVarietyToggle"
              />
            </div>
            <p style="font-size: 14px; font-weight: 400; color: #606060; line-height: 20px;">
              Enable to add text explaining the example varieties used in the table of characteristics.
            </p>
            <Editor
              v-if="data.isExampleVarietyText === 'Y'"
              :model-value="data.ExampleVarietyText || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('ExampleVarietyText', $event)"
            />
          </div>

        </div>
      </Card>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>