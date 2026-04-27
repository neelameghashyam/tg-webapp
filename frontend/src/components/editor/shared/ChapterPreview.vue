<script setup lang="ts">
import { Icon } from '@upov/upov-ui';

import { ref, onUnmounted } from 'vue';


const USE_FLOATING_PANEL = false;

defineProps<{
  emptyMessage?: string;
  loading?: boolean;
  needsRefresh?: boolean;
}>();

const emit = defineEmits<{
  refresh: [lang: string];
}>();

// ── Shared ────────────────────────────────────────────────────────────────────
const selectedLanguage = ref('en');
const languages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'zh', label: '中文' },
];
function handleRefresh() { emit('refresh', selectedLanguage.value); }

// ── Split-view drag (USE_FLOATING_PANEL = false) ──────────────────────────────
// leftPct = % of total width given to the edit pane
const leftPct    = ref(52);
const MIN_PCT    = 20;
const MAX_PCT    = 80;
const isDragging = ref(false);

function startSplitDrag(e: MouseEvent) {
  e.preventDefault();
  isDragging.value = true;
  document.body.style.cursor     = 'col-resize';
  document.body.style.userSelect = 'none';

  // Walk up to the split-container to get its bounding rect
  const container = (e.currentTarget as HTMLElement)
    .closest('.split-container') as HTMLElement;

  function onMouseMove(ev: MouseEvent) {
    const rect = container.getBoundingClientRect();
    const raw  = ((ev.clientX - rect.left) / rect.width) * 100;
    leftPct.value = Math.round(Math.min(Math.max(raw, MIN_PCT), MAX_PCT));
  }
  function onMouseUp() {
    isDragging.value = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup',   onMouseUp);
  }
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup',   onMouseUp);
}

// ── Floating panel (USE_FLOATING_PANEL = true) ────────────────────────────────
const isOpen     = ref(false);
const panelWidth = ref(460);
const MIN_WIDTH  = 300;
const isResizing = ref(false);

function togglePanel() { isOpen.value = !isOpen.value; }
function closePanel()  { isOpen.value = false; }

function startResize(e: MouseEvent) {
  e.preventDefault();
  isResizing.value = true;
  document.body.style.cursor     = 'ew-resize';
  document.body.style.userSelect = 'none';

  const startX     = e.clientX;
  const startWidth = panelWidth.value;

  function onMouseMove(ev: MouseEvent) {
    const delta = startX - ev.clientX;
    panelWidth.value = Math.round(
      Math.min(Math.max(startWidth + delta, MIN_WIDTH), window.innerWidth * 0.9)
    );
  }
  function onMouseUp() {
    isResizing.value = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup',   onMouseUp);
  }
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup',   onMouseUp);
}

onUnmounted(() => {
  document.body.style.cursor     = '';
  document.body.style.userSelect = '';
});
</script>

