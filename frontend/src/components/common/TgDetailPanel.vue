<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { SidePanel, Skeleton, Toggle, Icon, Badge } from '@upov/upov-ui';
import type { TabItem } from '@upov/upov-ui';
import type { IeComment, TGStatus } from '@/types';

defineEmits<{ close: [] }>();

const store = useDashboardStore();

// Timeline phase definitions
const TIMELINE_PHASES = [
  { status: 'LED' as TGStatus, label: 'LE Draft', startKey: 'leDraftStart', endKey: 'leDraftEnd' },
  { status: 'IEC' as TGStatus, label: 'IE Comments', startKey: 'ieCommentsStart', endKey: 'ieCommentsEnd' },
  { status: 'LEC' as TGStatus, label: 'LE Checking', startKey: 'leCheckingStart', endKey: 'leCheckingEnd' },
] as const;

const PHASE_ORDER: TGStatus[] = ['CRT', 'LED', 'IEC', 'LEC', 'LES'];

type PhaseState = 'completed' | 'active' | 'upcoming';

function getPhaseState(phaseStatus: TGStatus, currentStatus: TGStatus): PhaseState {
  const phaseIdx = PHASE_ORDER.indexOf(phaseStatus);
  const currentIdx = PHASE_ORDER.indexOf(currentStatus);
  if (phaseIdx < 0 || currentIdx < 0) return 'upcoming';
  if (phaseIdx < currentIdx) return 'completed';
  if (phaseIdx === currentIdx) return 'active';
  return 'upcoming';
}

interface TimelineStep {
  label: string;
  state: PhaseState;
  startDate: string | null;
  endDate: string | null;
}

const timelineSteps = computed<TimelineStep[]>(() => {
  const detail = store.selectedTgDetail;
  if (!detail) return [];
  const steps: TimelineStep[] = TIMELINE_PHASES.map((phase) => ({
    label: phase.label,
    state: getPhaseState(phase.status, detail.status),
    startDate: (detail as any)[phase.startKey] ?? null,
    endDate: (detail as any)[phase.endKey] ?? null,
  }));
  return steps;
});

const tabs: TabItem[] = [
  { label: 'Details', id: 'details' },
  { label: 'IE Comments', id: 'comments' },
];

const tabCounts = computed<Record<string, number | null>>(() => ({
  details: null,
  comments: store.ieComments.length,
}));

const commentSort = ref<'left' | 'right'>('left');

interface CommentGroup {
  title: string;
  comments: IeComment[];
}

