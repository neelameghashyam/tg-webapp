<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { SidePanelLayout, Chip, SearchInput, Skeleton, Icon, Divider, ProgressBar } from '@upov/upov-ui';
import TgDetailPanel from '@/components/common/TgDetailPanel.vue';
import { STATUS_LABELS } from '@/config/constants';
import type { TGStatus, TestGuidelineListItem } from '@/types';

const store = useDashboardStore();
const searchQuery = ref('');
const collapsedSections = ref(new Set<string>());

function toggleSection(status: string) {
  if (collapsedSections.value.has(status)) {
    collapsedSections.value.delete(status);
  } else {
    collapsedSections.value.add(status);
  }
}

function matchesSearch(tg: TestGuidelineListItem): boolean {
  if (!searchQuery.value) return true;
  const q = searchQuery.value.toLowerCase();
  return (
    tg.name?.toLowerCase().includes(q) ||
    tg.reference?.toLowerCase().includes(q) ||
    tg.leadExpert?.toLowerCase().includes(q) ||
    false
  );
}

interface DashboardSection {
  status: TGStatus;
  label: string;
  items: TestGuidelineListItem[];
}

const PHASE_ORDER: TGStatus[] = ['CRT', 'LED', 'IEC', 'LEC', 'LES', 'TCD', 'UOC', 'TRN'];

const sections = computed<DashboardSection[]>(() => {
  const filtered = store.testGuidelines.filter(matchesSearch);
  const grouped = new Map<string, TestGuidelineListItem[]>();
  for (const tg of filtered) {
    const key = tg.status;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(tg);
  }

  const result: DashboardSection[] = [];
  for (const status of PHASE_ORDER) {
    const items = grouped.get(status) || [];
    if (items.length) {
      result.push({ status, label: STATUS_LABELS[status], items });
    }
  }

  return result;
});

const panelOpen = computed(() => store.selectedTgId !== null);


function onCardClick(id: number) {
  store.selectTg(id);
}

function closePanel() {
  store.selectTg(store.selectedTgId!);
}

