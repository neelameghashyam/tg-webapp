<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { PageHeader, Select, DataTable, Button, Modal, Input, Textarea, Alert, ConfirmDialog, ActionMenu, useConfirmDialog } from '@upov/upov-ui';
import type { DataTableColumn, SelectOption, ActionMenuItem } from '@upov/upov-ui';

const { confirm } = useConfirmDialog();
import api from '@/services/api';

interface AswDetail {
  id: number;
  aswId: number;
  aswName: string;
  code: string;
  subCode: string;
  alternative: string;
  description: string | null;
  descriptionMushroom: string | null;
}

interface AswOptions {
  names: string[];
  codes: string[];
  subCodes: string[];
  alternatives: string[];
  usedNames: string[];
}

// Data
const items = ref<AswDetail[]>([]);
const options = ref<AswOptions>({ names: [], codes: [], subCodes: [], alternatives: [], usedNames: [] });
const loading = ref(false);
const selectedName = ref('');

async function fetchOptions() {
  try {
    const res = await api.get<AswOptions>('/api/admin/asw-data/options');
    options.value = res.data;
    if (options.value.usedNames.length > 0) {
      selectedName.value = options.value.usedNames[0];
    }
  } catch (err) {
    console.error('Failed to fetch ASW options:', err);
  }
}

async function fetchItems() {
  if (!selectedName.value) return;
  loading.value = true;
  try {
    const res = await api.get<{ items: AswDetail[] }>('/api/admin/asw-data', {
      params: { name: selectedName.value },
    });
    items.value = res.data.items;
  } catch (err) {
    console.error('Failed to fetch ASW data:', err);
  } finally {
    loading.value = false;
  }
}

watch(selectedName, () => fetchItems());
onMounted(() => fetchOptions());

const usedNameOptions = computed<SelectOption[]>(() =>
  options.value.usedNames.map((n) => ({ value: n, label: n })),
);

const codeOptions = computed<SelectOption[]>(() =>
  options.value.codes.map((c) => ({ value: c, label: c })),
);

const subCodeOptions = computed<SelectOption[]>(() =>
  [{ value: '-1', label: 'None' }, ...options.value.subCodes.map((s) => ({ value: s, label: s }))],
);

const alternativeOptions = computed<SelectOption[]>(() =>
  [{ value: '-1', label: 'None' }, ...options.value.alternatives.map((a) => ({ value: a, label: a }))],
);

const allNameOptions = computed<SelectOption[]>(() =>
  options.value.names.map((n) => ({ value: n, label: n })),
);

function formatCode(value: string | null): string {
  if (!value || value === '-1') return '-';
  return value;
}

// Table columns
const columns: DataTableColumn[] = [
  { key: 'code', label: 'Code', width: '80px' },
  { key: 'subCode', label: 'Sub Code', width: '80px' },
  { key: 'alternative', label: 'Alternative', width: '120px' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: '', width: '48px' },
];

// Edit modal
const showEditModal = ref(false);
const editItem = ref<AswDetail | null>(null);
const editForm = ref({ description: '', descriptionMushroom: '' });
const saving = ref(false);
const editError = ref('');

function openEdit(row: AswDetail) {
  editItem.value = row;
  editForm.value = {
    description: row.description || '',
    descriptionMushroom: row.descriptionMushroom || '',
  };
  editError.value = '';
  showEditModal.value = true;
}

async function saveEdit() {
  if (!editItem.value) return;
  saving.value = true;
  editError.value = '';
  try {
    await api.patch(`/api/admin/asw-data/${editItem.value.id}`, editForm.value);
    showEditModal.value = false;
    await fetchItems();
  } catch (err) {
    console.error('Save error:', err);
    editError.value = 'Failed to save changes.';
  } finally {
    saving.value = false;
  }
}

