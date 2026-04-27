<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import { useAuthStore } from '@/stores/auth';
import { PaginationNav, SidePanelLayout, ConfirmDialog, useConfirmDialog } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';
import { TC_EDC_DRAFTING_STATUSES } from '@/config/constants';
import api from '@/services/api';

const router = useRouter();
const authStore = useAuthStore();
const { confirm } = useConfirmDialog();

const tcCards: TwpCard[] = [
  { code: 'all',    label: 'All' },
  { code: 'TC',     label: 'TC' },
  { code: 'TC-EDC', label: 'TC-EDC' },
];

const filterValues  = ref<Record<string, string>>({});
const actionLoading = ref<number | null>(null);
const actionError   = ref<string | null>(null);

// ── Move to EDC Comments modal state ─────────────────────────────────────────
const edcModalOpen   = ref(false);
const edcModalTgId   = ref<number | null>(null);
const edcModalRef    = ref('');
const edcStartDate   = ref('');
const edcEndDate     = ref('');
const edcModalError  = ref('');
const edcModalSaving = ref(false);

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

function openEdcModal(tgId: number, reference: string) {
  edcModalTgId.value  = tgId;
  edcModalRef.value   = reference;
  edcStartDate.value  = defaultStartDate();
  edcEndDate.value    = '';
  edcModalError.value = '';
  edcModalOpen.value  = true;
}

function closeEdcModal() {
  edcModalOpen.value = false;
  edcModalTgId.value = null;
}

async function confirmEdcModal() {
  edcModalError.value = '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(edcStartDate.value);
  const end   = new Date(edcEndDate.value);

  if (!edcStartDate.value || !edcEndDate.value) { edcModalError.value = 'Both dates are required.'; return; }
  if (start <= today)  { edcModalError.value = 'Start date must be in the future.'; return; }
  if (end   <= start)  { edcModalError.value = 'End date must be after start date.'; return; }

  edcModalSaving.value = true;
  try {
    await api.patch(`/api/admin/test-guidelines/${edcModalTgId.value}/edc-comments`, {
      startDate: edcStartDate.value,
      endDate:   edcEndDate.value,
    });
    closeEdcModal();
    load();
  } catch (err: any) {
    edcModalError.value = err?.response?.data?.error?.message ?? 'Failed to save dates. Please try again.';
    console.error('EDC comments date save failed:', err);
  } finally {
    edcModalSaving.value = false;
  }
}

// ── Make Copy for Discussion (STU → TDD) ─────────────────────────────────────
async function onCopyForDiscussion(tgId: number) {
  const ok = await confirm({
    title: 'Make Copy for Discussion',
    message: 'A new TC Discussion Draft will be created and this TG will be archived.',
    variant: 'default',
  });
  if (!ok) return;

  actionLoading.value = tgId;
  actionError.value = null;
  try {
    await api.post(`/api/admin/test-guidelines/${tgId}/copy-for-discussion`);
    load();
  } catch (err: any) {
    actionError.value = err?.response?.data?.error?.message ?? 'Failed to create discussion copy.';
    console.error('Copy for discussion failed:', err);
  } finally {
    actionLoading.value = null;
  }
}

/**
 * Admin always gets Edit. Workflow actions depend on status.
 */
function getActions(tg: { id: number; status: string; reference: string }) {
  if (!authStore.isAdmin) return [];
  const actions = [
    { label: 'Edit', handler: () => router.push(`/admin/test-guidelines/${tg.id}`) },
  ];
  if (tg.status === 'TCD') {
    actions.push({ label: 'Move to EDC Comments', handler: () => openEdcModal(tg.id, tg.reference) });
  }
  if (tg.status === 'STU') {
    actions.push({ label: 'Make Copy for Discussion', handler: () => onCopyForDiscussion(tg.id) });
  }
  return actions;
}

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, load, onSearch, onSort, onPageChange, tableRef,
  panelOpen, onRowSelect, onPanelClose,
} = useTestGuidelinesList({
  tab: 'tc-edc-drafting',
  sortKey: 'lastUpdated',
  twpCountsKey: 'tcEdcDrafting',
  cards: tcCards,
  scope: 'tc',
  extraParams: () => {
    const extra: Record<string, string | number> = {};
    if (filterValues.value.status) extra.status_filter = filterValues.value.status;
    return extra;
  },
});

function onFilter(values: Record<string, string>) {
  filterValues.value = values;
  store.meta.page = 1;
  load();
}
</script>

