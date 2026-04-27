<script setup lang="ts">
import { computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card, Links } from '@upov/upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 400 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } =
  useChapterPreview('09');

// Null-safe: DB returns null for unset LiteratureReferences
const data = computed(() => store.chapters['09'] ?? {});

function onContentChange(value: string) {
  // DB field: LiteratureReferences (ALLOWED_FIELDS in chapter-09.repo.js)
  store.autosave('09', 'LiteratureReferences', value);
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
          
          <Links :links="[{ text: 'Literature (GN 30)' }]" />

          <label style="font-size: 14px; font-weight: 400; color: var(--color-neutral-800); line-height: 20px">
            Literature References:
          </label>

          <Editor
            :model-value="(data as any).LiteratureReferences ?? ''"
            :api-key="apiKey"
            :init="init"
            @update:model-value="onContentChange"
          />

          
          <p style="font-size: 13px; font-weight: 400; color: var(--color-neutral-600); line-height: 18px; margin: 0">
            (<strong>Literature should be presented as follows:</strong> for ex [Surname 1], [Initials 1].,
            [Surname 2], [Initials 2] etc.,<br />
            [Year]:&nbsp; [Title].&nbsp; [Publication].&nbsp; [Town], [City / Region], [Country*],
            [pp. n1 to n2&nbsp; or&nbsp; x pp.] )
          </p>

        </div>
      </Card>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>