<template>

  <!-- ════════════════════════════════════════════════════════════════════════
       MODE A — Side-by-side split  (USE_FLOATING_PANEL = false)
       Left pane  → #edit slot (chapter edit UI)
       Right pane → default slot (preview HTML)
       Divider between them is draggable to resize.
       ════════════════════════════════════════════════════════════════════════ -->
  <template v-if="!USE_FLOATING_PANEL">
    <div class="split-container" :class="{ 'split-container--dragging': isDragging }">

      <!-- ── LEFT: Edit pane ── -->
      <div class="split-pane split-pane--edit" :style="{ width: leftPct + '%' }">
        <div class="split-pane-header">
          <span class="split-pane-label">
            <Icon icon="pencil" size="small" style="color:var(--color-primary-900,#14532d);margin-right:5px;" />
            Edit
          </span>
        </div>
        <div class="split-pane-body">
          <slot name="edit" />
        </div>
      </div>

      <!-- ── DIVIDER ── -->
      <div
        class="split-divider"
        :class="{ 'split-divider--active': isDragging }"
        title="Drag to resize panes"
        @mousedown="startSplitDrag"
      >
        <div class="split-divider-grip">
          <span /><span /><span /><span /><span /><span />
        </div>
        <!-- Live width tooltip while dragging -->
        <Transition name="fade">
          <div v-if="isDragging" class="split-size-badge">
            {{ leftPct }}% · {{ 100 - leftPct }}%
          </div>
        </Transition>
      </div>

      <!-- ── RIGHT: Preview pane ── -->
      <div class="split-pane split-pane--preview" :style="{ width: (100 - leftPct) + '%' }">
        <!-- Preview pane header / toolbar -->
        <div class="split-pane-header">
          <span class="split-pane-label">
            <Icon icon="eye" size="small" style="color:var(--color-primary-900,#14532d);margin-right:5px;" />
            Preview
          </span>

          <Transition name="fade">
            <span v-if="needsRefresh && !loading" class="stale-badge">
              <span class="stale-badge-dot" />
              Out of date
            </span>
          </Transition>

          <div class="split-toolbar-right">
            <!-- Language -->
            <div class="lang-select-wrap">
              <select v-model="selectedLanguage" class="lang-select">
                <option v-for="lang in languages" :key="lang.value" :value="lang.value">
                  {{ lang.label }}
                </option>
              </select>
              <span class="lang-select-chevron">
                <Icon icon="chevron-down" size="small" />
              </span>
            </div>
            <!-- Refresh -->
            <button
              class="refresh-btn"
              :class="{ 'refresh-btn--stale': needsRefresh && !loading }"
              :disabled="loading"
              :style="loading ? { opacity:'0.6', cursor:'not-allowed' } : {}"
              :title="needsRefresh ? 'Content changed — refresh preview' : 'Refresh preview'"
              @click="handleRefresh"
            >
              <Icon
                icon="arrow-clockwise"
                size="small"
                :class="{ 'icon-spin': loading }"
                style="color:inherit"
              />
              <span>{{ loading ? 'Loading…' : 'Refresh' }}</span>
            </button>
          </div>
        </div>

        <!-- Preview body -->
        <div class="split-pane-body split-preview-body">
          <!-- Skeleton -->
          <div v-if="loading" class="skeleton-wrap">
            <div class="skeleton-line" style="width:50%;height:15px;margin-bottom:12px;" />
            <div class="skeleton-line" style="width:90%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:75%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:85%;height:12px;margin-bottom:18px;" />
            <div class="skeleton-line" style="width:40%;height:15px;margin-bottom:12px;" />
            <div class="skeleton-line" style="width:80%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:65%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:88%;height:12px;" />
          </div>
          <template v-else>
            <slot>
              <div v-if="emptyMessage" class="empty-msg">
                <Icon icon="info-circle" size="small" />
                <span>{{ emptyMessage }}</span>
              </div>
            </slot>
          </template>
        </div>
      </div>

    </div>
  </template>

  <!-- ════════════════════════════════════════════════════════════════════════
       MODE B — Floating panel  (USE_FLOATING_PANEL = true)
       Edit content renders inline on the page via the #edit slot.
       The toggle button + slide-in panel overlay on top.
       ════════════════════════════════════════════════════════════════════════ -->
  <template v-else>

    <!-- Edit content renders normally on the page -->
    <slot name="edit" />

    <!-- Toggle button fixed to right edge -->
    <button
      class="preview-toggle-btn"
      :class="{
        'preview-toggle-btn--stale': needsRefresh && !loading,
        'preview-toggle-btn--open':  isOpen,
      }"
      :title="isOpen ? 'Close preview' : 'Open chapter preview'"
      @click="togglePanel"
    >
      <Icon :icon="isOpen ? 'x' : 'eye'" size="small" style="color:inherit;flex-shrink:0;" />
      <span class="preview-toggle-label">{{ isOpen ? 'Close' : 'Preview' }}</span>
      <span v-if="needsRefresh && !loading && !isOpen" class="stale-dot" />
    </button>

    <!-- Backdrop -->
    <Transition name="backdrop">
      <div v-if="isOpen" class="preview-backdrop" @click="closePanel" />
    </Transition>

    <!-- Slide-in panel -->
    <Transition name="panel-slide">
      <div v-if="isOpen" class="preview-panel" :style="{ width: panelWidth + 'px' }">

        <!-- Resize handle -->
        <div
          class="resize-handle"
          :class="{ 'resize-handle--active': isResizing }"
          title="Drag to resize"
          @mousedown="startResize"
        >
          <div class="resize-grip"><span /><span /><span /></div>
        </div>

        <!-- Panel header -->
        <div class="panel-header">
          <div class="panel-header-left">
            <span class="panel-title">
              <Icon icon="eye" size="small" style="color:var(--color-primary-900,#14532d);margin-right:6px;" />
              Chapter Preview
            </span>
            <Transition name="fade">
              <span v-if="needsRefresh && !loading" class="stale-badge">
                <span class="stale-badge-dot" />
                Out of date
              </span>
            </Transition>
          </div>
          <button class="panel-close-btn" title="Close preview" @click="closePanel">
            <Icon icon="x" size="small" />
          </button>
        </div>

        <!-- Panel toolbar -->
        <div class="panel-toolbar">
          <div class="lang-select-wrap">
            <select v-model="selectedLanguage" class="lang-select">
              <option v-for="lang in languages" :key="lang.value" :value="lang.value">
                {{ lang.label }}
              </option>
            </select>
            <span class="lang-select-chevron">
              <Icon icon="chevron-down" size="small" />
            </span>
          </div>
          <button
            class="refresh-btn"
            :class="{ 'refresh-btn--stale': needsRefresh && !loading }"
            :disabled="loading"
            :style="loading ? { opacity:'0.6', cursor:'not-allowed' } : {}"
            :title="needsRefresh ? 'Content changed — refresh preview' : 'Refresh preview'"
            @click="handleRefresh"
          >
            <Icon icon="arrow-clockwise" size="small" :class="{ 'icon-spin': loading }" style="color:inherit" />
            <span>{{ loading ? 'Loading…' : 'Refresh' }}</span>
          </button>
          <Transition name="fade">
            <span v-if="isResizing" class="width-badge">{{ panelWidth }}px</span>
          </Transition>
        </div>

        <!-- Panel content -->
        <div class="panel-content">
          <div v-if="loading" class="skeleton-wrap">
            <div class="skeleton-line" style="width:50%;height:15px;margin-bottom:12px;" />
            <div class="skeleton-line" style="width:90%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:75%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:85%;height:12px;margin-bottom:18px;" />
            <div class="skeleton-line" style="width:40%;height:15px;margin-bottom:12px;" />
            <div class="skeleton-line" style="width:80%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:65%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:88%;height:12px;margin-bottom:18px;" />
            <div class="skeleton-line" style="width:45%;height:15px;margin-bottom:12px;" />
            <div class="skeleton-line" style="width:72%;height:12px;margin-bottom:8px;" />
            <div class="skeleton-line" style="width:60%;height:12px;" />
          </div>
          <template v-else>
            <slot>
              <div v-if="emptyMessage" class="empty-msg">
                <Icon icon="info-circle" size="small" />
                <span>{{ emptyMessage }}</span>
              </div>
            </slot>
          </template>
        </div>

      </div>
    </Transition>

  </template>

