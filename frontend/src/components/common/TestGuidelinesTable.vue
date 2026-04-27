<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DataTable, StatusBadge, ActionMenu, Badge } from '@upov/upov-ui';
import type { DataTableColumn, DataTableSortState, StatusBadgeVariant, ActionMenuItem } from '@upov/upov-ui';
import type { TGStatus, TestGuidelineListItem } from '@/types';

interface StatusOption {
  value: string;
  label: string;
}

/**
 * A row-level action item used by the dynamic getRowActions prop.
 * Handler closures are provided by the parent view; the table just calls them.
 */
interface RowAction {
  label: string;
  handler: () => void;
  disabled?: boolean;
}

interface Props {
  items?: TestGuidelineListItem[];
  loading?: boolean;
  selectedId?: number | null;
  filterValues?: Record<string, string>;
  sortState?: DataTableSortState;
  statusOptions?: StatusOption[];
  statusLabel?: string;
  /** Static action list — legacy path for views that don't need per-row logic. */
  actions?: ActionMenuItem[];
  /**
   * Per-row dynamic action factory.
   * Receives the minimal row shape needed to decide which actions to show.
   * When provided, takes precedence over the static `actions` prop.
   * Returns an empty array to hide the menu entirely for a given row.
   */
  getRowActions?: (tg: { id: number; status: string; reference: string }) => RowAction[];
  /**
   * ID of the row currently executing an async action.
   * That row's menu is replaced with a spinner to prevent double-clicks.
   */
  actionLoadingId?: number | null;
  dateColumn?: { key: string; label: string };
  showDeadlineColumn?: boolean;
  showUpovCodesColumn?: boolean;
  selectable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchDebounce?: number;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  loading: false,
  selectedId: null,
  filterValues: () => ({}),
  sortState: undefined,
  statusOptions: () => [],
  statusLabel: 'Status (Period)',
  actions: () => [],
  getRowActions: undefined,
  actionLoadingId: null,
  dateColumn: () => ({ key: 'lastUpdated', label: 'Last Updated' }),
  showDeadlineColumn: false,
  showUpovCodesColumn: false,
  selectable: true,
  searchable: false,
  searchPlaceholder: 'Search...',
  searchDebounce: 300,
});

const emit = defineEmits<{
  select: [id: number];
  action: [actionId: string, tgId: number];
  'update:filterValues': [values: Record<string, string>];
  filter: [values: Record<string, string>];
  sort: [state: DataTableSortState];
  search: [value: string];
}>();

const router = useRouter();

// ── Column definitions ────────────────────────────────────────────────────────

/**
 * Whether this instance needs an action column at all.
 * True when either the dynamic factory or the static list is provided.
 * When false, no ⋮ column is added — keeping the table clean for read-only views.
 */
const hasActions = computed(
  () => !!props.getRowActions || props.actions.length > 0,
);

const columns = computed<DataTableColumn[]>(() => {
  const cols: DataTableColumn[] = [
    { key: 'reference', label: 'TG Reference', width: '180px' },
    { key: 'name', label: 'Common Name', width: '180px' },
  ];
  if (props.showUpovCodesColumn) {
    cols.push({ key: 'upovCodes', label: 'UPOV Code(s)', width: '160px' });
  }
  cols.push({ key: 'leadExpert', label: 'Leading Expert', width: '200px' });
  if (props.statusOptions.length) {
    cols.push({
      key: 'status',
      label: props.statusLabel,
      width: '160px',
      filterable: true,
      filterType: 'select',
      filterOptions: props.statusOptions,
    });
  }
  if (props.showDeadlineColumn) {
    cols.push({ key: 'periodEnd', label: 'Deadline', width: '120px' });
  }
  cols.push({
    key: props.dateColumn.key,
    label: props.dateColumn.label,
    width: '140px',
    sortable: true,
  });
  // Actions column — must be declared here so DataTable renders the cell slot.
  // Without this entry the #cell-actions slot is never mounted.
  if (hasActions.value) {
    cols.push({ key: 'actions', label: '', width: '48px' });
  }
  return cols;
});

import { STATUS_LABELS, STATUS_VARIANTS } from '@/config/constants';

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Action menu resolution ────────────────────────────────────────────────────

/**
 * Resolve the ActionMenuItem[] to pass to <ActionMenu> for a given row.
 *
 * Dynamic path (getRowActions provided):
 *   Calls the per-row factory with { id, status, reference }.
 *   Maps the RowAction[] (handler-closure based) to ActionMenuItem[]
 *   using a synthetic "row-action-{index}" id so ActionMenu is satisfied.
 *   Returns [] when the factory decides no actions apply to this row —
 *   the template uses v-else-if so no stray ⋮ appears for those rows.
 *
 * Static path (legacy):
 *   Returns the static `actions` prop unchanged.
 */
function resolveMenuItems(row: Record<string, any>): ActionMenuItem[] {
  if (props.getRowActions) {
    const rowActions = props.getRowActions({
      id:        row.id,
      status:    row.status,
      reference: row.reference ?? '',
    });
    return rowActions.map((a, i) => ({
      id:       `row-action-${i}`,
      label:    a.label,
      disabled: a.disabled ?? false,
    }));
  }
  return props.actions;
}

