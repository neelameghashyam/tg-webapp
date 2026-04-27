<script setup lang="ts">
import { ref, computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Button, Card, Select } from '@upov/upov-ui';
import type { SelectOption } from '@upov/upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import { useEditorStore } from '@/stores/editor';
import { editorApi } from '@/services/editor-api';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';
import type { Explanation, Characteristic } from '@/types/editor';

const store = useEditorStore();
const { apiKey, init: tinymceInit } = useTinymce({ height: 250 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('08');

const explanations = computed<Explanation[]>(() => store.chapters['08']?.explanations ?? []);
const characteristics = computed(() => store.chapters['07']?.characteristics ?? []);

const explByTocId = computed(() => {
  const map: Record<number, Explanation> = {};
  for (const e of explanations.value) {
    map[e.TOC_ID] = e;
  }
  return map;
});

const charsWithoutExpl = computed(() =>
  characteristics.value.filter((c: Characteristic) => !explByTocId.value[c.TOC_ID]),
);

async function refreshExplanations() {
  const res = await editorApi.open(store.tgId!);
  store.chapters['08'] = res.chapters['08'];
}

const selectedTocIdStr = ref('');

const charSelectOptions = computed<SelectOption[]>(() =>
  charsWithoutExpl.value.map((c: Characteristic) => ({
    value: String(c.TOC_ID),
    label: `${c.CharacteristicOrder}. ${c.TOC_Name}`,
  })),
);

async function addExplanation() {
  if (!selectedTocIdStr.value) return;
  await editorApi.createExplanation(store.tgId!, {
    TOC_ID: Number(selectedTocIdStr.value),
    Explaination_Text: '',
  });
  selectedTocIdStr.value = '';
  await refreshExplanations();
  markDirty();
}

async function deleteExplanation(explId: number) {
  await editorApi.deleteExplanation(store.tgId!, explId);
  await refreshExplanations();
  markDirty();
}

const saveTimers: Record<number, ReturnType<typeof setTimeout>> = {};

function onExplanationChange(expl: Explanation, content: string) {
  expl.Explaination_Text = content;
  const id = expl.Explanation_ID;
  if (saveTimers[id]) clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(async () => {
    try {
      await editorApi.updateExplanation(store.tgId!, id, { Explaination_Text: content });
      markDirty();
    } catch (err) {
      console.error('Failed to save explanation:', err);
    }
  }, 500);
}

function charName(tocId: number): string {
  const char = characteristics.value.find((c: Characteristic) => c.TOC_ID === tocId);
  return char ? `${char.CharacteristicOrder}. ${char.TOC_Name}` : `TOC_ID ${tocId}`;
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
        <p v-if="characteristics.length === 0" style="font-size: 14px; color: var(--color-neutral-500)">
          No characteristics defined yet. Add characteristics in Chapter 7 first.
        </p>

        <template v-else>
          <!-- Existing explanations -->
          <Card v-for="expl in explanations" :key="expl.Explanation_ID" elevation="low" padding="compact">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0">
              <h3 style="font-size: 15px; font-weight: 600; color: var(--color-primary-green-dark); margin: 0">Ad. {{ charName(expl.TOC_ID) }}</h3>
              <Button type="danger" size="small" icon-left="x-lg" @click="deleteExplanation(expl.Explanation_ID)" />
            </div>
            <div style="padding: 12px 16px 16px">
              <Editor
                :model-value="expl.Explaination_Text || ''"
                :api-key="apiKey"
                :init="tinymceInit"
                @update:model-value="onExplanationChange(expl, $event)"
              />
            </div>
          </Card>

          <!-- Add explanation -->
          <div v-if="charsWithoutExpl.length > 0" style="padding-top: 4px">
            <div style="display: flex; gap: 8px; align-items: center">
              <Select
                v-model="selectedTocIdStr"
                :options="charSelectOptions"
                placeholder="Add explanation for characteristic..."
                style="flex: 1; min-width: 0"
              />
              <Button type="primary" :disabled="!selectedTocIdStr" @click="addExplanation">+ Add</Button>
            </div>
          </div>

          <p v-if="explanations.length === 0 && charsWithoutExpl.length > 0" style="font-size: 14px; color: #999">
            No explanations added yet. Select a characteristic above to add an explanation.
          </p>
        </template>
      </div>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>