<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminUsersStore } from '@/stores/admin-users';
import { useAuthStore } from '@/stores/auth';
import {
  PageHeader, DataTable, Button, Chip, PaginationNav, StatCard,
  ActionMenu, Modal, Select, ConfirmDialog, useConfirmDialog,
} from '@upov/upov-ui';
import type { DataTableColumn, ActionMenuItem, SelectOption, DataTableSortState } from '@upov/upov-ui';
import type { AdminUser } from '@/types';

const store = useAdminUsersStore();
const authStore = useAuthStore();
const router = useRouter();
const { confirm } = useConfirmDialog();

// Pending requests columns
const pendingColumns: DataTableColumn[] = [
  { key: 'fullName', label: 'Name', width: '200px' },
  { key: 'email', label: 'Email', width: '240px' },
  { key: 'officeName', label: 'Organization/Country', width: '200px' },
  { key: 'twps', label: 'TWPs', width: '200px' },
  { key: 'actions', label: '', width: '180px' },
];

// User table columns per role
const baseColumns: DataTableColumn[] = [
  { key: 'userName', label: 'User Name', width: '160px' },
  { key: 'fullName', label: 'Full Name', width: '200px' },
  { key: 'email', label: 'Email', width: '240px' },
  { key: 'officeName', label: 'Organization/Country', width: '180px' },
];

const userColumns = computed<DataTableColumn[]>(() => {
  const cols = [...baseColumns];
  if (store.role === 'EXP') {
    cols.push({ key: 'leTgNames', label: 'Leading Expert of', width: '200px' });
  }
  cols.push({ key: 'lastUpdated', label: 'Last Login', width: '120px', sortable: true });
  cols.push({ key: 'actions', label: '', width: '48px' });
  return cols;
});

// Sort state — driven by store
const sortState = computed<DataTableSortState>(() => ({
  key: store.sort,
  direction: store.sort ? store.order : null,
}));

const roleCards = [
  { role: 'all', label: 'All' },
  { role: 'EXP', label: 'Experts' },
  { role: 'TRN', label: 'Translators' },
  { role: 'ADM', label: 'Admins' },
];

const searchPlaceholder = computed(() => {
  const card = roleCards.find((c) => c.role === store.role);
  return `Search ${card?.label.toLowerCase() ?? 'all'}...`;
});

// Hash ↔ role sync
const hashToRole: Record<string, string> = Object.fromEntries(
  roleCards.map((c) => [c.label.toLowerCase(), c.role]),
);
const roleToHash: Record<string, string> = Object.fromEntries(
  roleCards.map((c) => [c.role, c.label.toLowerCase()]),
);

function roleFromHash(): string {
  const hash = window.location.hash.slice(1);
  return hashToRole[hash] || 'all';
}

watch(() => store.role, (r) => {
  router.replace({ hash: `#${roleToHash[r] || 'all'}` });
});

function onCardClick(role: string) {
  store.selectRole(role);
}

function onSort(state: DataTableSortState) {
  if (state.direction) {
    store.setSort(state.key, state.direction);
  }
}

const roleOptions: SelectOption[] = [
  { value: 'ADM', label: 'Admin' },
  { value: 'EXP', label: 'Expert' },
  { value: 'TRN', label: 'Translator' },
];

const actionMenuItems: ActionMenuItem[] = [
  { id: 'change-role', label: 'Change Role', icon: 'pencil' },
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true, separator: true },
];

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// Pending actions
async function handleApprove(id: number) {
  try {
    await store.approveUser(id);
    await store.fetchRoleCounts();
    await store.loadUsers();
  } catch {
    // Error is logged in store
  }
}

async function handleReject(id: number) {
  try {
    await store.rejectUser(id);
  } catch {
    // Error is logged in store
  }
}

// Change Role modal
const showRoleModal = ref(false);
const roleModalUser = ref<AdminUser | null>(null);
const selectedRole = ref('');
const roleUpdating = ref(false);

function openRoleModal(user: AdminUser) {
  roleModalUser.value = user;
  selectedRole.value = user.roleCode;
  showRoleModal.value = true;
}

async function confirmRoleChange() {
  if (!roleModalUser.value || !selectedRole.value) return;
  roleUpdating.value = true;
  try {
    await store.updateUserRole(roleModalUser.value.id, selectedRole.value);
    await store.fetchRoleCounts();
    await store.loadUsers();
    showRoleModal.value = false;
  } catch (err) {
    console.error('Failed to update role:', err);
  } finally {
    roleUpdating.value = false;
  }
}