/**
 * Handle a menu item selection.
 *
 * Dynamic path: item.id is "row-action-{index}" — parse the index, find the
 *   original RowAction from the factory, and call its handler closure.
 *
 * Static path: router-push for 'edit', then emit 'action' for anything else.
 */
function onRowActionSelect(item: ActionMenuItem, row: Record<string, any>) {
  if (props.getRowActions) {
    const rowActions = props.getRowActions({
      id:        row.id,
      status:    row.status,
      reference: row.reference ?? '',
    });
    const idx = parseInt((item.id as string).replace('row-action-', ''), 10);
    rowActions[idx]?.handler();
    return;
  }
  // Static actions fallback
  if (item.id === 'edit') {
    router.push(`/admin/test-guidelines/${row.id}`);
  }
  emit('action', item.id as string, row.id);
}

// ── DataTable ref / expose ────────────────────────────────────────────────────

const dataTableRef = ref<InstanceType<typeof DataTable> | null>(null);

function toggleFilters(colKey?: string) {
  dataTableRef.value?.toggleFilters(colKey);
}

function focusSearch() {
  dataTableRef.value?.focusSearch();
}

defineExpose({ toggleFilters, focusSearch });

function onRowClick(row: Record<string, any>) {
  emit('select', row.id);
}
</script>

<template>
  <DataTable
    ref="dataTableRef"
    :columns="columns"
    :rows="items"
    row-key="id"
    :selectable="selectable"
    :selected-row-key="selectable ? selectedId : undefined"
    :loading="loading"
    :loading-rows="8"
    appearance="card"
    filter-mode="remote"
    :filter-values="filterValues"
    :sort-state="sortState"
    :searchable="searchable"
    :search-placeholder="searchPlaceholder"
    :search-debounce="searchDebounce"
    empty-message="No test guidelines found."
    @row-click="onRowClick"
    @update:filter-values="(vals: Record<string, string>) => emit('update:filterValues', vals)"
    @filter="(vals: Record<string, string>) => emit('filter', vals)"
    @sort="(state: DataTableSortState) => emit('sort', state)"
    @search="(value: string) => emit('search', value)"
  >
    <template #cell-reference="{ row }">
      <RouterLink
        :to="{ path: '/admin/settings/tg-management', query: { tgId: row.id } }"
        class="tg-link"
        @click.stop
      >
        {{ row.reference }}
      </RouterLink>
    </template>

    <template #cell-upovCodes="{ row }">
      <div v-if="row.upovCodes?.length" class="upov-codes">
        <Badge
          v-for="code in row.upovCodes"
          :key="code"
          :label="code"
          variant="code"
          size="small"
        />
      </div>
    </template>

    <template #cell-leadExpert="{ row }">
      <template v-if="row.leadExpert">
        {{ row.leadExpert }}
        <span v-if="row.leadExpertCountry" class="expert-country">
          ({{ row.leadExpertCountry }})
        </span>
      </template>
    </template>

    <template #cell-status="{ row }">
      <div class="status-cell">
        <StatusBadge
          :label="STATUS_LABELS[row.status as TGStatus] || row.status"
          :variant="(STATUS_VARIANTS[row.status as TGStatus] || 'neutral') as StatusBadgeVariant"
        />
        <span
          v-if="!showDeadlineColumn && (row.periodStart || row.periodEnd)"
          class="status-period"
        >
          ({{ formatDate(row.periodStart) }} – {{ formatDate(row.periodEnd) }})
        </span>
      </div>
    </template>

    <template #cell-periodEnd="{ row }">
      {{ formatDate(row.periodEnd) }}
    </template>

    <template #cell-lastUpdated="{ row }">
      {{ formatDate(row.lastUpdated) }}
    </template>

    <template #cell-adoptionDate="{ row }">
      {{ formatDate(row.adoptionDate) }}
    </template>

    <template #cell-statusDate="{ row }">
      {{ formatDate(row.statusDate) }}
    </template>

    <!--
      Actions cell — only mounted when hasActions is true (column declared above).

      Three states per row:
        1. actionLoadingId === row.id  → spinner (action in-flight, no double-click)
        2. resolveMenuItems() non-empty → ⋮ ActionMenu
        3. resolveMenuItems() is []    → nothing rendered (row has no applicable actions)
    -->
    <template v-if="hasActions" #cell-actions="{ row }">
      <!-- Spinner while this specific row's action is executing -->
      <div v-if="actionLoadingId === row.id" class="row-action-spinner" aria-label="Loading…">
        <span class="spinner" />
      </div>

      <!-- Per-row action menu when idle -->
      <ActionMenu
        v-else-if="resolveMenuItems(row).length"
        :items="resolveMenuItems(row)"
        @select="(item: ActionMenuItem) => onRowActionSelect(item, row)"
      />
    </template>

    <template #row-detail="{ row, index }">
      <slot name="row-detail" :row="row" :index="index" />
    </template>

    <template #pagination>
      <slot name="pagination" />
    </template>
  </DataTable>
</template>

<style scoped>
.expert-country {
  color: var(--color-text-secondary);
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.status-period {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.upov-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ── Row-level action loading spinner ────────────────────────────────────── */

.row-action-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border-secondary);
  border-top-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>