<template>
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="tc-edc-drafting-view">
      <div v-if="actionError" class="action-error" role="alert">
        <span>{{ actionError }}</span>
        <button class="action-error-close" aria-label="Dismiss error" @click="actionError = null">×</button>
      </div>

      <TestGuidelinesTable
        ref="tableRef"
        :items="store.testGuidelines"
        :loading="store.loading"
        :selected-id="store.selectedTgId"
        :filter-values="filterValues"
        :sort-state="sortState"
        show-upov-codes-column
        :status-options="TC_EDC_DRAFTING_STATUSES"
        status-label="Status"
        searchable
        :search-placeholder="searchPlaceholder"
        :get-row-actions="authStore.isAdmin ? getActions : undefined"
        :action-loading-id="actionLoading"
        @select="onRowSelect"
        @update:filter-values="filterValues = $event"
        @filter="onFilter"
        @sort="onSort"
        @search="onSearch"
      >
        <template #pagination>
          <PaginationNav
            v-if="store.meta.total > store.meta.limit"
            :current-page="store.meta.page"
            :total-items="store.meta.total"
            :items-per-page="store.meta.limit"
            @page-change="onPageChange"
          />
        </template>
      </TestGuidelinesTable>
    </div>

    <template #panel>
      <TgDetailPanel @close="onPanelClose" />
    </template>
  </SidePanelLayout>

  <!-- Move to EDC Comments Modal -->
  <Teleport to="body">
    <div v-if="edcModalOpen" class="modal-backdrop" @click.self="closeEdcModal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="edc-modal-title">
        <div class="modal-header">
          <h2 id="edc-modal-title" class="modal-title">Move to EDC Comments</h2>
          <p class="modal-subtitle">{{ edcModalRef }}</p>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="edc-start-date" class="form-label">Start Date</label>
            <input id="edc-start-date" v-model="edcStartDate" type="date" class="form-input" />
            <p class="form-hint">Cron sends email reminders on this date. Must be in the future.</p>
          </div>
          <div class="form-field">
            <label for="edc-end-date" class="form-label">End Date <span class="required">*</span></label>
            <input id="edc-end-date" v-model="edcEndDate" type="date" class="form-input" />
            <p class="form-hint">TG transitions to STU the day after this date.</p>
          </div>
          <p v-if="edcModalError" class="form-error" role="alert">{{ edcModalError }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-tertiary" :disabled="edcModalSaving" @click="closeEdcModal">Cancel</button>
          <button class="btn btn-primary"   :disabled="edcModalSaving" @click="confirmEdcModal">
            <span v-if="edcModalSaving">Saving…</span><span v-else>Confirm</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Required: renders the confirmation dialog triggered by useConfirmDialog() -->
  <ConfirmDialog />
</template>

<style scoped>
.tc-edc-drafting-view { display: flex; flex-direction: column; gap: 16px; }

.action-error {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 10px 14px;
  background: var(--color-background-danger);
  border: 0.5px solid var(--color-border-danger);
  border-radius: var(--border-radius-md);
  font-size: 13px; color: var(--color-text-danger);
}
.action-error-close {
  flex-shrink: 0; background: none; border: none; cursor: pointer;
  font-size: 18px; line-height: 1; color: var(--color-text-danger); padding: 0 2px;
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: var(--color-background-primary);
  border-radius: var(--border-radius-lg);
  border: 0.5px solid var(--color-border-tertiary);
  width: 440px; max-width: calc(100vw - 32px);
  display: flex; flex-direction: column;
}
.modal-header { padding: 20px 24px 16px; border-bottom: 0.5px solid var(--color-border-tertiary); }
.modal-title  { font-size: 16px; font-weight: 500; color: var(--color-text-primary); margin: 0 0 4px; }
.modal-subtitle { font-size: 13px; color: var(--color-text-secondary); margin: 0; font-family: var(--font-mono); }
.modal-body   { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field   { display: flex; flex-direction: column; gap: 6px; }
.form-label   { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.required     { color: var(--color-text-danger); }
.form-input   {
  width: 100%; height: 36px; padding: 0 10px; box-sizing: border-box;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  font-size: 14px; color: var(--color-text-primary);
}
.form-input:focus { outline: none; border-color: var(--color-border-info); box-shadow: 0 0 0 2px var(--color-background-info); }
.form-hint  { font-size: 12px; color: var(--color-text-tertiary); margin: 0; }
.form-error { font-size: 13px; color: var(--color-text-danger); margin: 0; }
.modal-footer {
  padding: 16px 24px 20px; display: flex; justify-content: flex-end;
  gap: 8px; border-top: 0.5px solid var(--color-border-tertiary);
}
.btn {
  height: 36px; padding: 0 16px; border-radius: var(--border-radius-md);
  font-size: 14px; font-weight: 500; cursor: pointer;
  border: 0.5px solid var(--color-border-secondary); transition: background 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-tertiary { background: transparent; color: var(--color-text-secondary); }
.btn-tertiary:hover:not(:disabled) { background: var(--color-background-secondary); }
.btn-primary  { background: var(--color-background-info); border-color: var(--color-border-info); color: var(--color-text-info); }
.btn-primary:hover:not(:disabled)  { opacity: 0.9; }
</style>