<script setup lang="ts">
import { computed, ref } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card, RadioGroup, RadioOption } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { useTinymce } from '@/composables/useTinymce';
import { useChapterPreview } from '@/composables/useChapterPreview';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 200 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('01');

const data = computed(() => store.chapters['01'] || {});

// ── Continue sentence: native contenteditable (no TinyMCE iframe) ─────────────
const continueSentenceRef = ref<HTMLDivElement | null>(null);
const isFocused = ref(false);

const continueSentenceHtml = computed(() => data.value?.Sub_OtherInfo || '');

function onContinueFocus() {
  isFocused.value = true;
}

function onContinueBlur() {
  isFocused.value = false;
  const el = continueSentenceRef.value;
  if (!el) return;
  const plain = el.innerText.trim();
  onFieldChange('Sub_OtherInfo', plain ? el.innerHTML : '');
}

function onContinueInput() {
  const el = continueSentenceRef.value;
  if (!el) return;
  const plain = el.innerText.trim();
  onFieldChange('Sub_OtherInfo', plain ? el.innerHTML : '');
}

function onContinueKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') e.preventDefault();
}

// Toolbar buttons use mousedown.prevent so the editable div stays focused
function execFormat(cmd: string) {
  document.execCommand(cmd, false);
  continueSentenceRef.value?.focus();
  onContinueInput();
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function onFieldChange(field: string, value: string | null | undefined) {
  store.autosave('01', field, value);
  markDirty();
}

function setRadio(field: string, value: 'Y' | 'N') {
  onFieldChange(field, value);
}

const botanicalNames = computed(() =>
  store.upovCodes
    .map((uc) => uc.botanicalName.replace(/<\/?p>/g, '').trim())
    .join(', '),
);
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <Card elevation="low">
        <div style="display: flex; flex-direction: column; gap: 16px">

          <!-- Static intro sentence -->
          <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 20px; margin: 0">
            These Test Guidelines apply to all varieties of
            <strong v-html="botanicalNames || '…'" />
          </p>

          <!-- ── Continue sentence ─────────────────────────────────────────── -->
          <div style="display: flex; flex-direction: column; gap: 6px">
            <label style="font-size: 13px; color: var(--color-neutral-600)">
              Continue sentence
              <span style="font-size: 12px; font-weight: 400; color: var(--color-neutral-400); margin-left: 4px">(optional)</span>
            </label>

            <div
              :style="{
                border: isFocused
                  ? '1.5px solid var(--color-primary-500, #496D31)'
                  : '1px solid var(--color-neutral-300)',
                borderRadius: '6px',
                background: '#fff',
                transition: 'border-color 0.15s',
                overflow: 'hidden',
              }"
            >
              <!-- Compact format toolbar -->
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 1px;
                  padding: 3px 6px;
                  border-bottom: 1px solid var(--color-neutral-200);
                  background: var(--color-neutral-50, #f9fafb);
                "
              >
                <button type="button" class="fmt-btn" title="Bold"        @mousedown.prevent="execFormat('bold')">
                  <b>B</b>
                </button>
                <button type="button" class="fmt-btn" title="Italic"      @mousedown.prevent="execFormat('italic')">
                  <i>I</i>
                </button>
                <button type="button" class="fmt-btn" title="Underline"   @mousedown.prevent="execFormat('underline')">
                  <u>U</u>
                </button>
                <span class="fmt-divider" />
                <button type="button" class="fmt-btn" title="Subscript"   @mousedown.prevent="execFormat('subscript')">
                  X<sub>2</sub>
                </button>
                <button type="button" class="fmt-btn" title="Superscript" @mousedown.prevent="execFormat('superscript')">
                  X<sup>2</sup>
                </button>
              </div>

              <!-- Editable text area -->
              <div
                ref="continueSentenceRef"
                contenteditable="true"
                :innerHTML="continueSentenceHtml"
                data-placeholder="Type continuation of the sentence…"
                class="continue-editable"
                @focus="onContinueFocus"
                @blur="onContinueBlur"
                @input="onContinueInput"
                @keydown="onContinueKeydown"
              />
            </div>
          </div>

          <!-- ── Subject clarification ─────────────────────────────────────── -->
          <div style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--color-neutral-200); border-radius: 8px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              Subject clarification
            </h3>
            <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              Should clarification be provided that any other species or hybrids not explicitly
              covered by these Test Guidelines should be treated according to the provisions of
              document TGP/12 "Guidance for New Types and Species"?
              <span style="color: #D32F2F; margin-left: 2px">*</span>
            </p>

            <RadioGroup
              :model-value="data.SubjectClarificationIndicator"
              direction="horizontal"
              @update:model-value="setRadio('SubjectClarificationIndicator', $event)"
            >
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>

            <div
              v-if="data.SubjectClarificationIndicator === 'Y'"
              style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px"
            >
              <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                Guidance on the use of Test Guidelines for
                <input
                  type="text"
                  :value="data.SubjectSpeciesCategory || ''"
                  maxlength="250"
                  placeholder="Enter species / category"
                  style="display: inline-block; width: 220px; margin: 0 6px; padding: 4px 8px; border: 1px solid var(--color-neutral-300); border-radius: 4px; font-size: 14px;"
                  @input="onFieldChange('SubjectSpeciesCategory', ($event.target as HTMLInputElement).value)"
                />
                that are not explicitly covered by Test Guidelines is provided in document
                TGP/13 "Guidance for New Types and Species".
                <a href="#" style="color: #496D31; font-size: 13px; margin-left: 4px">(ASW 0)</a>
              </p>
            </div>
          </div>

          <!-- ── Additional characteristics ───────────────────────────────── -->
          <div style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--color-neutral-200); border-radius: 8px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              Additional characteristics
            </h3>
            <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 20px; margin: 0">
              Might it be necessary to add additional characteristics or additional states of
              expressions for ornamental, fruit, industrial, vegetable, agricultural or other varieties?
              <span style="color: #D32F2F; margin-left: 2px">*</span>
            </p>

            <RadioGroup
              :model-value="data.Sub_check"
              direction="horizontal"
              @update:model-value="setRadio('Sub_check', $event)"
            >
              <RadioOption value="Y" label="Yes" />
              <RadioOption value="N" label="No" />
            </RadioGroup>

            <div
              v-if="data.Sub_check === 'Y'"
              style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px"
            >
              <p style="font-size: 14px; color: var(--color-neutral-800); line-height: 20px; margin: 0">
                In the case of
                <input
                  type="text"
                  :value="data.Sub_DD_Value || ''"
                  maxlength="250"
                  placeholder="Enter variety type"
                  style="display: inline-block; width: 220px; margin: 0 6px; padding: 4px 8px; border: 1px solid var(--color-neutral-300); border-radius: 4px; font-size: 14px;"
                  @input="onFieldChange('Sub_DD_Value', ($event.target as HTMLInputElement).value)"
                />
                , in particular, it may be necessary to use additional characteristics or
                additional states of expression to those included in the Table of Characteristics
                in order to examine Distinctness, Uniformity and Stability.
                <a href="#" style="color: #496D31; font-size: 13px; margin-left: 4px">(ASW 0)</a>
              </p>
            </div>
          </div>

          <!-- ── Additional information ────────────────────────────────────── -->
          <div style="display: flex; flex-direction: column; gap: 6px">
            <label style="font-size: 14px; font-weight: 600; color: var(--color-neutral-800)">
              Additional information
              <span style="font-size: 12px; font-weight: 400; color: var(--color-neutral-500); margin-left: 6px">
                (optional paragraph)
              </span>
            </label>
            <Editor
              :model-value="data.Sub_Add_Info || ''"
              :api-key="apiKey"
              :init="init"
              @update:model-value="onFieldChange('Sub_Add_Info', $event)"
            />
          </div>

        </div>
      </Card>
    </template>

    <!-- Preview slot -->
    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">
      ⚠ {{ previewError }}
    </div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>

<style scoped>
/* Editable content area */
.continue-editable {
  min-height: 40px;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--color-neutral-800);
  line-height: 1.6;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Placeholder via CSS */
.continue-editable:empty::before {
  content: attr(data-placeholder);
  color: var(--color-neutral-400, #b0b0b0);
  pointer-events: none;
}

/* Toolbar buttons */
.fmt-btn {
  width: 26px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-neutral-700, #444);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.fmt-btn:hover {
  background: var(--color-neutral-100, #efefef);
}

.fmt-btn:active {
  background: var(--color-neutral-200, #e0e0e0);
}

.fmt-divider {
  width: 1px;
  height: 14px;
  background: var(--color-neutral-200, #ddd);
  margin: 0 3px;
  flex-shrink: 0;
}
</style>