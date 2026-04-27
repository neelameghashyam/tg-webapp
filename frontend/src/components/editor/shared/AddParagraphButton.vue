<script setup lang="ts">
import { ref } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Button } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { useTinymce } from '@/composables/useTinymce';

const store = useEditorStore();
const { apiKey, init } = useTinymce({ height: 150 });

const adding = ref(false);
const newParagraph = ref<{ Sub_Add_Id: number; Sub_Add_Info: string } | null>(null);

async function handleAdd() {
  adding.value = true;
  try {
    const result = await store.addParagraph(0);
    newParagraph.value = result;
  } catch (err) {
    console.error('Failed to add paragraph:', err);
  } finally {
    adding.value = false;
  }
}

function handleContentChange(id: number, content: string) {
  store.updateParagraph(id, content);
}

async function handleRemove(id: number) {
  await store.removeParagraph(id);
  if (newParagraph.value?.Sub_Add_Id === id) {
    newParagraph.value = null;
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 12px">
    <!-- Existing paragraphs for this section -->
    <div
      v-for="p in store.paragraphs"
      :key="p.Sub_Add_Id"
      style="display: flex; gap: 8px; align-items: flex-start"
    >
      <div style="flex: 1; min-width: 0">
        <Editor
          :model-value="p.Sub_Add_Info || ''"
          :api-key="apiKey"
          :init="init"
          @update:model-value="handleContentChange(p.Sub_Add_Id, $event)"
        />
      </div>
      <Button type="danger" size="small" icon-left="x-lg" @click="handleRemove(p.Sub_Add_Id)" />
    </div>

    <!-- Add button (limit: 1 paragraph) -->
    <Button v-if="store.paragraphs.length === 0" type="secondary" icon-left="plus-lg" :disabled="adding" @click="handleAdd">
      {{ adding ? 'Adding...' : 'Add Paragraph' }}
    </Button>
  </div>
</template>
