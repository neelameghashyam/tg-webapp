<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch, watchEffect } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { Skeleton, PageHeader, SaveStatus, useToast, Button } from '@upov/upov-ui';
import type { TGStatus } from '@/types';
import { STATUS_LABELS, STATUS_VARIANTS } from '@/config/constants';
import { useEditorStore } from '@/stores/editor';
import EditorStepper from './EditorStepper.vue';
import EditorFooter from './EditorFooter.vue';

// Store-connected chapter components
import Chapter00CoverPage from '@/components/editor/chapters/Chapter00CoverPage.vue';
import Chapter01Subject from '@/components/editor/chapters/Chapter01Subject.vue';
import Chapter05Grouping from '@/components/editor/chapters/Chapter05Grouping.vue';
import Chapter06Characteristics from '@/components/editor/chapters/Chapter06Characteristics.vue';
import Chapter09Literature from '@/components/editor/chapters/Chapter09Literature.vue';
import Chapter11Annex from '@/components/editor/chapters/Chapter11Annex.vue';

import Chapter02Material from '@/components/editor/chapters/Chapter02Material.vue';
import Chapter03Examination from '@/components/editor/chapters/Chapter03Examination.vue';
import Chapter04Assessment from '@/components/editor/chapters/Chapter04Assessment.vue';

import Chapter07Table from '@/components/editor/chapters/Chapter07Table.vue';
import Chapter08Explanations from '@/components/editor/chapters/Chapter08Explanations.vue';
import Chapter10TechQuestionnaire from '@/components/editor/chapters/Chapter10TechQuestionnaire.vue';

const route = useRoute();
const router = useRouter();
const store = useEditorStore();
const toast = useToast();

