<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import { Alert, Button, CheckboxGroup, FieldDisplay, FormField, PageHeader, Card } from '@upov/upov-ui';
import type { StatusBadgeVariant } from '@upov/upov-ui';

const router = useRouter();
const authStore = useAuthStore();

const roleLabelMap: Record<string, string> = { ADM: 'Admin', EXP: 'Expert', TRN: 'Translator' };
const roleVariantMap: Record<string, StatusBadgeVariant> = { ADM: 'info', EXP: 'success', TRN: 'warning' };
const roleCode = computed(() => authStore.user?.roles?.[0] || '');
const roleLabel = computed(() => roleLabelMap[roleCode.value] || roleCode.value);
const roleVariant = computed<StatusBadgeVariant>(() => roleVariantMap[roleCode.value] || 'neutral');

const twpCodes = ref<string[]>(
  authStore.user?.twps
    ? authStore.user.twps.split(',').map((c) => c.trim()).filter(Boolean)
    : []
);
const twpOptions = [
  { value: 'TWA', label: 'TWA - Agricultural Crops' },
  { value: 'TWF', label: 'TWF - Fruit Crops' },
  { value: 'TWO', label: 'TWO - Ornamental Plants' },
  { value: 'TWV', label: 'TWV - Vegetables' },
];

const saving = ref(false);
const error = ref<string | null>(null);

const selectedTwps = computed(() => twpCodes.value.join(','));

const hasChanges = computed(() => {
  const current = authStore.user?.twps || '';
  return selectedTwps.value !== current;
});

const isValid = computed(() => twpCodes.value.length > 0 && hasChanges.value);

async function handleSave() {
  if (!isValid.value) return;
  saving.value = true;
  error.value = null;
  try {
    const res = await api.patch<{ message: string; twps: string; assigned: number }>('/api/profile/twps', {
      twps: selectedTwps.value,
    });
    await authStore.fetchUser();
    const msg = res.data.assigned > 0
      ? `TWPs updated. You were assigned as IE to ${res.data.assigned} new test guideline(s).`
      : 'TWPs updated.';
    sessionStorage.setItem('toast', msg);
    router.push('/test-guidelines');
  } catch (err: unknown) {
    error.value = 'Failed to update TWPs. Please try again.';
    console.error('Update TWPs error:', err);
  } finally {
    saving.value = false;
  }
}

async function handleLogout() {
  await router.push('/login');
  authStore.logout();
}

function handleClose() {
  router.back();
}
</script>

<template>
  <div class="profile-page">
    <Card elevation="medium" max-width="560px">
      <div class="profile-header">
        <PageHeader title="Profile" :status-badge-label="roleLabel" :status-badge-variant="roleVariant" borderless />
        <Button type="tertiary" size="xs" icon-left="x-lg" icon-only title="Close" @click="handleClose" />
      </div>

      <div class="profile-info">
        <FieldDisplay label="Username" :value="authStore.user?.username || ''" label-width="120px" />
        <FieldDisplay label="Full Name" :value="authStore.user?.name || ''" label-width="120px" />
        <FieldDisplay label="Email" :value="authStore.user?.email || ''" label-width="120px" />
        <FieldDisplay label="Organization" :value="authStore.user?.officeCode || ''" label-width="120px" />
      </div>

      <Alert v-if="error" variant="error" class="profile-alert">{{ error }}</Alert>

      <div v-if="!authStore.isAdmin" class="profile-form">
        <FormField label="Technical Working Parties">
          <CheckboxGroup v-model="twpCodes" :options="twpOptions" />
        </FormField>

        <div class="profile-actions">
          <Button type="danger" icon-left="box-arrow-right" @click="handleLogout">Logout</Button>
          <div class="profile-actions-end">
            <Button type="primary" :disabled="!isValid || saving" @click="handleSave">
              {{ saving ? 'Saving...' : 'Save' }}
            </Button>
          </div>
        </div>

      </div>
      <div v-else class="profile-actions">
        <Button type="danger" icon-left="box-arrow-right" @click="handleLogout">Logout</Button>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-neutral-200);
  padding-bottom: 12px;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
  margin-bottom: 24px;
}

.profile-alert {
  margin-bottom: 16px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--color-neutral-200);
}

.profile-actions-end {
  display: flex;
  gap: 12px;
}

</style>
