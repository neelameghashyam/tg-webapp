<script setup lang="ts">
import { ref } from 'vue';
import { FooterAtom } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { editorApi } from '@/services/editor-api';

const store = useEditorStore();

const importLoading = ref(false);
const importError   = ref<string | null>(null);

async function handleImport() {
  if (!store.tgId || importLoading.value) return;

  importLoading.value = true;
  importError.value   = null;

  try {
    const { blob, contentType, contentDisposition } = await editorApi.docGenerate(
      store.tgId,
      'en',
    );

    let filename = `document-${store.tgId}.docx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
      if (match) filename = decodeURIComponent(match[1].trim());
    } else if (contentType.includes('pdf')) {
      filename = `document-${store.tgId}.pdf`;
    } else if (contentType.includes('html')) {
      filename = `document-${store.tgId}.html`;
    }

    const url = URL.createObjectURL(new Blob([blob], { type: contentType }));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
      importError.value = 'Document generation timed out. The document is too large or the server is busy. Please try again in a few moments.';
    } else {
      importError.value =
        err?.response?.data?.error?.message || 'Failed to generate document. Please try again.';
    }
  } finally {
    importLoading.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Inline error message -->
    <div
      v-if="importError"
      style="
        margin: 6px 16px;
        padding: 6px 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 5px;
        font-size: 12px;
        color: #D32F2F;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      "
    >
      <span>⚠ {{ importError }}</span>
      <button
        @click="importError = null"
        style="background: none; border: none; cursor: pointer; color: #D32F2F; font-size: 16px; line-height: 1; padding: 0;"
      >&times;</button>
    </div>

    <FooterAtom
      :has-previous-chapter="store.activeChapterIndex > 0"
      :has-next-chapter="store.activeChapterIndex < store.chapterList.length - 1"
      export-label="Export"
      :import-loading="importLoading"
      @previous-chapter="store.goPrevious()"
      @next-chapter="store.goNext()"
      @export="handleImport"
    />
  </div>
</template>