onMounted(() => {
  const id = Number(route.params.id);
  if (id) {
    store.load(id);
  }

  // Restore chapter from URL hash (e.g. #chapter-07)
  const match = route.hash.match(/^#chapter-(\d{2})$/);
  if (match) {
    const index = store.chapterList.findIndex((c) => c.number === match[1]);
    if (index >= 0) store.goToChapter(index);
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
});

// Sync active chapter → URL hash, and scroll content area back to top.
// This covers ALL navigation sources: stepper, footer prev/next, and direct URL.
watch(() => store.activeChapterIndex, (index) => {
  const chapter = store.chapterList[index];
  if (chapter) {
    router.replace({ hash: `#chapter-${chapter.number}` });
  }
  const appContent = document.querySelector<HTMLElement>('.app-content');
  if (appContent) {
    appContent.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

// Warn on browser close/refresh if unsaved changes
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (store.dirty.size > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
}

// Warn on in-app navigation if unsaved changes
onBeforeRouteLeave(() => {
  if (store.dirty.size > 0) {
    return window.confirm('You have unsaved changes. Leave anyway?');
  }
});

// Map chapter index → component.
// Chapters without a dedicated component yet fall back to a placeholder.
const chapterComponents = [
  Chapter00CoverPage,         // 0 → ch00
  Chapter01Subject,           // 1 → ch01
  Chapter02Material,          // 2 → ch02
  Chapter03Examination,       // 3 → ch03
  Chapter04Assessment,        // 4 → ch04
  Chapter05Grouping,          // 5 → ch05
  Chapter06Characteristics,   // 6 → ch06
  Chapter07Table,             // 7 → ch07
  Chapter08Explanations,      // 8 → ch08
  Chapter09Literature,        // 9 → ch09
  Chapter10TechQuestionnaire, // 10 → ch10
  Chapter11Annex,             // 11 → ch11
];

const ActiveChapter = computed(
  () => chapterComponents[store.activeChapterIndex] ?? Chapter00CoverPage,
);

const tgStatus = computed(() => (store.tg?.Status_Code as TGStatus) ?? 'CRT');

const lastUpdated = computed(() => {
  if (!store.tg?.TG_lastupdated) return '';
  const date = new Date(store.tg.TG_lastupdated);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMins < 1) return 'Last Saved: a few seconds ago';
  if (diffMins === 1) return 'Last Saved: a minute ago';
  if (diffMins < 60) return `Last Saved: ${diffMins} minutes ago`;
  const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `Last Saved: ${datePart}, ${timePart}`;
});

const headerActions = computed(() => [
  { id: 'submit', label: 'Submit', variant: 'primary', icon: 'check-circle' },
]);

function backToDashboard() {
  router.push({ name: 'admin-test-guidelines' });
}

// Show save errors via DS toast system
watchEffect(() => {
  if (store.saveStatus === 'error' && store.lastSaveError) {
    toast.show(store.lastSaveError, { variant: 'error' });
    store.dismissSaveError();
  }
});
</script>

<template>
  <div ref="editorRoot" class="editor-root">
    <!-- Top bar -->
    <PageHeader
      v-if="!store.loading && !store.error"
      :title="store.tg?.TG_Reference ?? ''"
      :status-label="store.tg?.TG_Name ?? ''"
      :status-badge-label="STATUS_LABELS[tgStatus]"
      :status-badge-variant="STATUS_VARIANTS[tgStatus]"
      :actions="headerActions"
      back-label="TG Dashboard"
      borderless
      @back="backToDashboard"
    />
    <div v-if="!store.loading && !store.error" class="editor-save-row">
      <SaveStatus :status="store.saveStatus" :idle-message="lastUpdated" />
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading" class="skel">
      <div class="skel-header">
        <Skeleton width="45%" height="18px" />
        <Skeleton width="30%" height="14px" />
      </div>
      <div class="skel-body">
        <div class="skel-sidebar">
          <Skeleton v-for="n in 6" :key="n" width="60%" height="14px" />
        </div>
        <div class="skel-content">
          <Skeleton width="45%" height="18px" />
          <Skeleton width="100%" height="14px" />
          <Skeleton width="100%" height="14px" />
          <Skeleton width="60%" height="14px" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="store.error" class="editor-error">
      <p>{{ store.error }}</p>
      <Button type="tertiary" icon-left="arrow-left" @click="backToDashboard">Return to dashboard</Button>
    </div>

    <!-- Editor -->
    <template v-else>
      <div class="editor-layout">
        <EditorStepper />

        <main class="editor-main">
          <h1 class="editor-chapter-title">
            {{ store.activeChapter.stepperLabel ?? store.activeChapterNumber }}. {{ store.activeChapterTitle }}
          </h1>

          <KeepAlive>
            <component :is="ActiveChapter" :key="store.activeChapterIndex" />
          </KeepAlive>
        </main>
      </div>

      <EditorFooter />
    </template>
  </div>
</template>

<style scoped>
/* ── Reset ─────────────────────────────────────────────────────────────────── */
.editor-root *, .editor-root *::before, .editor-root *::after { box-sizing: border-box; }
.editor-root h1, .editor-root h2, .editor-root h3, .editor-root p, .editor-root ul { margin: 0; padding: 0; }
.editor-root ul     { list-style: none; }
.editor-root a      { color: inherit; }
.editor-root button { font-family: 'Figtree', 'Segoe UI', Arial, sans-serif; cursor: pointer; }

.editor-save-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -12px;
  margin-bottom: -8px;
  height: 20px;
}


.editor-root {
  font-family: 'Figtree', sans-serif;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--color-neutral-800);
}

.editor-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 64px 0;
  color: var(--color-danger, #D32F2F);
}

.editor-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.editor-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.editor-chapter-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary-green-dark);
  line-height: 27px;
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */
.skel { display: flex; flex-direction: column; gap: 24px; }
.skel-header { background: #fff; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skel-body { display: flex; gap: 24px; }
.skel-sidebar { width: 220px; flex-shrink: 0; background: #fff; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.skel-content { flex: 1; background: #fff; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

/* ── TinyMCE overrides (centralized from EditorHeader + Ch08) ─────────── */
.editor-root :deep(.tox-tinymce) { border: 1px solid var(--color-primary-green-dark) !important; border-radius: 4px !important; }
.editor-root :deep(.tox-toolbar__primary) { background: #fff !important; border-bottom: 1px solid var(--color-neutral-200) !important; }
.editor-root :deep(.tox-toolbar-overlord) { background: #fff !important; }
.editor-root :deep(.tox .tox-tbtn svg) { fill: var(--color-primary-green-dark) !important; }
.editor-root :deep(.tox .tox-tbtn:hover) { background: rgba(28,66,64,0.06) !important; }
.editor-root :deep(.tox .tox-statusbar) { border-top: 1px solid var(--color-neutral-200) !important; }
.editor-root :deep(.tox-statusbar__branding) { display: none; }
</style>