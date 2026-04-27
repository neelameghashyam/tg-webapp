<script setup lang="ts">
import { ref } from 'vue';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import { PaginationNav, StatCard } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import { TC_DRAFT_STATUSES } from '@/config/constants';

const tcCards: TwpCard[] = [
  { code: 'all', label: 'All' },
  { code: 'TC', label: 'TC' },
  { code: 'TC-EDC', label: 'TC-EDC' },
];

const filterValues = ref<Record<string, string>>({});

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, load, onSearch, onSort, onPageChange, tableRef,
} = useTestGuidelinesList({
  tab: 'tc-drafts',
  sortKey: 'lastUpdated',
  twpCountsKey: 'tcDrafts',
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
  <div class="tc-drafts-view">
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
      :filter-values="filterValues"
      :sort-state="sortState"
      :selectable="false"
      show-upov-codes-column
      :status-options="TC_DRAFT_STATUSES"
      status-label="Status"
      searchable
      :search-placeholder="searchPlaceholder"
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
</template>

<style scoped>
.tc-drafts-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-cards {
  display: flex;
  gap: 12px;
}
</style>
