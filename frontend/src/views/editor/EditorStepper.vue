<script setup lang="ts">
import { computed } from 'vue';
import { Stepper } from '@upov/upov-ui';
import type { Step } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';

const store = useEditorStore();

const steps = computed<Step[]>(() =>
  store.chapterList.map((ch, idx) => ({
    number: ch.stepperLabel ?? String(Number(ch.number)),
    title: ch.sidebarTitle,
    state: idx === store.activeChapterIndex ? 'active' : 'inactive' as const,
  })),
);

function onStepClick(step: Step) {
  const idx = steps.value.findIndex((s) => s.number === step.number);
  if (idx >= 0) {
    store.goToChapter(idx);
  }
}

function onCollapseToggle() {
  store.toggleChapterNav();
}
</script>

<template>
  <Stepper
    :steps="steps"
    :collapsed="store.chapterNavCollapsed"
    @step-click="onStepClick"
    @collapse-toggle="onCollapseToggle"
  />
</template>