function highlight(text: string | null): string {
  if (!text) return '';
  if (!searchQuery.value) return text;
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const q = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${q})`, 'gi'), '<mark class="search-match">$1</mark>');
}

function formatDate(value: string | null): string {
  if (!value) return '--/--/----';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Time progress: how much of the phase duration has elapsed
function getTimeProgress(tg: TestGuidelineListItem): { percent: number; color: string } | null {
  if (!tg.periodStart || !tg.periodEnd) return null;
  const start = new Date(tg.periodStart).getTime();
  const end = new Date(tg.periodEnd).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return null;
  const elapsed = Math.max(0, now - start);
  const percent = Math.min(100, (elapsed / total) * 100);
  const remaining = 100 - percent;

  let color: string;
  if (remaining >= 80) color = '#22c55e';       // green
  else if (remaining >= 60) color = '#84cc16';   // green-yellow
  else if (remaining >= 40) color = '#eab308';   // yellow-orange
  else if (remaining >= 20) color = '#f97316';   // orange-red
  else color = '#ef4444';                         // red

  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  return { percent, color, daysRemaining };
}

const searchRef = ref<HTMLDivElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    const input = searchRef.value?.querySelector('input') as HTMLInputElement | null;
    input?.focus();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  store.activeTab = 'twp-drafts';
  store.fetchTestGuidelines({ limit: 200 });
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  store.selectedTgId = null;
  store.selectedTgDetail = null;
  store.ieComments = [];
});
</script>

<template>
  <div class="dashboard-wrapper">
  <SidePanelLayout :open="panelOpen" panel-width="360px" fixed top-offset="48px">
    <div class="dashboard-main">
      <div v-if="store.loading">
        <div class="dashboard-toolbar">
          <Skeleton width="180px" height="24px" />
          <div class="dashboard-search">
            <Skeleton width="100%" height="36px" rounded />
          </div>
        </div>

        <div v-for="i in 2" :key="i" class="dashboard-section">
          <div class="section-header">
            <Skeleton width="120px" height="20px" />
            <Skeleton width="30px" height="16px" />
          </div>
          <div class="section-grid">
            <div v-for="j in 3" :key="j" class="tg-card tg-card--skeleton">
              <div class="tg-card-header">
                <Skeleton width="60%" height="16px" />
                <Skeleton width="25%" height="12px" />
              </div>
              <Divider spacing="compact" />
              <Skeleton width="50%" height="12px" />
              <div style="height: 16px" />
              <Skeleton width="70%" height="12px" />
              <Skeleton width="100%" height="12px" />
              <div style="height: 4px" />
              <Skeleton width="100%" height="3px" rounded />
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="dashboard-toolbar">
          <h1 class="dashboard-title">TG Dashboard</h1>
          <div ref="searchRef" class="dashboard-search">
            <SearchInput
            compact
            hide-button
            placeholder="Search ..."
            :debounce="200"
            @submitted="searchQuery = $event"
          />
          </div>
        </div>

        <p v-if="!sections.length" class="dashboard-empty">
          {{ store.testGuidelines.length ? 'No results matching your search.' : 'No active test guidelines.' }}
        </p>

        <div v-for="section in sections" :key="section.status" class="dashboard-section">
          <div class="section-header" @click="toggleSection(section.status)">
            <Icon
              icon="chevron-down"
              size="small"
              class="section-chevron"
              :class="{ 'section-chevron--collapsed': collapsedSections.has(section.status) }"
            />
            <h2 class="section-title">{{ section.label }}</h2>
            <span class="section-count">({{ section.items.length }})</span>
          </div>

          <div v-show="!collapsedSections.has(section.status)" class="section-grid">
            <div
              v-for="tg in section.items"
              :key="tg.id"
              class="tg-card"
              :class="{ 'tg-card--active': store.selectedTgId === tg.id }"
              @click="onCardClick(tg.id)"
            >
              <div class="tg-card-header">
                <span class="tg-card-name" v-html="highlight(tg.name)" />
                <span class="tg-card-ref" v-html="highlight(tg.reference)" />
              </div>
              <Divider spacing="compact" />

              <div class="tg-card-meta">
                <span class="tg-card-expert">
                  <span v-if="tg.leadExpert" v-html="highlight(tg.leadExpert)" />
                  <template v-else>n/a</template>
                  <span v-if="tg.leadExpertCountry" class="tg-card-country">({{ tg.leadExpertCountry }})</span>
                </span>
                <div v-if="tg.twps" class="tg-card-twps">
                  <Chip
                    v-for="code in tg.twps.split(',')"
                    :key="code"
                    :label="code.trim()"
                    size="small"
                    :removable="false"
                    variant="tonal"
                  />
                </div>
              </div>

              <div class="tg-card-info">
                <p v-if="tg.ieCommentCount" class="tg-card-comments">
                  Comments ({{ tg.ieCommentCount }})
                </p>
                <p v-if="tg.periodStart && tg.periodEnd" class="tg-card-deadline">
                  <span class="tg-card-deadline-date">{{ formatDate(tg.periodStart) }}</span>
                  <span class="tg-card-deadline-date">{{ formatDate(tg.periodEnd) }}</span>
                </p>
              </div>

              <ProgressBar
                v-if="getTimeProgress(tg)"
                :value="getTimeProgress(tg)!.percent"
                :color="getTimeProgress(tg)!.color"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #panel>
      <TgDetailPanel @close="closePanel" />
    </template>
  </SidePanelLayout>
  </div>
</template>

<style scoped>
.dashboard-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 24px;
}

.tg-card--skeleton {
  pointer-events: none;
  gap: 12px;
}

.dashboard-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dashboard-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.dashboard-search {
  max-width: 360px;
  margin-left: auto;
}

.dashboard-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-neutral-200);
  margin-bottom: 12px;
  cursor: pointer;
  user-select: none;
}

.section-chevron {
  color: var(--color-neutral-500);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.section-chevron--collapsed {
  transform: rotate(-90deg);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-primary-green-bright);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.section-count {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-400);
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.tg-card {
  background: var(--color-bg-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background-color 0.15s;
}

.tg-card:hover,
.tg-card--active {
  background: color-mix(in srgb, var(--color-primary-green) 6%, transparent);
}

.tg-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.tg-card-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-primary-green-dark);
  line-height: 1.3;
}

.tg-card-ref {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.tg-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin: 10px 0;
}

.tg-card-twps {
  display: flex;
  gap: 4px;
}

.tg-card-info {
  margin-top: auto;
}

.tg-card-info p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.tg-card-expert {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.tg-card-country {
  font-weight: 400;
}

.tg-card-deadline {
  display: flex;
  justify-content: space-between;
}

.tg-card-deadline-date {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.75rem;
}

.tg-card-comments {
  font-weight: 500;
  color: var(--color-primary-green-dark) !important;
  margin-bottom: 4px !important;
}

:deep(.search-match) {
  background: color-mix(in srgb, var(--color-primary-green) 25%, var(--color-bg-white));
  color: inherit;
  padding: 0 1px;
  border-radius: 2px;
}
</style>
