<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import { useAuthStore } from '@/stores/auth';
import { PaginationNav, StatCard, SidePanelLayout, ConfirmDialog, useConfirmDialog } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';
import { TWP_DISCUSSION_STATUSES } from '@/config/constants';
import api from '@/services/api';

const router = useRouter();
const authStore = useAuthStore();
const { confirm } = useConfirmDialog();

const allTwpCards: TwpCard[] = [
  { code: 'TWA', label: 'TWA' },
  { code: 'TWF', label: 'TWF' },
  { code: 'TWO', label: 'TWO' },
  { code: 'TWV', label: 'TWV' },
];
const userTwps = authStore.user?.twps
  ? authStore.user.twps.split(',').map((c) => c.trim()).filter(Boolean)
  : [];
const visibleCards = authStore.isAdmin
  ? allTwpCards
  : allTwpCards.filter((c) => userTwps.includes(c.code));
const cards: TwpCard[] = [...visibleCards];

const filterValues = ref<Record<string, string>>({});
const actionLoading = ref<number | null>(null);
const actionError = ref<string | null>(null);

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, load, onSearch, onSort, onPageChange, tableRef,
  panelOpen, onRowSelect, onPanelClose,
} = useTestGuidelinesList({
  tab: 'twp-discussion',
  sortKey: 'lastUpdated',
  twpCountsKey: 'twpDiscussion',
  cards,
  scope: 'twp',
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

// ── Workflow actions ──────────────────────────────────────────────────────────

async function onStartNewTwpProject(tgId: number) {
  const ok = await confirm({
    title: 'Start New TWP Project',
    message: 'A new LE Draft will be created and this discussion draft will be archived.',
    variant: 'default',
  });
  if (!ok) return;

  actionLoading.value = tgId;
  actionError.value = null;
  try {
    await api.post(`/api/admin/test-guidelines/${tgId}/start-new-project`, { targetStatus: 'LED' });
    load();
  } catch (err: any) {
    actionError.value = err?.response?.data?.error?.message ?? 'Failed to start new TWP project.';
    console.error('Start new TWP project failed:', err);
  } finally {
    actionLoading.value = null;
  }
}

async function onSubmitToTcEdc(tgId: number) {
  const ok = await confirm({
    title: 'Submit to TC-EDC',
    message: 'A new EDC Draft will be created and this discussion draft will be archived.',
    variant: 'default',
  });
  if (!ok) return;

  actionLoading.value = tgId;
  actionError.value = null;
  try {
    await api.post(`/api/admin/test-guidelines/${tgId}/submit-to-tc-edc`);
    load();
  } catch (err: any) {
    actionError.value = err?.response?.data?.error?.message ?? 'Failed to submit to TC-EDC.';
    console.error('Submit to TC-EDC failed:', err);
  } finally {
    actionLoading.value = null;
  }
}

/**
 * Admin always gets Edit. On TWD rows, also gets the post-meeting workflow actions.
 */
function getActions(tg: { id: number; status: string }) {
  if (!authStore.isAdmin) return [];
  const actions = [
    { label: 'Edit', handler: () => router.push(`/admin/test-guidelines/${tg.id}`) },
  ];
  if (tg.status === 'TWD') {
    actions.push(
      { label: 'Start New TWP Project', handler: () => onStartNewTwpProject(tg.id) },
      { label: 'Submit to TC-EDC',      handler: () => onSubmitToTcEdc(tg.id) },
    );
  }
  return actions;
}
</script>

<template>
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="discussion-view">
      <div v-if="actionError" class="action-error" role="alert">
        <span>{{ actionError }}</span>
        <button class="action-error-close" aria-label="Dismiss error" @click="actionError = null">×</button>
      </div>

      <div class="stat-cards">
        <StatCard
          v-for="card in twpCards"
          :key="card.code"
          :label="card.label"
          :count="getCount(card.code)"
          :active="activeTwp === card.code"
          :loading="store.statsLoading"
          @click="activeTwp = card.code"
        />
      </div>

      <TestGuidelinesTable
        ref="tableRef"
        :items="store.testGuidelines"
        :loading="store.loading"
        :selected-id="store.selectedTgId"
        :filter-values="filterValues"
        :sort-state="sortState"
        :status-options="TWP_DISCUSSION_STATUSES"
        :get-row-actions="authStore.isAdmin ? getActions : undefined"
        :action-loading-id="actionLoading"
        status-label="Status"
        searchable
        :search-placeholder="searchPlaceholder"
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

  <ConfirmDialog />
</template>

<style scoped>
.discussion-view { display: flex; flex-direction: column; gap: 16px; }
.stat-cards      { display: flex; gap: 12px; }

.action-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-background-danger);
  border: 0.5px solid var(--color-border-danger);
  border-radius: var(--border-radius-md);
  font-size: 13px;
  color: var(--color-text-danger);
}
.action-error-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-danger);
  padding: 0 2px;
}
</style>