</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   SPLIT-VIEW STYLES  (USE_FLOATING_PANEL = false)
   ══════════════════════════════════════════════════════════════ */

.split-container {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  min-height: 400px;
  /* Prevent text selection flash while dragging */
}
.split-container--dragging * { user-select: none; }

/* ── Pane shared ── */
.split-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--color-neutral-200, #e5e7eb);
  border-radius: 10px;
}

/* ── Pane header bar ── */
.split-pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-neutral-200, #e5e7eb);
  background: var(--color-neutral-50, #f9fafb);
  flex-shrink: 0;
  min-height: 44px;
}

.split-pane-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-neutral-700, #374151);
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.split-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ── Pane scrollable body ── */
.split-pane-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.split-preview-body {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-neutral-800, #1f2937);
  line-height: 1.6;
}

/* Preview HTML content styles */
.split-preview-body :deep(table)  { width:100%;border-collapse:collapse;font-size:13px;margin:8px 0; }
.split-preview-body :deep(th),
.split-preview-body :deep(td)     { border:1px solid var(--color-neutral-200,#e5e7eb);padding:6px 10px;text-align:left; }
.split-preview-body :deep(th)     { background:var(--color-neutral-50,#f9fafb);font-weight:600; }
.split-preview-body :deep(h1),
.split-preview-body :deep(h2),
.split-preview-body :deep(h3)     { font-weight:700;color:var(--color-neutral-900,#111827);margin:12px 0 6px; }
.split-preview-body :deep(p)      { margin:4px 0 8px; }
.split-preview-body :deep(ul),
.split-preview-body :deep(ol)     { padding-left:20px;margin:6px 0; }

/* ── Draggable divider ── */
.split-divider {
  position: relative;
  flex-shrink: 0;
  width: 10px;
  cursor: col-resize;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-100, #f3f4f6);
  border-top: 1px solid var(--color-neutral-200, #e5e7eb);
  border-bottom: 1px solid var(--color-neutral-200, #e5e7eb);
  transition: background 0.15s;
  z-index: 10;
}
.split-divider:hover,
.split-divider--active {
  background: rgba(20, 83, 45, 0.1);
}
.split-divider--active { background: rgba(20, 83, 45, 0.18); }

/* Six-dot grip icon */
.split-divider-grip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  pointer-events: none;
}
.split-divider-grip span {
  display: block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-neutral-400, #9ca3af);
  transition: background 0.15s;
}
.split-divider:hover .split-divider-grip span,
.split-divider--active .split-divider-grip span {
  background: var(--color-primary-900, #14532d);
}

/* Live size badge shown while dragging */
.split-size-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) translateY(-28px);
  background: var(--color-primary-900, #14532d);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 3px 8px;
  border-radius: 20px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}

/* ══════════════════════════════════════════════════════════════
   FLOATING PANEL STYLES  (USE_FLOATING_PANEL = true)
   ══════════════════════════════════════════════════════════════ */

.preview-toggle-btn {
  position: fixed;
  right: 0; top: 50%;
  transform: translateY(-50%);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  background: var(--color-primary-900, #14532d);
  color: #fff;
  border: none;
  border-radius: 10px 0 0 10px;
  cursor: pointer;
  box-shadow: -3px 0 14px rgba(0,0,0,.18);
  transition: background .18s, box-shadow .18s;
}
.preview-toggle-btn:hover         { background: var(--color-primary-700, #15803d); box-shadow: -4px 0 18px rgba(0,0,0,.24); }
.preview-toggle-btn--open         { background: var(--color-neutral-700, #374151); }
.preview-toggle-btn--stale        { background: #b45309; animation: pulse-btn 1.8s ease-in-out infinite; }

.preview-toggle-label {
  font-size: 12px; font-weight: 600; letter-spacing: .04em;
  writing-mode: vertical-rl; text-orientation: mixed;
  transform: rotate(180deg); color: #fff;
}
.stale-dot {
  position: absolute; top: 8px; right: 8px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #fbbf24; border: 2px solid #fff;
}

.preview-backdrop { position:fixed;inset:0;z-index:1090;background:rgba(0,0,0,.25); }

.preview-panel {
  position: fixed; top:0; right:0; bottom:0;
  z-index: 1100;
  min-width: 300px; max-width: 90vw;
  display: flex; flex-direction: column;
  background: #fff;
  box-shadow: -6px 0 32px rgba(0,0,0,.16);
}

.resize-handle {
  position: absolute; left:0; top:0; bottom:0; width:8px;
  cursor: ew-resize; z-index:10;
  display:flex;align-items:center;justify-content:center;
  background:transparent; transition:background .15s; border-radius:4px 0 0 4px;
}
.resize-handle:hover, .resize-handle--active { background:rgba(20,83,45,.1); }
.resize-grip { display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none; }
.resize-grip span { display:block;width:3px;height:3px;border-radius:50%;background:var(--color-neutral-400,#9ca3af);transition:background .15s; }
.resize-handle:hover .resize-grip span,
.resize-handle--active .resize-grip span { background:var(--color-primary-900,#14532d); }

.width-badge {
  font-size:11px;font-weight:600;
  color:var(--color-primary-900,#14532d);
  background:rgba(20,83,45,.08);border:1px solid rgba(20,83,45,.2);
  border-radius:4px;padding:2px 7px;white-space:nowrap;flex-shrink:0;
}

.panel-header {
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 20px 16px 24px;
  border-bottom:1px solid var(--color-neutral-200,#e5e7eb);flex-shrink:0;
}
.panel-header-left { display:flex;align-items:center;gap:10px;flex-wrap:wrap; }
.panel-title { display:flex;align-items:center;font-size:16px;font-weight:700;color:var(--color-neutral-900,#111827); }
.panel-close-btn {
  display:flex;align-items:center;justify-content:center;
  width:30px;height:30px;
  background:var(--color-neutral-100,#f3f4f6);border:1px solid var(--color-neutral-200,#e5e7eb);
  border-radius:6px;cursor:pointer;color:var(--color-neutral-600,#4b5563);transition:background .15s;flex-shrink:0;
}
.panel-close-btn:hover { background:var(--color-neutral-200,#e5e7eb);color:var(--color-neutral-900,#111827); }

.panel-toolbar {
  display:flex;align-items:center;gap:8px;
  padding:10px 20px 10px 24px;
  border-bottom:1px solid var(--color-neutral-100,#f3f4f6);
  background:var(--color-neutral-50,#f9fafb);flex-shrink:0;
}

.panel-content {
  flex:1;overflow-y:auto;
  padding:20px 20px 20px 24px;
  font-size:14px;font-weight:400;
  color:var(--color-neutral-800,#1f2937);line-height:1.6;
}
.panel-content :deep(table)  { width:100%;border-collapse:collapse;font-size:13px;margin:8px 0; }
.panel-content :deep(th),
.panel-content :deep(td)     { border:1px solid var(--color-neutral-200,#e5e7eb);padding:6px 10px;text-align:left; }
.panel-content :deep(th)     { background:var(--color-neutral-50,#f9fafb);font-weight:600; }
.panel-content :deep(h1),
.panel-content :deep(h2),
.panel-content :deep(h3)     { font-weight:700;color:var(--color-neutral-900,#111827);margin:12px 0 6px; }
.panel-content :deep(p)      { margin:4px 0 8px; }
.panel-content :deep(ul),
.panel-content :deep(ol)     { padding-left:20px;margin:6px 0; }

/* ══════════════════════════════════════════════════════════════
   SHARED
   ══════════════════════════════════════════════════════════════ */

.lang-select-wrap { position:relative;display:flex;align-items:center;flex:1; }
.lang-select {
  appearance:none;-webkit-appearance:none;width:100%;background:#fff;
  border:1px solid var(--color-neutral-300,#d1d5db);border-radius:5px;
  padding:5px 28px 5px 10px;font-size:12px;font-weight:500;
  color:var(--color-neutral-700,#374151);cursor:pointer;outline:none;line-height:1.4;
}
.lang-select-chevron { position:absolute;right:8px;pointer-events:none;display:flex;align-items:center;color:var(--color-neutral-500,#6b7280); }

.refresh-btn {
  display:flex;align-items:center;gap:5px;background:#fff;
  border:1px solid var(--color-neutral-300,#d1d5db);border-radius:5px;padding:5px 12px;
  font-size:12px;font-weight:500;color:var(--color-neutral-700,#374151);
  cursor:pointer;transition:background .15s,border-color .15s,color .15s,box-shadow .15s;
  white-space:nowrap;flex-shrink:0;
}
.refresh-btn:hover:not(:disabled) { background:rgba(184,180,164,.18);border-color:#ad4e02; }
.refresh-btn--stale {
  background:#fffbeb;border-color:#f59e0b;color:#b45309;
  box-shadow:0 0 0 2px rgba(245,158,11,.2);animation:pulse-border 1.8s ease-in-out infinite;
}
.refresh-btn--stale:hover:not(:disabled) { background:#fef3c7;border-color:#d97706; }

.stale-badge {
  display:inline-flex;align-items:center;gap:5px;
  font-size:11px;font-weight:600;color:#b45309;
  background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;padding:2px 8px;
  flex-shrink: 0;
}
.stale-badge-dot { width:6px;height:6px;border-radius:50%;background:#f59e0b;flex-shrink:0; }

.empty-msg { display:flex;align-items:center;gap:8px;font-size:14px;color:var(--color-neutral-500,#6b7280); }

.skeleton-wrap { padding:4px 0; }
.skeleton-line {
  border-radius:4px;
  background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
  background-size:600px 100%;
  animation:shimmer 1.4s infinite linear;
}

/* ── Animations ── */
@keyframes shimmer     { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
@keyframes spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes pulse-border { 0%,100%{box-shadow:0 0 0 2px rgba(245,158,11,.2)} 50%{box-shadow:0 0 0 4px rgba(245,158,11,.35)} }
@keyframes pulse-btn    { 0%,100%{box-shadow:-3px 0 14px rgba(180,83,9,.3)} 50%{box-shadow:-3px 0 22px rgba(180,83,9,.55)} }

.icon-spin { animation:spin 1s linear infinite; }

/* ── Transitions ── */
.panel-slide-enter-active, .panel-slide-leave-active { transition:transform .3s cubic-bezier(.4,0,.2,1); }
.panel-slide-enter-from,   .panel-slide-leave-to     { transform:translateX(100%); }
.backdrop-enter-active, .backdrop-leave-active { transition:opacity .25s ease; }
.backdrop-enter-from,   .backdrop-leave-to     { opacity:0; }
.fade-enter-active, .fade-leave-active { transition:opacity .3s ease; }
.fade-enter-from,   .fade-leave-to     { opacity:0; }
</style>