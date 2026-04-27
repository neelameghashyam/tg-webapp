<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '@/stores/config';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import type { DashboardTab } from '@/stores/dashboard';
import { useDashboardStore } from '@/stores/dashboard';
import { PaginationNav, StatCard, SidePanelLayout } from '@upov/upov-ui';
import type { ActionMenuItem } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';

const props = withDefaults(defineProps<{
  tab: DashboardTab;
  sortKey: string;
  twpCountsKey: string;
  dateColumn: { key: string; label: string };
  showStatCards?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
}>(), {
  showStatCards: true,
  statusOptions: () => [],
});

const dashboardStore = useDashboardStore();

// Derive cards from what the API returns — only show TWPs the user has access to
const cards = computed<TwpCard[]>(() => {
  if (!props.showStatCards) return [{ code: 'all', label: 'All' }];
  const counts = dashboardStore.stats.twpCounts?.[props.twpCountsKey as keyof typeof dashboardStore.stats.twpCounts] as Record<string, number> | undefined;
  if (!counts) return [{ code: 'all', label: 'All' }];
  const twpCards = Object.keys(counts).map((code) => ({ code, label: code }));
  return [{ code: 'all', label: 'All' }, ...twpCards];
});

const configStore = useConfigStore();

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, onSearch, onSort, onPageChange, tableRef,
  panelOpen, onRowSelect, onPanelClose,
} = useTestGuidelinesList({
  tab: props.tab,
  sortKey: props.sortKey,
  twpCountsKey: props.twpCountsKey,
  cards: cards.value,
});

const downloadAction: ActionMenuItem[] = [
  { id: 'download', label: 'Download Word', icon: 'download' },
];

function onAction(actionId: string, tgId: number) {
  if (actionId === 'download') {
    const baseUrl = configStore.config?.services.docGenerateUrl || '';
    window.open(`${baseUrl}/doc-generate/${tgId}`, '_blank');
  }
}
</script>

<template>
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="status-view">
      <div v-if="showStatCards" class="stat-cards">
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
        :sort-state="sortState"
        :date-column="dateColumn"
        :status-options="statusOptions"
        :actions="downloadAction"
        searchable
        :search-placeholder="searchPlaceholder"
        @select="onRowSelect"
        @action="onAction"
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
</template>

<style scoped>
.status-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-cards {
  display: flex;
  gap: 12px;
}


</style>