const groupedComments = computed<CommentGroup[]>(() => {
  const map = new Map<string, IeComment[]>();
  for (const c of store.ieComments) {
    let key: string;
    if (commentSort.value === 'right') {
      key = c.ieName + (c.ieCountry ? ` (${c.ieCountry})` : '');
    } else {
      key = [c.chapterName, c.sectionName].filter(Boolean).join(' / ');
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries()).map(([title, comments]) => ({ title, comments }));
});

function formatDate(value: string | null): string {
  if (!value) return '__/__/____';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
</script>

<template>
  <SidePanel
    :open="true"
    :tabs="tabs"
    width="360px"
    @close="$emit('close')"
  >
    <template #tab-label="{ tab }">
      {{ tab.label }} <span v-if="tabCounts[tab.id] != null" class="tab-sub">({{ tabCounts[tab.id] }})</span>
    </template>

    <template #tab-details>
      <div v-if="store.detailLoading" class="detail-loading">
        <Skeleton width="50%" height="18px" />
        <Skeleton width="70%" height="14px" />
        <div style="margin-top: 16px">
          <Skeleton width="80px" height="12px" />
          <Skeleton width="100%" height="14px" style="margin-top: 8px" />
        </div>
        <div style="margin-top: 16px">
          <Skeleton width="80px" height="12px" />
          <Skeleton width="100%" height="40px" style="margin-top: 8px" rounded />
          <Skeleton width="100%" height="40px" style="margin-top: 8px" rounded />
          <Skeleton width="100%" height="40px" style="margin-top: 8px" rounded />
        </div>
      </div>
      <template v-else-if="store.selectedTgDetail">
        <h4 class="panel-title">{{ store.selectedTgDetail.name }}</h4>
        <p class="panel-subtitle">{{ store.selectedTgDetail.reference }}</p>

        <h5 class="detail-heading">UPOV Code(s)</h5>
        <div v-if="store.selectedTgDetail.upovCodes?.length" class="upov-codes">
          <Badge v-for="code in store.selectedTgDetail.upovCodes" :key="code" :label="code" variant="code" size="small" />
        </div>
        <p v-else class="detail-value detail-empty">—</p>

        <h5 class="detail-heading">Deadlines</h5>
        <div class="timeline">
          <div
            v-for="(step, idx) in timelineSteps"
            :key="idx"
            class="timeline-step"
            :class="`timeline-step--${step.state}`"
          >
            <div class="timeline-dot">
              <Icon v-if="step.state === 'completed'" icon="check-circle-fill" size="small" class="dot-icon" />
              <Icon v-else-if="step.state === 'active'" icon="play-circle-fill" size="small" class="dot-icon" />
            </div>
            <div class="timeline-content">
              <span class="timeline-label">{{ step.label }}</span>
              <span class="timeline-dates">
                {{ formatDate(step.startDate) }}
                <Icon icon="arrow-right" size="small" class="date-arrow" />
                {{ formatDate(step.endDate) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <template #tab-comments>
      <div v-if="store.ieCommentsLoading" class="detail-loading">
        <Skeleton width="100%" height="14px" />
        <Skeleton width="90%" height="14px" />
        <Skeleton width="100%" height="14px" />
        <Skeleton width="60%" height="14px" />
      </div>
      <template v-else>
        <div class="comments-header">
          <span class="comments-group-label">Group by:</span>
          <Toggle
            v-model="commentSort"
            :options="[
              { label: 'Chapter', value: 'left' },
              { label: 'Expert', value: 'right' },
            ]"
          />
        </div>
        <p v-if="!store.ieComments.length" class="detail-empty">No IE comments.</p>
        <div v-else class="comments-list">
          <div v-for="group in groupedComments" :key="group.title" class="comment-group">
            <div class="comment-group-title">{{ group.title }}</div>
            <div v-for="c in group.comments" :key="c.id" class="comment-item">
              <div class="comment-item-header">
                <span v-if="commentSort === 'left'" class="comment-ie">
                  {{ c.ieName }}<span v-if="c.ieCountry" class="comment-country"> ({{ c.ieCountry }})</span>
                </span>
                <span v-else class="comment-chapter-label">
                  {{ [c.chapterName, c.sectionName].filter(Boolean).join(' / ') }}
                </span>
                <span class="comment-date">{{ formatDate(c.lastUpdated) }}</span>
              </div>
              <div class="comment-body" v-html="c.comments" />
            </div>
          </div>
        </div>
      </template>
    </template>
  </SidePanel>
</template>

<style scoped>
.detail-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.panel-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 4px 0 16px;
}

.detail-heading {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-secondary);
  margin: 16px 0 8px;
}

.timeline {
  position: relative;
  padding-left: 28px;
}

.timeline-step {
  position: relative;
  padding: 8px 0;
}

.timeline-step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: -21px;
  top: 28px;
  bottom: -10px;
  width: 0;
  border-left: 2px dashed var(--color-neutral-300);
}

.timeline-step--completed:not(:last-child)::before {
  background: none;
  border-left: 2px solid var(--color-primary-green-bright);
}

.timeline-step--completed:has(+ .timeline-step--active)::before {
  background: none;
  border-left: 2px dashed var(--color-primary-green-bright);
}

.timeline-dot {
  position: absolute;
  left: -28px;
  top: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-neutral-300);
  background: white;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: white;
}

.timeline-step--upcoming .dot-icon {
  color: var(--color-neutral-400);
}

.timeline-step--completed .timeline-dot {
  background: transparent;
  border: none;
}

.timeline-step--completed .dot-icon {
  color: var(--color-primary-green-bright);
}

.timeline-step--active .timeline-dot {
  background: color-mix(in srgb, var(--color-primary-green) 20%, white);
  border: none;
}

.timeline-step--active .dot-icon {
  color: var(--color-warning-orange, #f59e0b);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.timeline-step--completed .timeline-label {
  color: var(--color-primary-green-dark);
}

.timeline-step--active .timeline-label {
  color: var(--color-primary-green-dark);
  font-weight: 600;
}

.timeline-step--upcoming .timeline-label {
  color: var(--color-text-secondary);
}

.timeline-dates {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.date-arrow {
  font-size: 10px;
  width: 10px;
  height: 10px;
  vertical-align: middle;
  opacity: 0.5;
}

.upov-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.detail-value {
  font-size: 0.875rem;
  margin: 0;
}

.detail-empty {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.comments-group-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-group-title {
  font-size: .8rem;
  font-weight: 600;
  color: var(--color-primary-green-dark);
  background: color-mix(in srgb,var(--color-primary-green) 12%,transparent) !important;
  padding: 6px 2px;
  border-radius: 4px;
}

.comment-item {
  padding: 6px 0 6px 8px;
  border-bottom: 1px solid var(--color-neutral-200);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}

.comment-ie {
  font-size: 0.8rem;
  font-weight: 500;
}

.comment-chapter-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.comment-country {
  color: var(--color-text-secondary);
  font-weight: 400;
}

.comment-body {
  font-size: 0.8rem;
  line-height: 1.5;
  margin-bottom: 2px;
}

.comment-body :deep(p) {
  margin: 0;
}

.comment-date {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}
</style>