// Delete user
async function deleteUser(user: AdminUser) {
  if (user.leTgNames) {
    const count = user.leTgNames.split('||').length;
    await confirm({
      title: 'Cannot Delete User',
      message: `${user.fullName} is assigned as Leading Expert to ${count} test guideline(s). Remove LE assignments first.`,
      confirmLabel: 'OK',
      variant: 'primary',
    });
    return;
  }

  const ok = await confirm({
    title: 'Delete User',
    message: `Are you sure you want to remove access for ${user.fullName}? This action cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'danger',
  });
  if (!ok) return;
  try {
    await store.deleteUser(user.id);
    await store.fetchRoleCounts();
  } catch (err: any) {
    console.error('Failed to delete user:', err);
  }
}

function onActionSelect(item: ActionMenuItem, user: AdminUser) {
  if (item.id === 'change-role') openRoleModal(user);
  if (item.id === 'delete') deleteUser(user);
}

const tableRef = ref<InstanceType<typeof DataTable> | null>(null);

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    tableRef.value?.focusSearch();
  }
}

onMounted(() => {
  store.fetchPendingUsers();
  store.fetchRoleCounts();
  store.selectRole(roleFromHash());
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="users-view">
    <PageHeader
      title="Users"
      subtitle="Manage user access and roles"
    />

    <!-- Pending Requests -->
    <div v-if="store.pendingUsers.length" class="section">
      <h3 class="section-title">Pending Requests <span class="section-count">({{ store.pendingUsers.length }})</span></h3>
      <div>
        <DataTable
          :columns="pendingColumns"
          :rows="store.pendingUsers"
          row-key="id"
          :loading="store.loading"
          appearance="card"
          empty-message="No pending access requests."
        >
          <template #cell-twps="{ row }">
            <div class="twp-chips">
              <Chip
                v-for="code in (row.twps || '').split(',')"
                :key="code"
                :label="code.trim()"
                size="small"
                :removable="false"
                variant="tonal"
              />
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="action-buttons">
              <Button type="primary" size="xs" @click.stop="handleApprove(row.id)">Approve</Button>
              <Button type="danger" size="xs" @click.stop="handleReject(row.id)">Reject</Button>
            </div>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Role Cards -->
    <div class="stat-cards">
      <StatCard
        v-for="card in roleCards"
        :key="card.role"
        :label="card.label"
        :count="card.role === 'all' ? (store.roleCounts.EXP + store.roleCounts.TRN + store.roleCounts.ADM) : (store.roleCounts[card.role] || 0)"
        :active="store.role === card.role"
        :loading="store.countsLoading"
        @click="onCardClick(card.role)"
      />
    </div>

    <!-- Users Table -->
    <div class="section">
      <div class="users-table" :class="{ 'is-refreshing': store.loadingUsers && store.users.length > 0 }">
        <DataTable
          ref="tableRef"
          :columns="userColumns"
          :rows="store.users"
          row-key="id"
          :loading="store.loadingUsers && store.users.length === 0"
          :sort-state="sortState"
          appearance="card"
          searchable
          :search-placeholder="searchPlaceholder"
          :search-debounce="300"
          hoverable
          empty-message="No users found."
          @sort="onSort"
          @search="store.setSearch"
        >
          <template #cell-leTgNames="{ row }">
            <span v-if="row.leTgNames" class="le-tg-list">
              <span v-for="name in row.leTgNames.split('||').slice(0, 3)" :key="name" class="le-tg-item">{{ name }}</span>
              <span v-if="row.leTgNames.split('||').length > 3" class="le-tg-more">+{{ row.leTgNames.split('||').length - 3 }} more</span>
            </span>
          </template>
          <template #cell-lastUpdated="{ row }">
            {{ formatDate(row.lastUpdated) }}
          </template>
          <template #cell-actions="{ row }">
            <ActionMenu
              v-if="row.userName?.toUpperCase() !== authStore.user?.username?.toUpperCase()"
              :items="actionMenuItems"
              @select="(item: ActionMenuItem) => onActionSelect(item, row)"
            />
          </template>
          <template #pagination>
            <PaginationNav
              v-if="store.meta.total > store.meta.limit"
              :current-page="store.meta.page"
              :total-items="store.meta.total"
              :items-per-page="store.meta.limit"
              @page-change="store.setPage"
            />
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Change Role Modal -->
    <Modal v-model:open="showRoleModal" title="Change Role" max-width="420px">
      <template v-if="roleModalUser">
        <p class="modal-label">
          Changing role for <strong>{{ roleModalUser.fullName }}</strong>
        </p>
        <Select
          v-model="selectedRole"
          :options="roleOptions"
          placeholder="Select role"
        />
      </template>
      <template #footer>
        <Button type="secondary" size="small" @click="showRoleModal = false">Cancel</Button>
        <Button
          type="primary"
          size="small"
          :disabled="!selectedRole || selectedRole === roleModalUser?.roleCode || roleUpdating"
          @click="confirmRoleChange"
        >
          {{ roleUpdating ? 'Saving...' : 'Save' }}
        </Button>
      </template>
    </Modal>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
.users-view {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.section-count {
  font-weight: 400;
}


.users-table.is-refreshing :deep(.data-table__wrapper) {
  opacity: 0.45;
  transition: opacity 0.2s ease;
}

.stat-cards {
  display: flex;
  gap: 16px;
}


.twp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-label {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.le-tg-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
}

.le-tg-item {
  white-space: nowrap;
}

.le-tg-more {
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #999);
  font-style: italic;
}
</style>
