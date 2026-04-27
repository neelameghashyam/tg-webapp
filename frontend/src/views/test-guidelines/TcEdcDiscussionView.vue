<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import { useAuthStore } from '@/stores/auth';
import { PaginationNav, SidePanelLayout, ConfirmDialog, useConfirmDialog } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';
import { TC_EDC_DISCUSSION_STATUSES } from '@/config/constants';
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

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, load, onSearch, onSort, onPageChange, tableRef,
  panelOpen, onRowSelect, onPanelClose,
} = useTestGuidelinesList({
  tab: 'tc-edc-discussion',
  sortKey: 'lastUpdated',
  twpCountsKey: 'tcEdcDiscussion',
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

// ── Workflow helpers ──────────────────────────────────────────────────────────

const CONFIRM_MESSAGES = {
  startTwp:    { title: 'Start New TWP Project',    message: 'A new LE Draft will be created and this discussion draft will be archived.',                    variant: 'default' as const },
  startTcEdc:  { title: 'Start New TC-EDC Project', message: 'A new EDC Draft will be created and this discussion draft will be archived.',                   variant: 'default' as const },
  adopt:       { title: 'Adopt Test Guideline',      message: 'This will create the final adopted TG and archive the discussion draft.',                       variant: 'default' as const },
  adoptByCorr: { title: 'Adopt by Correspondence',   message: 'This will create the final adopted TG (by correspondence) and archive the discussion draft.',   variant: 'default' as const },
};

async function callWorkflow(
  tgId: number,
  dialogKey: keyof typeof CONFIRM_MESSAGES,
  apiFn: () => Promise<unknown>,
) {
  const { title, message, variant } = CONFIRM_MESSAGES[dialogKey];
  const ok = await confirm({ title, message, variant });
  if (!ok) return;

  actionLoading.value = tgId;
  actionError.value = null;
  try {
    await apiFn();
    load();
  } catch (err: any) {
    actionError.value = err?.response?.data?.error?.message ?? `Action "${title}" failed. Please try again.`;
    console.error(`Workflow action "${dialogKey}" failed:`, err);
  } finally {
    actionLoading.value = null;
  }
}

function onStartNewTwpProject(tgId: number)      { return callWorkflow(tgId, 'startTwp',    () => api.post(`/api/admin/test-guidelines/${tgId}/start-new-project`, { targetStatus: 'LED' })); }
function onStartNewTcEdcProject(tgId: number)    { return callWorkflow(tgId, 'startTcEdc',  () => api.post(`/api/admin/test-guidelines/${tgId}/start-new-project`, { targetStatus: 'TCD' })); }
function onAdopt(tgId: number)                   { return callWorkflow(tgId, 'adopt',       () => api.post(`/api/admin/test-guidelines/${tgId}/adopt`, { type: 'ADT' })); }
function onAdoptByCorrespondence(tgId: number)   { return callWorkflow(tgId, 'adoptByCorr', () => api.post(`/api/admin/test-guidelines/${tgId}/adopt`, { type: 'ADC' })); }

/**
 * Admin always gets Edit. On TDD rows, also gets the four post-meeting actions.
 */
function getActions(tg: { id: number; status: string }) {
  if (!authStore.isAdmin) return [];
  const actions = [
    { label: 'Edit', handler: () => router.push(`/admin/test-guidelines/${tg.id}`) },
  ];
  if (tg.status === 'TDD') {
    actions.push(
      { label: 'Start New TWP Project',    handler: () => onStartNewTwpProject(tg.id) },
      { label: 'Start New TC-EDC Project', handler: () => onStartNewTcEdcProject(tg.id) },
      { label: 'Adopt',                    handler: () => onAdopt(tg.id) },
      { label: 'Adopt by Correspondence',  handler: () => onAdoptByCorrespondence(tg.id) },
    );
  }
  return actions;
}
</script>

<template>
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="tc-edc-discussion-view">
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
        :status-options="TC_EDC_DISCUSSION_STATUSES"
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

  <!-- Required: renders the confirmation dialog triggered by useConfirmDialog() -->
  <ConfirmDialog />
</template>

<style scoped>
.tc-edc-discussion-view { display: flex; flex-direction: column; gap: 16px; }

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
</style>