async function deleteItem(row: AswDetail) {
  const ok = await confirm({
    title: 'Delete ASW Entry',
    message: `Are you sure you want to delete this entry for ${row.aswName}?`,
    confirmLabel: 'Delete',
    variant: 'danger',
  });
  if (!ok) return;
  try {
    await api.delete(`/api/admin/asw-data/${row.id}`);
    await fetchItems();
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// Create modal
const showCreateModal = ref(false);
const createForm = ref({
  aswName: '',
  code: '-1',
  subCode: '-1',
  alternative: '-1',
  description: '',
  descriptionMushroom: '',
});
const creating = ref(false);
const createError = ref('');

function openCreate() {
  createForm.value = {
    aswName: selectedName.value || '',
    code: '-1',
    subCode: '-1',
    alternative: '-1',
    description: '',
    descriptionMushroom: '',
  };
  createError.value = '';
  showCreateModal.value = true;
}

async function saveCreate() {
  if (!createForm.value.aswName) {
    createError.value = 'ASW Name is required.';
    return;
  }
  creating.value = true;
  createError.value = '';
  try {
    await api.post('/api/admin/asw-data', createForm.value);
    showCreateModal.value = false;
    await fetchOptions();
    if (selectedName.value === createForm.value.aswName) {
      await fetchItems();
    } else {
      selectedName.value = createForm.value.aswName;
    }
  } catch (err: any) {
    console.error('Create error:', err);
    if (err.response?.status === 409) {
      createError.value = 'This combination already exists.';
    } else {
      createError.value = 'Failed to create entry.';
    }
  } finally {
    creating.value = false;
  }
}

const rowActions: ActionMenuItem[] = [
  { id: 'edit', label: 'Edit', icon: 'pencil' },
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
];

function onRowAction(item: ActionMenuItem, row: AswDetail) {
  if (item.id === 'edit') openEdit(row);
  if (item.id === 'delete') deleteItem(row);
}
</script>

<template>
  <div class="asw-page">
    <PageHeader
      title="ASW Data"
      subtitle="Manage Additional Standard Wording text templates"
      :actions="[{ id: 'create', label: 'New Entry', icon: 'plus-lg', variant: 'primary' }]"
      @action="openCreate"
    />

    <div class="asw-toolbar">
      <Select
        v-model="selectedName"
        :options="usedNameOptions"
        placeholder="Select ASW name..."
      />
    </div>

    <div class="table-section">
      <DataTable
        :columns="columns"
        :rows="items"
        row-key="id"
        :loading="loading"
        hoverable
        empty-message="No entries for this ASW name."
      >
        <template #cell-code="{ row }">
          <code>{{ formatCode(row.code) }}</code>
        </template>

        <template #cell-subCode="{ row }">
          <code>{{ formatCode(row.subCode) }}</code>
        </template>

        <template #cell-alternative="{ row }">
          {{ formatCode(row.alternative) }}
        </template>

        <template #cell-description="{ row }">
          <span class="desc-preview">{{ row.description || '-' }}</span>
        </template>

        <template #cell-actions="{ row }">
          <ActionMenu :items="rowActions" @select="onRowAction($event, row as AswDetail)" />
        </template>
      </DataTable>
    </div>

    <!-- Edit Modal -->
    <Modal v-model:open="showEditModal" :title="`Edit ${editItem?.aswName}`" max-width="720px">
      <template v-if="editItem">
        <Alert v-if="editError" variant="error" class="modal-alert">{{ editError }}</Alert>

        <div class="edit-meta">
          <span v-if="editItem.code !== '-1'"><strong>Code:</strong> {{ editItem.code }}</span>
          <span v-if="editItem.subCode !== '-1'"><strong>Sub Code:</strong> {{ editItem.subCode }}</span>
          <span v-if="editItem.alternative !== '-1'"><strong>Alternative:</strong> {{ editItem.alternative }}</span>
        </div>

        <div class="form-grid">
          <Textarea
            v-model="editForm.description"
            label="Description"
            placeholder="ASW description text..."
            :rows="8"
          />
          <Textarea
            v-model="editForm.descriptionMushroom"
            label="Description (Mushroom variant)"
            placeholder="Mushroom-specific variant..."
            :rows="4"
          />
        </div>
      </template>
      <template #footer>
        <Button type="primary" size="small" :disabled="saving" @click="saveEdit">
          {{ saving ? 'Saving...' : 'Save' }}
        </Button>
      </template>
    </Modal>

    <!-- Create Modal -->
    <Modal v-model:open="showCreateModal" title="New ASW Entry" max-width="640px">
      <Alert v-if="createError" variant="error" class="modal-alert">{{ createError }}</Alert>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">ASW Name</label>
          <Select v-model="createForm.aswName" :options="allNameOptions" label="ASW Name" placeholder="Select ASW name" />
        </div>
        <div class="form-row-trio">
          <div class="form-field">
            <label class="form-label">Code</label>
            <Select v-model="createForm.code" :options="codeOptions" label="Code" />
          </div>
          <div class="form-field">
            <label class="form-label">Sub Code</label>
            <Select v-model="createForm.subCode" :options="subCodeOptions" label="Sub Code" />
          </div>
          <div class="form-field">
            <label class="form-label">Alternative</label>
            <Select v-model="createForm.alternative" :options="alternativeOptions" label="Alternative" />
          </div>
        </div>
        <Textarea
          v-model="createForm.description"
          label="Description"
          placeholder="ASW description text..."
          :rows="6"
        />
        <Textarea
          v-model="createForm.descriptionMushroom"
          label="Description (Mushroom variant)"
          placeholder="Optional mushroom-specific variant..."
          :rows="3"
        />
      </div>
      <template #footer>
        <Button type="secondary" size="small" @click="showCreateModal = false">Cancel</Button>
        <Button type="primary" size="small" :disabled="creating" @click="saveCreate">
          {{ creating ? 'Creating...' : 'Create' }}
        </Button>
      </template>
    </Modal>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
.asw-page {
  max-width: 1400px;
  margin: 0 auto;
}

.asw-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  max-width: 240px;
}

.table-section {
  background: var(--color-bg-white);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.desc-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.85rem;
  line-height: 1.4;
}

.modal-alert {
  margin-bottom: 16px;
}

.edit-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row-trio {
  display: flex;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #303030);
}
</style>
