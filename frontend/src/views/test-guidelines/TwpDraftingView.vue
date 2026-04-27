<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTestGuidelinesList } from '@/composables/useTestGuidelinesList';
import type { TwpCard } from '@/composables/useTestGuidelinesList';
import { useAuthStore } from '@/stores/auth';
import { PaginationNav, StatCard, SidePanelLayout, ConfirmDialog, useConfirmDialog } from '@upov/upov-ui';
import TestGuidelinesTable from '@/components/common/TestGuidelinesTable.vue';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';
import { TWP_DRAFTING_STATUSES } from '@/config/constants';
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

// Status options: CRT only shown to admin in the filter dropdown
const statusOptions = computed(() =>
  authStore.isAdmin
    ? TWP_DRAFTING_STATUSES
    : TWP_DRAFTING_STATUSES.filter((s) => s.value !== 'CRT'),
);

const filterValues = ref<Record<string, string>>({});
const actionLoading = ref<number | null>(null);
const actionError = ref<string | null>(null);

// ── LE: Send for Comments (LED → IEC) ────────────────────────────────────────
async function onSendForComments(tgId: number) {
  const ok = await confirm({
    title: 'Send for Comments',
    message: 'The IE commenting period will begin. You will lose edit access to this document. Continue?',
    variant: 'default',
  });
  if (!ok) return;

  actionLoading.value = tgId;
  actionError.value = null;
  try {
    await api.post(`/api/test-guidelines/${tgId}/send-for-comments`);
    load();
  } catch (err: any) {
    actionError.value = err?.response?.data?.error?.message ?? 'Failed to send for comments.';
    console.error('Send for comments failed:', err);
  } finally {
    actionLoading.value = null;
  }
}

// ── LE: Sign Off (LEC → LES) ─────────────────────────────────────────────────
async function onSignOff(tgId: number) {
  const ok = await confirm({
    title: 'Sign Off',
    message: 'The drafting period will end and IE users will be deactivated. You will lose edit rights. Continue?',
    variant: 'danger',
  });
  if (!ok) return;

  actionLoading.value = tgId;
  actionError.value = null;
  try {
    await api.post(`/api/test-guidelines/${tgId}/sign-off`);
    load();
  } catch (err: any) {
    actionError.value = err?.response?.data?.error?.message ?? 'Failed to sign off.';
    console.error('Sign off failed:', err);
  } finally {
    actionLoading.value = null;
  }
}

// ── Admin: Make Copy for Discussion (LES/STU → TWD) ──────────────────────────
async function onCopyForDiscussion(tgId: number) {
  const ok = await confirm({
    title: 'Make Copy for Discussion',
    message: 'A new TWP Discussion Draft will be created and this TG will be archived. Continue?',
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
 * Build the action menu for each table row.
 *
 * Admin: always gets "Edit" (can edit at any status).
 *        Also gets "Make Copy for Discussion" on LES/STU rows.
 * LE:    gets "Send for Comments" on LED, "Sign Off" on LEC.
 *        Server enforces the LE-assignment check; non-assigned LEs get 403.
 */
function getActions(tg: { id: number; status: string }) {
  const actions: Array<{ label: string; handler: () => void }> = [];

  if (authStore.isAdmin) {
    // Edit is always available for admin at every status
    actions.push({ label: 'Edit', handler: () => router.push(`/admin/test-guidelines/${tg.id}`) });
    // Workflow actions on terminal-drafting statuses
    if (['LES', 'STU'].includes(tg.status)) {
      actions.push({ label: 'Make Copy for Discussion', handler: () => onCopyForDiscussion(tg.id) });
    }
  } else {
    // LE role: status-specific actions
    const isLe = (authStore.user?.roles ?? []).includes('EXP');
    if (isLe && tg.status === 'LED') {
      actions.push({ label: 'Send for Comments', handler: () => onSendForComments(tg.id) });
    }
    if (isLe && tg.status === 'LEC') {
      actions.push({ label: 'Sign Off', handler: () => onSignOff(tg.id) });
    }
  }

  return actions;
}

const {
  store, twpCards, activeTwp, sortState, searchPlaceholder,
  getCount, load, onSearch, onSort, onPageChange, tableRef,
  panelOpen, onRowSelect, onPanelClose,
} = useTestGuidelinesList({
  tab: 'twp-drafting',
  sortKey: 'lastUpdated',
  twpCountsKey: 'twpDrafts',
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
</script>

<template>
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="active-view">
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
        :status-options="statusOptions"
        :get-row-actions="getActions"
        :action-loading-id="actionLoading"
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

  <!-- Required: renders the confirmation dialog triggered by useConfirmDialog() -->
  <ConfirmDialog />
</template>

<style scoped>
.active-view { display: flex; flex-direction: column; gap: 16px; }
.stat-cards  { display: flex; gap: 12px; }

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