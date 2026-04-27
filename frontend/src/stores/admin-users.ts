import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { PendingUser, AdminUser } from '@/types';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export const useAdminUsersStore = defineStore('admin-users', () => {
  const pendingUsers = ref<PendingUser[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const roleCounts = ref<Record<string, number>>({ ADM: 0, EXP: 0, TRN: 0 });
  const countsLoading = ref(false);

  // User list — server-side search/sort/paginate
  const users = ref<AdminUser[]>([]);
  const meta = ref<PaginationMeta>({ page: 1, limit: 10, total: 0 });
  const loadingUsers = ref(false);

  // Query state
  const role = ref('all');
  const search = ref('');
  const sort = ref('lastUpdated');
  const order = ref<'asc' | 'desc'>('desc');

  async function fetchPendingUsers() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<{ items: PendingUser[] }>('/api/admin/access-requests');
      pendingUsers.value = res.data.items;
    } catch (err) {
      console.error('Failed to fetch pending users:', err);
      error.value = 'Failed to load pending requests.';
    } finally {
      loading.value = false;
    }
  }

  async function fetchRoleCounts() {
    countsLoading.value = true;
    try {
      const res = await api.get<{ counts: Record<string, number> }>('/api/admin/users/counts');
      roleCounts.value = { ADM: 0, EXP: 0, TRN: 0, ...res.data.counts };
    } catch (err) {
      console.error('Failed to fetch user counts:', err);
    } finally {
      countsLoading.value = false;
    }
  }

  async function loadUsers() {
    loadingUsers.value = true;
    try {
      const params: Record<string, string | number> = {
        page: meta.value.page,
        limit: meta.value.limit,
        sort: sort.value,
        order: order.value,
      };
      if (role.value && role.value !== 'all') params.role = role.value;
      if (search.value) params.search = search.value;
      const res = await api.get<{ items: AdminUser[]; meta: PaginationMeta }>('/api/admin/users', { params });
      users.value = res.data.items;
      meta.value = res.data.meta;
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      loadingUsers.value = false;
    }
  }

  function selectRole(r: string) {
    role.value = r;
    meta.value.page = 1;
    search.value = '';
    sort.value = 'lastUpdated';
    order.value = 'desc';
    loadUsers();
  }

  function setPage(p: number) {
    meta.value.page = p;
    loadUsers();
  }

  function setSort(key: string, dir: 'asc' | 'desc') {
    sort.value = key;
    order.value = dir;
    meta.value.page = 1;
    loadUsers();
  }

  function setSearch(value: string) {
    search.value = value;
    meta.value.page = 1;
    loadUsers();
  }

  // Pending actions
  async function approveUser(id: number) {
    try {
      await api.post(`/api/admin/access-requests/${id}/approve`);
      pendingUsers.value = pendingUsers.value.filter((u) => u.id !== id);
    } catch (err) {
      console.error('Failed to approve user:', err);
      throw err;
    }
  }

  async function rejectUser(id: number) {
    try {
      await api.post(`/api/admin/access-requests/${id}/reject`);
      pendingUsers.value = pendingUsers.value.filter((u) => u.id !== id);
    } catch (err) {
      console.error('Failed to reject user:', err);
      throw err;
    }
  }

  // User mutations
  async function updateUserRole(id: number, roleCode: string) {
    await api.put(`/api/admin/users/${id}/role`, { roleCode });
  }

  async function deleteUser(id: number) {
    await api.delete(`/api/admin/users/${id}`);
    // Reload current page — the server handles the new total
    await loadUsers();
  }

  return {
    pendingUsers,
    loading,
    error,
    roleCounts,
    countsLoading,
    users,
    meta,
    loadingUsers,
    role,
    search,
    sort,
    order,
    fetchPendingUsers,
    fetchRoleCounts,
    loadUsers,
    selectRole,
    setPage,
    setSort,
    setSearch,
    approveUser,
    rejectUser,
    updateUserRole,
    deleteUser,
  };
});
