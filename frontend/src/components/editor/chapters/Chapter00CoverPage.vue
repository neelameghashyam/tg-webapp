<script setup lang="ts">
import { computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card } from '@upov/upov-ui';;
import { useEditorStore } from '@/stores/editor';
import { useTinymce } from '@/composables/useTinymce';
import { useChapterPreview } from '@/composables/useChapterPreview';

import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 200 });

const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } =
  useChapterPreview('00');






















// Ch00 data lives on store.tg (tgHeader), NOT store.chapters['00']
const tg = computed(() => store.tg || {});

function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('00', field, value);
  markDirty();
}

// UPOV Code(s) — read-only, managed via UPOV codes
const upovCodesStr = computed(() =>
  store.upovCodes.map((uc: any) => uc.code).filter(Boolean).join('; '),
);

// Botanical Name(s) — read-only, preserve inline HTML like <i>



const botanicalNames = computed(() => {
  const names = store.upovCodes
    .map((uc: any) => {
      let name = uc.botanicalName || '';
      // Remove paragraph tags
      name = name.replace(/<\/?p>/g, '');
      // Remove span tags but keep their content
      name = name.replace(/<span[^>]*>([^<]*)<\/span>/gi, '$1');
      // Unescape HTML entities for formatting tags
      name = name.replace(/&lt;em&gt;/gi, '<em>');
      name = name.replace(/&lt;\/em&gt;/gi, '</em>');
      name = name.replace(/&lt;i&gt;/gi, '<i>');
      name = name.replace(/&lt;\/i&gt;/gi, '</i>');
      // Remove excessive whitespace
      name = name.replace(/\s+/g, ' ');
      return name.trim();
    })
    .filter(Boolean)


    .join(', ');
  return names;
});
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <div data-no-pane-padding style="display: flex; flex-direction: column; gap: 16px; padding: 16px;">

        <!-- Main Common Name(s) -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); line-height: 20px;">
            Main Common Name(s)
            <span style="color: #D32F2F; margin-left: 2px;">*</span>
          </label>
          <input
            type="text"
            :value="tg.TG_Name || ''"
            :disabled="!store.canEdit"
            placeholder="Enter main common name"
            maxlength="250"
            style="height: 40px; width: 100%; padding: 0 12px; border: 1px solid var(--color-neutral-300); border-radius: 6px; font-size: 14px; color: var(--color-neutral-800); background: #fff; outline: none; transition: border-color 0.2s; box-sizing: border-box;"
            @input="onFieldChange('TG_Name', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <!-- UPOV Code(s) — read-only -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); line-height: 20px;">
            UPOV Code(s)
          </label>
          <div style="min-height: 40px; display: flex; align-items: center; padding: 8px 12px; border: 1px solid var(--color-neutral-200); border-radius: 6px; background: var(--color-neutral-50); font-size: 14px; font-weight: 600; color: var(--color-primary-green-dark, #1c4240); box-sizing: border-box;">
            {{ upovCodesStr || '—' }}
          </div>
          <span style="font-size: 12px; color: var(--color-neutral-500); font-style: italic;">
            Managed via UPOV codes
          </span>
        </div>

        <!-- Botanical Name(s) — read-only -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); line-height: 20px;">
            Botanical Name(s)
          </label>
          <div
            style="min-height: 40px; display: flex; align-items: center; padding: 8px 12px; border: 1px solid var(--color-neutral-200); border-radius: 6px; background: var(--color-neutral-50); font-size: 14px; font-weight: 600; color: var(--color-primary-green-dark, #1c4240); box-sizing: border-box;"
            v-html="botanicalNames || '—'"
          />
          <span style="font-size: 12px; color: var(--color-neutral-500); font-style: italic;">
            Managed via UPOV codes
          </span>
        </div>

        <!-- Other associated UPOV documents -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800); line-height: 20px;">
            Other Associated UPOV Documents
          </label>
          <p style="font-size: 13px; color: var(--color-neutral-600); line-height: 18px; margin: 0;">
            Please indicate other associated UPOV documents
          </p>
          <Editor
            :model-value="tg.Name_AssoDocInfo || ''"
            :api-key="apiKey"
            :init="init"
            :disabled="!store.canEdit"
            @update:model-value="onFieldChange('Name_AssoDocInfo', $event)"
          />
            </div>

      </div>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>