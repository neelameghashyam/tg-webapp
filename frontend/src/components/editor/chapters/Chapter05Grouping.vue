<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card, Table } from '@upov/upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import { useEditorStore } from '@/stores/editor';
import { useChapterPreview } from '@/composables/useChapterPreview';
import { useTinymce } from '@/composables/useTinymce';
import { editorApi } from '@/services/editor-api';
import { useAuthStore } from '@/stores/auth';

interface GroupingCharacteristic {
  TOC_ID: number;
  CharacteristicOrder: number;
  TOC_Name: string;
  Grouping_Text: string;
  Grouping: string;
}

const store = useEditorStore();
const authStore = useAuthStore();
const { apiKey, init } = useTinymce({ height: 200 });
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('05');

const data = computed(() => store.chapters['05'] || {});
const errorMessage = ref('');

// Get language from TG header, default to EN
const languageCode = computed(() => store.tg?.Language_Code || 'EN');
// Get user role from user roles array
const userRole = computed(() => {
  if (!authStore.user?.roles) return 'DRF';
  // Check if user has TRN role
  if (authStore.user.roles.includes('TRN')) return 'TRN';
  return 'DRF';
});

// Get characteristics from Chapter 07 that have Grouping = 'Y'
const characteristics = computed(() => {
  const ch07 = store.chapters['07'];
  if (!ch07?.characteristics) return [];
  
  return ch07.characteristics
    .filter((char: any) => char.Grouping === 'Y')
    .map((char: any) => ({
      TOC_ID: char.TOC_ID,
      CharacteristicOrder: char.CharacteristicOrder,
      TOC_Name: char.TOC_Name,
      Grouping_Text: char.Grouping_Text || '',
      Grouping: char.Grouping
    }));
});

// Get grouping summary text from chapter 05 data
const groupingSummaryText = ref('');

// Watch for data changes and update groupingSummaryText
watch(() => data.value?.GroupingSummaryText, (newVal) => {
  if (newVal !== undefined) {
    groupingSummaryText.value = newVal || '';
  }
}, { immediate: true });

// Check if user can edit (not TRN role with EN language)
const canEdit = computed(() => {
  if (userRole.value === 'TRN' && languageCode.value === 'EN') {
    return false;
  }
  return true;
})

// Handle characteristic grouping text change
function onCharacteristicChange(tocID: number, value: string) {
  // Update the characteristic in the chapter 07 data
  const ch07 = store.chapters['07'];
  if (ch07?.characteristics) {
    const char = ch07.characteristics.find((c: any) => c.TOC_ID === tocID);
    if (char) {
      char.Grouping_Text = value;
      // Save individual characteristic grouping text
      saveCharacteristicGroupingText(tocID, value);
      markDirty();
    }
  }
}

// Debounced save for individual characteristic
let characteristicSaveTimers: Record<number, ReturnType<typeof setTimeout>> = {};

function saveCharacteristicGroupingText(tocID: number, value: string) {
  // Clear previous timer for this characteristic
  if (characteristicSaveTimers[tocID]) {
    clearTimeout(characteristicSaveTimers[tocID]);
  }

  // Debounce save by 1 second
  characteristicSaveTimers[tocID] = setTimeout(async () => {
    try {
      const tgId = store.currentTgId;
      // Update the characteristic's Grouping_Text field directly
      await editorApi.updateCharacteristic(tgId!, tocID, {
        Grouping_Text: value
      });
    } catch (error) {
      console.error('Failed to save characteristic grouping text:', error);
      errorMessage.value = 'Failed to save changes';
      setTimeout(() => errorMessage.value = '', 3000);
    }
  }, 1000);
}

// Handle summary text change with autosave
function onSummaryChange(value: string) {
  groupingSummaryText.value = value;
  store.autosave('05', 'GroupingSummaryText', value);
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
      <!-- Grouping Characteristics Table -->
      <Card elevation="low" style="margin-bottom: 16px">
        <div style="display: flex; flex-direction: column; gap: 16px">
          <!-- Error State -->
          <div v-if="errorMessage" style="color: #D32F2F; padding: 12px; background: #FFEBEE; border-radius: 4px">
            ⚠ {{ errorMessage }}
          </div>

          <!-- Characteristics Table -->
          <div v-else-if="characteristics.length > 0">
            <Table>
              <thead>
                <tr>
                  <th style="width: 10%">Seq. No.</th>
                  <th style="width: 25%">Characteristic Name</th>
                  <th style="width: 65%">Grouping Text</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="char in characteristics" 
                  :key="char.TOC_ID"
                >
                  <td>{{ char.CharacteristicOrder }}</td>
                  <td><div v-html="char.TOC_Name"></div></td>
                  <td>
                    <div style="padding: 8px 0">
                      <Editor
                        :model-value="char.Grouping_Text || ''"
                        :api-key="apiKey"
                        :init="{ ...init, height: 150 }"
                        :disabled="!canEdit"
                        @update:model-value="(val) => onCharacteristicChange(char.TOC_ID, val)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>

          <!-- No Characteristics Message -->
          <div v-else style="text-align: center; padding: 20px; color: #666">
            No grouping characteristics found
          </div>
        </div>
      </Card>

      <!-- Grouping Summary -->
      <Card elevation="low">
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div>
            <h2 style="font-size: 18px; font-weight: 700; color: var(--color-neutral-800); line-height: 22px">
              Grouping Summary
            </h2>
   <!--         <p style="font-size: 14px; font-weight: 400; color: #606060; line-height: 20px; margin-top: 8px">
              Additional text identifying grouping characteristics and their states of expression
              that can be used to organise the growing trial for assessment of distinctness.
            </p> -->
          </div>
          <Editor
            :model-value="groupingSummaryText"
            :api-key="apiKey"
            :init="init"
            @update:model-value="onSummaryChange"
          />
        </div>
      </Card>


    </template>

    <!-- Preview Section -->
    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>
</template>

<style scoped>
/* Custom styling for TinyMCE editors in table */
:deep(.tox-tinymce) {
  border-radius: 4px;
}

:deep(td) {
  vertical-align: top;
}
</style>