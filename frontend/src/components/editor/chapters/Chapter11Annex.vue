<script setup lang="ts">
import { computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card } from '@upov/upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 400 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } =
  useChapterPreview('11');

// Null-safe: DB returns null for unset annexRefData
const data = computed(() => store.chapters['11'] ?? {});

function onContentChange(value: string) {
  store.autosave('11', 'annexRefData', value);
  markDirty();
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
        <div style="display: flex; flex-direction: column; gap: 12px">

          <label style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px">
            Please enter additional information beyond that provided in Chapters 1 to 10 of the
            Test Guidelines:
          </label>

          <Editor
            :model-value="(data as any).annexRefData ?? ''"
            :api-key="apiKey"
            :init="init"
            @update:model-value="onContentChange"
          />

        </div>
      </Card>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>