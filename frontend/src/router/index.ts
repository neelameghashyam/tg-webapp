import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    requiresAccess?: boolean;
    requiresTcEdc?: boolean;  // admin OR EDC member
  }
}

const routes: RouteRecordRaw[] = [
  // Landing → TWP Projects / Drafting
  {
    path: '/',
    name: 'dboard',
    redirect: '/test-guidelines/twp-projects/drafting',
  },
  // Dashboard kept in codebase but hidden from sidebar
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, requiresAccess: true },
  },

  // ── Test Guidelines ──────────────────────────────────────────────────────
  {
    path: '/test-guidelines',
    component: () => import('@/views/test-guidelines/TestGuidelinesLayout.vue'),
    meta: { requiresAuth: true, requiresAccess: true },
    children: [
      { path: '', redirect: '/test-guidelines/twp-projects/drafting' },

      // TWP Projects
      {
        path: 'twp-projects/drafting',
        name: 'tg-twp-drafting',
        component: () => import('@/views/test-guidelines/TwpDraftingView.vue'),
      },
      {
        path: 'twp-projects/discussion',
        name: 'tg-twp-discussion',
        component: () => import('@/views/test-guidelines/TwpDiscussionView.vue'),
      },

      // TC-EDC Projects (admin + EDC members)
      {
        path: 'tc-edc-projects/drafting',
        name: 'tg-tc-edc-drafting',
        meta: { requiresTcEdc: true },
        component: () => import('@/views/test-guidelines/TcEdcDraftingView.vue'),
      },
      {
        path: 'tc-edc-projects/discussion',
        name: 'tg-tc-edc-discussion',
        meta: { requiresTcEdc: true },
        component: () => import('@/views/test-guidelines/TcEdcDiscussionView.vue'),
      },

      // Flat views
      {
        path: 'adopted',
        name: 'tg-adopted',
        meta: { requiresAdmin: true },
        component: () => import('@/views/test-guidelines/StatusView.vue'),
        props: {
          tab: 'adopted',
          sortKey: 'adoptionDate',
          twpCountsKey: 'adopted',
          dateColumn: { key: 'adoptionDate', label: 'Adoption Date' },
          showStatCards: false,
          statusOptions: [
            { value: 'ADT', label: 'Adopted' },
            { value: 'ADC', label: 'Adopted by Correspondence' },
          ],
        },
      },
      {
        path: 'archived',
        name: 'tg-archived',
        component: () => import('@/views/test-guidelines/StatusView.vue'),
        props: {
          tab: 'archived',
          sortKey: 'statusDate',
          twpCountsKey: 'archived',
          dateColumn: { key: 'statusDate', label: 'Archived Date' },
          showStatCards: false,
        },
      },

      // Legacy redirects — keep old URLs working during transition
      { path: 'twp-drafts',  redirect: '/test-guidelines/twp-projects/drafting' },
      { path: 'tc-drafts',   redirect: '/test-guidelines/tc-edc-projects/drafting' },
      // aborted and submitted routes removed
    ],
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, requiresAccess: true },
  },
  {
    path: '/admin/settings/tg-management',
    name: 'settings-tg-management',
    component: () => import('@/views/admin/settings/TgManagementView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, requiresAccess: true },
  },
  {
    path: '/admin/settings/user-assignments',
    name: 'settings-user-assignments',
    component: () => import('@/views/admin/settings/UserAssignmentsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, requiresAccess: true },
  },
  {
    path: '/admin/settings/technical-bodies',
    name: 'settings-technical-bodies',
    component: () => import('@/views/admin/settings/TechnicalBodiesView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, requiresAccess: true },
  },
  {
    path: '/admin/settings/asw-data',
    name: 'settings-asw-data',
    component: () => import('@/views/admin/settings/AswDataView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, requiresAccess: true },
  },
  {
    path: '/admin/test-guidelines',
    name: 'admin-test-guidelines',
    component: () => import('@/views/admin/TestGuidelinesView.vue'),
    meta: { requiresAuth: true, requiresAccess: true },
  },

  // ── Editor ───────────────────────────────────────────────────────────────
  {
    path: '/test-guidelines/:id/preview',
    name: 'tg-doc-preview',
    component: () => import('@/views/test-guidelines/TgDocPreview.vue'),
    meta: { requiresAuth: true, requiresAccess: true },
  },
  {
    path: '/admin/test-guidelines/:id',
    name: 'editor',
    component: () => import('@/views/editor/EditorView.vue'),
    meta: { requiresAuth: true, requiresAccess: true },
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, requiresAccess: true },
  },
  {
    path: '/access-request',
    name: 'access-request',
    component: () => import('@/views/AccessRequestView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallback.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchUser();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresAccess && (authStore.needsAccessRequest || authStore.isPendingApproval)) {
    return next({ name: 'access-request' });
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'tg-twp-drafting' });
  }

  // TC-EDC routes: allow admin OR EDC members
  if (to.meta.requiresTcEdc) {
    const isEdcMember = authStore.user?.isEdcMember === true;
    if (!authStore.isAdmin && !isEdcMember) {
      return next({ name: 'tg-twp-drafting' });
    }
  }

  return next();
});

export default router;