<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button, Card, Input, Table, ReorderTable } from '@upov/upov-ui';
import type { ReorderTableColumn, ReorderTableGroup } from '@upov/upov-ui';
import ChapterPreview from '@/components/editor/shared/ChapterPreview.vue';
import AddCharacteristics from '@/components/editor/shared/AddCharacteristics.vue';
import { useEditorStore } from '@/stores/editor';
import { editorApi } from '@/services/editor-api';
import { useChapterPreview } from '@/composables/useChapterPreview';
import type { Characteristic, AdoptedSearchResult } from '@/types/editor';

const store = useEditorStore();
const { previewHtml, previewLoading, previewError, needsRefresh, markDirty, handleRefresh } = useChapterPreview('07');

const data = computed(() => store.chapters['07'] || {});
const characteristics = computed<Characteristic[]>(() => data.value?.characteristics ?? []);

// ── Search adopted ────────────────────────────────────────────────────────────
const searchQuery = ref('');
const searchResults = ref<AdoptedSearchResult[]>([]);
const searchDone = ref(false);
const searching = ref(false);

async function doSearch() {
  const q = searchQuery.value.trim();
  if (!q) return;
  searching.value = true;
  searchDone.value = false;
  try {
    searchResults.value = await editorApi.searchAdopted(store.tgId!, q);
    searchDone.value = true;
  } catch (err) {
    console.error('Search error:', err);
    searchResults.value = [];
    searchDone.value = true;
  } finally {
    searching.value = false;
  }
}

function clearSearch() {
  searchQuery.value = '';
  searchResults.value = [];
  searchDone.value = false;
}

async function importAdopted(result: AdoptedSearchResult) {
  try {
    await editorApi.createCharacteristic(store.tgId!, {
      TOC_Name: result.name,
      Expression_Type: result.type,
      ObservationM_PlotT: result.methods,
      IsAdoptedTG: 'Y',
    });
    await refreshCharacteristics();
    searchResults.value = searchResults.value.filter((r) => r.id !== result.id);
    markDirty();
  } catch (err) {
    console.error('Import error:', err);
  }
}

