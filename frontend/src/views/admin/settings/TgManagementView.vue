<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { PageHeader, StatCard, Icon } from '@upov/upov-ui';
import TgWizard from '@/components/common/NewTgWizard.vue';

const router = useRouter();
const route = useRoute();
const activeMode = ref<'create' | 'edit' | 'copy' | null>(null);
const preloadTgId = ref<number | undefined>();

onMounted(() => {
  const tgId = route.query.tgId;
  if (tgId) {
    preloadTgId.value = Number(tgId);
    activeMode.value = 'copy';
  }
});

function setMode(mode: 'create' | 'edit' | 'copy') {
  if (activeMode.value === mode) {
    activeMode.value = null;
    preloadTgId.value = undefined;
    router.replace({ query: {} });
  } else {
    activeMode.value = mode;
    if (mode === 'create') preloadTgId.value = undefined;
  }
}

function onDone(id: number) {
  activeMode.value = null;
  preloadTgId.value = undefined;
  router.replace({ query: {} });
  router.push(`/admin/test-guidelines/${id}`);
}

function onCancel() {
  activeMode.value = null;
  preloadTgId.value = undefined;
  router.replace({ query: {} });
}
</script>

<template>
  <div class="settings-page">
    <PageHeader title="TG Management" subtitle="Create, edit, or copy test guideline records" />

    <div class="mode-cards">
      <StatCard
        label="Copy Existing TG"
        :active="activeMode === 'copy'"
        class="mode-card"
        @click="setMode('copy')"
      >
        <Icon icon="files" size="medium" />
      </StatCard>
      <StatCard
        label="Edit Existing TG"
        :active="activeMode === 'edit'"
        class="mode-card"
        @click="setMode('edit')"
      >
        <Icon icon="pencil" size="medium" />
      </StatCard>
      <StatCard
        label="Create New TG"
        :active="activeMode === 'create'"
        class="mode-card"
        @click="setMode('create')"
      >
        <Icon icon="plus-circle" size="medium" />
      </StatCard>
    </div>

    <TgWizard
      v-if="activeMode"
      :key="activeMode + '-' + (preloadTgId || '')"
      :mode="activeMode"
      :source-id="preloadTgId"
      @cancel="onCancel"
      @done="onDone"
    />
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1400px;
  margin: 0 auto;
}

.settings-page :deep(.page-header),
.settings-page :deep([class*="page-header"]) {
  box-shadow: none !important;
  border-radius: 0 !important;

}

.mode-cards {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  margin-bottom: 24px;
}

.mode-card {
  background: color-mix(in srgb, var(--color-primary-green) 6%, transparent);
  border-color: transparent;
}

.mode-card:hover {
  background: color-mix(in srgb, var(--color-primary-green) 6%, transparent);
}

.mode-card :deep(.icon-atom__bi) {
  border-radius: 50%;
}

.mode-card.stat-card--active :deep(.icon-atom__bi),
.mode-card:hover :deep(.icon-atom__bi) {
  background-color: var(--color-primary-green-light);
}

.mode-card.stat-card--active {
  border-color: var(--color-primary-green-dark);
}
</style>