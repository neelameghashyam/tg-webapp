import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore, type DashboardTab } from '@/stores/dashboard';
import type { DataTableSortState } from '@upov/upov-ui';
import type TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';

export interface TwpCard {
  code: string;
  label: string;
}

export interface UseTestGuidelinesListOptions {
  tab: DashboardTab;
  sortKey: string;
  twpCountsKey: string;
  cards: TwpCard[];
  scope?: string;
  extraParams?: () => Record<string, string | number>;
}

export function useTestGuidelinesList(options: UseTestGuidelinesListOptions) {
  const store = useDashboardStore();
  const router = useRouter();

  const twpCards = options.cards;
  const scopeCodes = twpCards.filter((c) => c.code !== 'all').map((c) => c.code);

  function twpFromHash(): string {
    const hash = window.location.hash.slice(1).toLowerCase();
    const match = twpCards.find(c => c.code.toLowerCase() === hash);
    return match?.code || twpCards[0]?.code || 'all';
  }

  const activeTwp = ref(twpFromHash());

  watch(activeTwp, (code) => {
    router.replace({ hash: `#${code.toLowerCase()}` });
  });

  // Server-side state
  const sortState = ref<DataTableSortState>({ key: options.sortKey, direction: 'desc' });
  const search = ref('');
  const searchPlaceholder = computed(() => 'Search ...');

  function getCount(code: string): number {
    const counts = store.stats.twpCounts?.[options.twpCountsKey as keyof typeof store.stats.twpCounts] as Record<string, number> | undefined;
    if (code === 'all') {
      return scopeCodes.reduce((sum, c) => sum + (counts?.[c] || 0), 0);
    }
    return counts?.[code] || 0;
  }

  function buildParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: store.meta.page,
      limit: store.meta.limit,
    };
    if (search.value) params.search = search.value;
    if (activeTwp.value && activeTwp.value !== 'all') {
      params.twp = activeTwp.value;
    } else if (options.scope) {
      // Drafts views: scope "all" to visible cards only
      params.twp = scopeCodes.join(',');
      params.scope = options.scope;
    }
    if (sortState.value.direction) params.order = sortState.value.direction;
    if (options.extraParams) Object.assign(params, options.extraParams());
    return params;
  }

  function load() {
    store.fetchTestGuidelines(buildParams());
  }

  function onSearch(value: string) {
    search.value = value;
    store.meta.page = 1;
    load();
  }

  function onSort(state: DataTableSortState) {
    sortState.value = state;
    store.meta.page = 1;
    load();
  }

  function onPageChange(page: number) {
    store.meta.page = page;
    load();
  }

  watch(activeTwp, () => {
    store.meta.page = 1;
    load();
  });

  // Table ref + Ctrl+F
  const tableRef = ref<InstanceType<typeof TestGuidelinesTable> | null>(null);

  function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      tableRef.value?.focusSearch();
    }
  }

  // Side panel
  const panelOpen = computed(() => store.selectedTgId != null);

  function onRowSelect(id: number) {
    store.selectTg(id);
  }

  function onPanelClose() {
    store.selectTg(store.selectedTgId!);
  }

  // Lifecycle
  onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    store.activeTab = options.tab;
    store.meta.page = 1;
    store.meta.limit = 9;
    load();
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown);
    store.selectedTgId = null;
    store.selectedTgDetail = null;
    store.ieComments = [];
  });

  return {
    store,
    twpCards,
    activeTwp,
    sortState,
    search,
    searchPlaceholder,
    getCount,
    load,
    onSearch,
    onSort,
    onPageChange,
    tableRef,
    panelOpen,
    onRowSelect,
    onPanelClose,
  };
}
