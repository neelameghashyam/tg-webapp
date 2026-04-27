<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { SidebarNav } from '@upov/upov-ui';
import type { SidebarNavItem, SidebarUser } from '@upov/upov-ui';
import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';

const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const collapsed = ref(false);

/**
 * True for admin OR EDC members.
 * isEdcMember is populated by /api/auth/me once the backend adds the field.
 */
const canSeeTcEdc = computed(
  () => authStore.isAdmin || authStore.user?.isEdcMember === true,
);

const items = computed<SidebarNavItem[]>(() => [
  // ── TWP Projects ─────────────────────────────────────────────────────────
  {
    id: 'twp-projects',
    label: 'TWP Projects',
    icon: 'file-earmark-text',
    defaultExpanded: true,
    children: [
      {
        id: 'twp-projects-drafting',
        label: 'Drafting',
        icon: 'pencil',
        to: '/test-guidelines/twp-projects/drafting',
        badge: dashboardStore.stats.twpDrafts || undefined,
      },
      {
        id: 'twp-projects-discussion',
        label: 'For Discussion',
        icon: 'mic',
        to: '/test-guidelines/twp-projects/discussion',
        badge: dashboardStore.stats.twpDiscussion || undefined,
      },
    ],
  },

  // ── TC-EDC Projects (admin + EDC members) ────────────────────────────────
  {
    id: 'tc-edc-projects',
    label: 'TC-EDC Projects',
    icon: 'file-earmark-text',
    visible: canSeeTcEdc.value,
    defaultExpanded: true,
    children: [
      {
        id: 'tc-edc-projects-drafting',
        label: 'Drafting',
        icon: 'pencil',
        to: '/test-guidelines/tc-edc-projects/drafting',
        badge: dashboardStore.stats.tcEdcDrafting || undefined,
      },
      {
        id: 'tc-edc-projects-discussion',
        label: 'For Discussion',
        icon: 'mic',
        to: '/test-guidelines/tc-edc-projects/discussion',
        badge: dashboardStore.stats.tcEdcDiscussion || undefined,
      },
    ],
  },

  // ── Flat items ────────────────────────────────────────────────────────────
  {
    id: 'adopted',
    label: 'Adopted',
    icon: 'check-circle',
    to: '/test-guidelines/adopted',
    visible: authStore.isAdmin,
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: 'archive',
    to: '/test-guidelines/archived',
  },
  // aborted removed — ABT records stay in DB, not surfaced in UI
]);

const bottomItems = computed<SidebarNavItem[]>(() => [
  {
    id: 'users',
    label: 'Users',
    icon: 'people',
    to: '/admin/users',
    visible: authStore.isAdmin,
    dot: !!dashboardStore.stats.pendingRequests,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'gear',
    visible: authStore.isAdmin,
    children: [
      { id: 'tg-management',    label: 'TG Management',    to: '/admin/settings/tg-management' },
      { id: 'technical-bodies', label: 'Technical Bodies', to: '/admin/settings/technical-bodies' },
    ],
  },
]);

const roleLabelMap: Record<string, string> = {
  ADM: 'Admin',
  EXP: 'Expert',
  TRN: 'Translator',
};

const user = computed<SidebarUser | undefined>(() => {
  if (!authStore.user) return undefined;
  const roleCode = authStore.user.roles?.[0];
  const roleLabel = roleCode ? roleLabelMap[roleCode] || roleCode : '';
  return {
    name: authStore.user.name,
    subtitle: roleLabel || undefined,
  };
});

onMounted(() => {
  if (authStore.isAuthenticated) {
    dashboardStore.fetchStats();
  }
});
</script>

<template>
  <SidebarNav
    v-if="authStore.isAuthenticated"
    v-model:collapsed="collapsed"
    :items="items"
    :bottom-items="bottomItems"
    :user="user"
    @user-click="$router.push('/profile')"
  />
</template>