<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { Card, Button, SaveStatus, useConfirmDialog } from '@upov/upov-ui';
import { useEditorStore } from '@/stores/editor';
import { useAuthStore } from '@/stores/auth';
import type { TGStatus } from '@/types';
import api from '@/services/api';

const store = useEditorStore();
const authStore = useAuthStore();
const { confirm } = useConfirmDialog();

const actionLoading = ref(false);

const mainCommonName = computed(() => store.tg?.TG_Name ?? '');
const upovCodesStr = computed(() => store.upovCodes.map((uc) => uc.code).join('; '));
const documentName = computed(() => store.tg?.TG_Reference ?? '');
const tgStatus = computed(() => (store.tg?.Status_Code as TGStatus) ?? 'CRT');
const tgId = computed(() => store.tg?.TG_ID ?? null);

// Force reactivity by using a ref that updates periodically
const currentTime = ref(Date.now());
let intervalId: ReturnType<typeof setInterval> | null = null;

const lastUpdated = computed(() => {
  if (!store.tg?.TG_lastupdated) return '';
  
  // Parse the timestamp - the backend returns ISO strings with 'Z' (UTC)
  let date: Date;
  const timestamp = store.tg.TG_lastupdated;
  
  try {
    // Check if it's already a Date object
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // The backend with timezone: 'Z' returns ISO strings like "2026-04-07T07:18:20.000Z"
      // JavaScript Date constructor handles this correctly
      date = new Date(timestamp);
    } else {
      console.warn('Unexpected timestamp type:', typeof timestamp, timestamp);
      return '';
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', timestamp);
      return '';
    }
    
    // Use currentTime.value to force reactivity
    const now = currentTime.value;
    const diffMs = now - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 10) return 'Saved: just now';
    if (diffSecs < 60) return 'Saved: a few seconds ago';
    if (diffMins === 1) return 'Saved: a minute ago';
    if (diffMins < 60) return `Saved: ${diffMins} minutes ago`;
    if (diffHours === 1) return 'Saved: an hour ago';
   // if (diffHours < 24) return `Saved: ${diffHours} hours ago`;
    
    // For older timestamps, show the full date and time in user's local timezone
    // toLocaleDateString and toLocaleTimeString automatically convert to browser's timezone
    const datePart = date.toLocaleDateString(undefined, { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const timePart = date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    return `Saved: ${datePart}, ${timePart}`;
  } catch (error) {
    console.error('Error parsing timestamp:', error, timestamp);
    return '';
  }
});

// Update current time every 30 seconds to keep the relative time fresh
onMounted(() => {
  intervalId = setInterval(() => {
    currentTime.value = Date.now();
  }, 30000); // Update every 30 seconds
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

// ── LE Actions ─────────────────────────────────────────────────────────────

/**
 * Check if current user can perform LE actions.
 * Returns true for admin or assigned LE.
 */
const canPerformLeActions = computed(() => {
  if (!tgId.value) return false;
  if (authStore.isAdmin) return true;
  // Check if user is assigned as LE for this TG
  const users = store.tg?.users || [];
  return users.some(
    (u) => u.role === 'LE' && u.id === authStore.user?.id
  );
});

/**
 * Show "Send for Comments" button when:
 * - Status is LED
 * - User is admin or assigned LE
 */
const showSendForComments = computed(() => {
  return tgStatus.value === 'LED' && canPerformLeActions.value;
});

/**
 * Show "Sign Off" button when:
 * - Status is LEC
 * - User is admin or assigned LE
 */
const showSignOff = computed(() => {
  return tgStatus.value === 'LEC' && canPerformLeActions.value;
});

/**
 * LED → IEC (early trigger, before IE_Comments_StartDate)
 */
async function onSendForComments() {
  const ok = await confirm({
    title: 'Send for Comments',
    message: 'The IE commenting period will begin. You will lose edit access. Continue?',
    variant: 'default',
  });
  if (!ok) return;

  actionLoading.value = true;
  try {
    await api.post(`/api/test-guidelines/${tgId.value}/send-for-comments`);
    // Reload TG data to reflect new status
    if (tgId.value) await store.load(tgId.value);
  } catch (err: any) {
    console.error('Send for comments failed:', err);
    alert(err.response?.data?.error?.message || 'Failed to send for comments');
  } finally {
    actionLoading.value = false;
  }
}

/**
 * LEC → LES (LE sign-off, deactivates IEs)
 */
async function onSignOff() {
  const ok = await confirm({
    title: 'Sign Off',
    message: 'The drafting period will end. You will lose edit rights. Continue?',
    variant: 'danger',
    confirmLabel: 'Sign Off',
  });
  if (!ok) return;

  actionLoading.value = true;
  try {
    await api.post(`/api/test-guidelines/${tgId.value}/sign-off`);
    // Reload TG data to reflect new status
    if (tgId.value) await store.load(tgId.value);
  } catch (err: any) {
    console.error('Sign off failed:', err);
    alert(err.response?.data?.error?.message || 'Failed to sign off');
  } finally {
    actionLoading.value = false;
  }
});
</script>

<template>
  <Card elevation="low" padding="compact">
    <div class="header-row">
      <!-- Left: name + code inline -->
      <div class="header-info">
        <span class="header-name">{{ mainCommonName }}</span>
        <span class="header-divider">·</span>
        <span class="header-code">{{ upovCodesStr }}</span>
      </div>

      <!-- Right: doc ref + save status + submit -->
      <div class="header-actions">
        <div class="header-meta">
          <span class="header-doc-name">{{ documentName }}</span>
          <SaveStatus :status="store.saveStatus" :idle-message="lastUpdated" />
        </div>
        <Button
          v-if="showSendForComments"
          type="primary"
          icon-left="send"
          :disabled="actionLoading"
          @click="onSendForComments"
        >
          {{ actionLoading ? 'Sending...' : 'Send for Comments' }}
        </Button>
        <Button
          v-else-if="showSignOff"
          type="primary"
          icon-left="check-circle"
          :disabled="actionLoading"
          @click="onSignOff"
        >
          {{ actionLoading ? 'Signing Off...' : 'Sign Off' }}
        </Button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.header-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary-green-dark);
  line-height: 20px;
  white-space: nowrap;
}

.header-divider {
  font-size: 14px;
  color: var(--color-neutral-300);
}

.header-code {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-500);
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.header-doc-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-neutral-500);
  line-height: 16px;
}
</style>