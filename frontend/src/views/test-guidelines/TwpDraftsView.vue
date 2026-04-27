<script setup lang="ts">
import { ref } from 'vue';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import { useAuthStore } from '@/stores/auth';
import { PaginationNav, StatCard, SidePanelLayout } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';
import { TWP_DRAFT_STATUSES } from '@/config/constants';

const authStore = useAuthStore();

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

const filterValues = ref<Record<string, string>>({});

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, load, onSearch, onSort, onPageChange, tableRef,
  panelOpen, onRowSelect, onPanelClose,
} = useTestGuidelinesList({
  tab: 'twp-drafts',
  sortKey: 'lastUpdated',
  twpCountsKey: 'twpDrafts',
  cards: [...(authStore.isAdmin ? [{ code: 'all', label: 'All' }] : []), ...visibleCards],
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
</script>

<template>
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="active-view">
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
        :status-options="TWP_DRAFT_STATUSES"
        status-label="Status"
        show-deadline-column
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
</template>

<style scoped>
.active-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-cards {
  display: flex;
  gap: 12px;
}
</style>