async function refreshCharacteristics() {
  const res = await editorApi.open(store.tgId!);
  store.chapters['07'] = res.chapters['07'];
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
const editingChar = ref<Characteristic | null>(null);
const showModal = ref(false);
const saving = ref(false);

function openAddModal() {
  editingChar.value = null;
  showModal.value = true;
}

function openEditModal(char: Characteristic) {
  editingChar.value = char;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingChar.value = null;
}

const modalInitialData = computed(() => {
  if (!editingChar.value) return undefined;
  const c = editingChar.value;
  const methodStr = c.ObservationM_PlotT ?? '';
  return {
    asterics: c.Asterisk === 'Y',
    grouping: c.Grouping === 'Y',
    tq5: c.Add_To_TQ5 === 'Y',
    name: c.TOC_Name,
    typeOfExpression: c.Expression_Type,
    growthStage: c.GROWTH_STAGES ?? '',
    methods: {
      MG: methodStr.includes('MG'),
      MS: methodStr.includes('MS'),
      VG: methodStr.includes('VG'),
      VS: methodStr.includes('VS'),
      OTHER: methodStr.includes('OTHER'),
    },
    mgPlotType: '',
    msPlotType: '',
    states: c.expressions.length
      ? c.expressions.map((e, i) => ({
          id: String(i),
          expression: e.State_of_Expression ?? '',
          notes: e.Expression_Notes ? String(e.Expression_Notes) : null,
          exampleVarieties: e.Example_Varieties ? [e.Example_Varieties] : [],
        }))
      : undefined,
    explanation: '',
  };
});

async function onSave(formData: {
  asterics: boolean;
  grouping: boolean;
  tq5: boolean;
  name: string;
  typeOfExpression: string;
  growthStage: string;
  methods: { MG: boolean; MS: boolean; VG: boolean; VS: boolean; OTHER: boolean };
  states: { expression: string; notes: string | null; exampleVarieties: string[] }[];
}) {
  saving.value = true;
  try {
    const methodParts: string[] = [];
    if (formData.methods.MG) methodParts.push('MG');
    if (formData.methods.MS) methodParts.push('MS');
    if (formData.methods.VG) methodParts.push('VG');
    if (formData.methods.VS) methodParts.push('VS');
    if (formData.methods.OTHER) methodParts.push('OTHER');
    const methodsStr = methodParts.join('/');

    const payload: Record<string, string> = {
      TOC_Name: formData.name,
      Expression_Type: formData.typeOfExpression,
      ObservationM_PlotT: methodsStr,
      GROWTH_STAGES: formData.growthStage,
      Asterisk: formData.asterics ? 'Y' : 'N',
      Grouping: formData.grouping ? 'Y' : 'N',
      Add_To_TQ5: formData.tq5 ? 'Y' : 'N',
    };

    if (editingChar.value) {
      const charId = editingChar.value.TOC_ID;
      await editorApi.updateCharacteristic(store.tgId!, charId, payload);
      const oldExpressions = editingChar.value.expressions;
      for (const expr of oldExpressions) {
        await editorApi.deleteExpression(store.tgId!, charId, expr.ExpressionNote_ID);
      }
      for (const state of formData.states) {
        if (state.expression.trim()) {
          await editorApi.createExpression(store.tgId!, charId, {
            State_of_Expression: state.expression,
            Expression_Notes: state.notes ? Number(state.notes) : null,
            Example_Varieties: state.exampleVarieties.join(', '),
          });
        }
      }
    } else {
      const newChar = await editorApi.createCharacteristic(store.tgId!, payload);
      const newCharId = newChar?.TOC_ID ?? newChar?.id;
      if (newCharId) {
        for (const state of formData.states) {
          if (state.expression.trim()) {
            await editorApi.createExpression(store.tgId!, newCharId, {
              State_of_Expression: state.expression,
              Expression_Notes: state.notes ? Number(state.notes) : null,
              Example_Varieties: state.exampleVarieties.join(', '),
            });
          }
        }
      }
    }

    await refreshCharacteristics();
    markDirty();
    closeModal();
  } catch (err) {
    console.error('Save error:', err);
  } finally {
    saving.value = false;
  }
}

async function onDelete(group: ReorderTableGroup) {
  try {
    await editorApi.deleteCharacteristic(store.tgId!, group.id as number);
    await refreshCharacteristics();
    markDirty();
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// ── ReorderTable ──────────────────────────────────────────────────────────────
const columns: ReorderTableColumn[] = [
  { key: 'english', label: 'English' },
  { key: 'example', label: 'Example Varieties' },
  { key: 'notes', label: 'Notes', width: '80px', align: 'center' },
];

const groups = computed<ReorderTableGroup[]>(() =>
  characteristics.value.map((c) => ({
    id: c.TOC_ID,
    badges: [c.Expression_Type, c.ObservationM_PlotT].filter(Boolean),
    title: c.TOC_Name,
    asterisk: c.Asterisk === 'Y',
    rows: c.expressions.map((e) => ({
      english: e.State_of_Expression,
      example: e.Example_Varieties,
      notes: e.Expression_Notes,
    })),
  }))
);

async function onReorder(newGroups: ReorderTableGroup[]) {
  const order = newGroups.map((g, i) => ({ TOC_ID: g.id as number, CharacteristicOrder: i + 1 }));
  await editorApi.reorderCharacteristics(store.tgId!, order);
  await refreshCharacteristics();
  markDirty();
}

function onTitleClick(group: ReorderTableGroup) {
  const char = characteristics.value.find((c) => c.TOC_ID === group.id);
  if (char) openEditModal(char);
}
</script>

<template>
  <ChapterPreview
    :loading="previewLoading"
    :needs-refresh="needsRefresh"
    @refresh="handleRefresh"
  >
    <template #edit>
      <div style="display: flex; flex-direction: column; gap: 24px">
        <!-- Search adopted -->
        <Card elevation="low">
          <h2 style="font-size: 18px; font-weight: 700; color: var(--color-neutral-800); line-height: 22px">
            Search adopted characteristics
          </h2>
          <div style="display: flex; gap: 8px; align-items: center">
            <Input
              v-model="searchQuery"
              type="search"
              placeholder="Search by name..."
              style="flex: 1; min-width: 0"
              @keyup.enter="doSearch"
            />
            <Button type="primary" :disabled="searching || !searchQuery.trim()" @click="doSearch">
              {{ searching ? 'Searching...' : 'Search' }}
            </Button>
            <Button v-if="searchDone" type="secondary" @click="clearSearch">Clear</Button>
          </div>

          <template v-if="searchDone">
            <div v-if="searchResults.length > 0" style="margin-top: 16px">
              <Table>
                <thead>
                  <tr>
                    <th>Name</th><th>Genus</th><th>Type</th><th>Methods</th><th>TG Ref</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in searchResults" :key="r.id">
                    <td><span v-html="r.name" /></td>
                    <td>{{ r.genus }}</td>
                    <td>{{ r.type }}</td>
                    <td>{{ r.methods }}</td>
                    <td>{{ r.tgRef }}</td>
                    <td><Button type="primary" size="small" @click="importAdopted(r)">Import</Button></td>
                  </tr>
                </tbody>
              </Table>
            </div>
            <p v-else style="font-size: 14px; color: var(--color-neutral-500); margin-top: 12px">No results found.</p>
          </template>
        </Card>

        <!-- Characteristics + Expressions -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
            <h2 style="font-size: 16px; font-weight: 700; color: var(--color-neutral-800); line-height: 20px">
              List of Characteristics ({{ characteristics.length }})
            </h2>
            <Button v-if="store.canEdit" type="primary" size="small" @click="openAddModal">
              + Add characteristic
            </Button>
          </div>
          <ReorderTable
            v-if="characteristics.length > 0"
            :columns="columns"
            :groups="groups"
            :reorderable="store.canEdit"
            :deletable="store.canEdit"
            @update:groups="onReorder"
            @delete="onDelete"
            @titleClick="onTitleClick"
          />
          <p v-else style="font-size: 14px; color: var(--color-neutral-500)">No characteristics added yet.</p>
        </div>
      </div>
    </template>

    <div v-if="previewError" style="color: #D32F2F; font-size: 13px">⚠ {{ previewError }}</div>
    <div v-else-if="previewHtml" v-html="previewHtml" />
  </ChapterPreview>

  <!-- Add / Edit Characteristic Modal (outside ChapterPreview — it uses fixed positioning) -->
  <AddCharacteristics
    v-if="showModal"
    :mode="editingChar ? 'edit' : 'add'"
    :initial-data="modalInitialData"
    @exit="closeModal"
    @save="onSave"
  />
</template>