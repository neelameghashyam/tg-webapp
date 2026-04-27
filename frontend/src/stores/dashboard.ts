import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import api from '@/services/api';
import type {
  DashboardStats,
  TestGuidelineListItem,
  TestGuidelineDetail,
  TestGuidelinesResponse,
  IeComment,
} from '@/types';

export type DashboardTab =
  | 'twp-drafting'
  | 'twp-discussion'
  | 'tc-edc-drafting'
  | 'tc-edc-discussion'
  | 'adopted'
  | 'archived'
  // Legacy — kept during migration, will be removed
  | 'twp-drafts'
  | 'tc-drafts'
  | 'submitted'
  | 'aborted';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const testGuidelines = ref<TestGuidelineListItem[]>([]);
  const meta = ref<PaginationMeta>({ page: 1, limit: 20, total: 0 });
  const stats = ref<DashboardStats>({
    twpDrafts: 0,
    archived: 0,
  });
  const loading = ref(false);
  const statsLoading = ref(false);
  const error = ref<string | null>(null);

  const activeTab = ref<DashboardTab>('twp-drafting');
  const selectedTgId = ref<number | null>(null);
  const selectedTgDetail = ref<TestGuidelineDetail | null>(null);
  const detailLoading = ref(false);
  const ieComments = ref<IeComment[]>([]);
  const ieCommentsLoading = ref(false);

  let fetchAbortController: AbortController | null = null;

  const tabCounts = computed(() => ({
    twpDrafts:       stats.value.twpDrafts,
    twpDiscussion:   stats.value.twpDiscussion,
    tcEdcDrafting:   stats.value.tcEdcDrafting,
    tcEdcDiscussion: stats.value.tcEdcDiscussion,
    archived:        stats.value.archived,
  }));

  async function fetchTestGuidelines(params: Record<string, string | number> = {}): Promise<void> {
    fetchAbortController?.abort();
    fetchAbortController = new AbortController();

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get<TestGuidelinesResponse & { meta?: PaginationMeta }>('/api/test-guidelines', {
        params: { tab: activeTab.value, ...params },
        signal: fetchAbortController.signal,
      });
      testGuidelines.value = response.data.items || [];
      if (response.data.meta) {
        meta.value = response.data.meta;
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch test guidelines:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats(): Promise<void> {
    statsLoading.value = true;
    try {
      const response = await api.get<DashboardStats>('/api/dashboard/stats');
      stats.value = response.data;
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      statsLoading.value = false;
    }
  }

  async function fetchTgDetail(id: number): Promise<void> {
    detailLoading.value = true;
    try {
      const response = await api.get<TestGuidelineDetail>(`/api/test-guidelines/${id}`);
      selectedTgDetail.value = response.data;
    } catch (err) {
      console.error('Failed to fetch TG detail:', err);
      selectedTgDetail.value = null;
    } finally {
      detailLoading.value = false;
    }
  }

  async function fetchIeComments(id: number): Promise<void> {
    ieCommentsLoading.value = true;
    try {
      const response = await api.get<IeComment[]>(`/api/test-guidelines/${id}/ie-comments`);
      ieComments.value = response.data;
    } catch (err) {
      console.error('Failed to fetch IE comments:', err);
      ieComments.value = [];
    } finally {
      ieCommentsLoading.value = false;
    }
  }

  function selectTg(id: number): void {
    if (selectedTgId.value === id) {
      selectedTgId.value = null;
      selectedTgDetail.value = null;
      ieComments.value = [];
      return;
    }
    selectedTgId.value = id;
    fetchTgDetail(id);
    fetchIeComments(id);
  }

  function setTab(tab: DashboardTab): void {
    activeTab.value = tab;
    selectedTgId.value = null;
    selectedTgDetail.value = null;
    ieComments.value = [];
    fetchTestGuidelines();
  }

  return {
    testGuidelines,
    meta,
    tabCounts,
    stats,
    loading,
    statsLoading,
    error,
    activeTab,
    selectedTgId,
    selectedTgDetail,
    detailLoading,
    ieComments,
    ieCommentsLoading,
    fetchTestGuidelines,
    fetchStats,
    fetchTgDetail,
    selectTg,
    setTab,
  };
});