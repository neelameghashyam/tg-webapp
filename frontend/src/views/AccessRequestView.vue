<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import type { AutocompleteItem } from '@upov/upov-ui';
import { Alert, Button, Input, CheckboxGroup, FormField, AutocompleteList, PageHeader, Spinner, Card } from '@upov/upov-ui';

const router = useRouter();
const authStore = useAuthStore();

const officeSearch = ref('');
const selectedOffice = ref<{ code: string; name: string } | null>(null);
const twpCodes = ref<string[]>([]);
const twpOptions = [
  { value: 'TWA', label: 'TWA - Agricultural Crops' },
  { value: 'TWF', label: 'TWF - Fruit Crops' },
  { value: 'TWO', label: 'TWO - Ornamental Plants' },
  { value: 'TWV', label: 'TWV - Vegetables' },
];

const submitting = ref(false);
const error = ref<string | null>(null);

// Office autocomplete
const allOffices = ref<{ code: string; name: string }[]>([]);
const loadingOffices = ref(false);
const showOfficeList = ref(false);

const filteredOffices = computed<AutocompleteItem[]>(() => {
  const search = officeSearch.value.toLowerCase();
  if (!search) return [];
  return allOffices.value
    .filter((o) => o.name.toLowerCase().includes(search) || o.code.toLowerCase().includes(search))
    .slice(0, 20)
    .map((o) => ({ main: o.name, sub: o.code }));
});

// Pre-fill office from user data
function prefillOffice() {
  if (authStore.user?.officeCode) {
    const match = allOffices.value.find((o) => o.code === authStore.user!.officeCode);
    if (match) {
      selectedOffice.value = match;
      officeSearch.value = match.name;
    }
  }
}

// Pre-fill TWPs from user data
function prefillTwps() {
  if (authStore.user?.twps) {
    const codes = authStore.user.twps.split(',').map((c) => c.trim());
    twpCodes.value = codes.filter((c) => twpOptions.some((o) => o.value === c));
  }
}

onMounted(async () => {
  loadingOffices.value = true;
  try {
    const res = await api.get<{ items: { code: string; name: string }[] }>('/api/offices');
    allOffices.value = res.data.items;
    prefillOffice();
    prefillTwps();
  } catch {
    // Offices will just be empty
  } finally {
    loadingOffices.value = false;
  }
});

function handleOfficeSelect(item: AutocompleteItem) {
  const match = allOffices.value.find((o) => o.code === item.sub);
  if (match) {
    selectedOffice.value = match;
    officeSearch.value = match.name;
  }
  showOfficeList.value = false;
}

function handleOfficeInput() {
  selectedOffice.value = null;
  showOfficeList.value = true;
}

function handleOfficeFocus() {
  if (officeSearch.value) {
    showOfficeList.value = true;
  }
}

function handleOfficeBlur() {
  // Delay to allow click on autocomplete item
  setTimeout(() => {
    showOfficeList.value = false;
  }, 200);
}

const selectedTwps = computed(() => twpCodes.value.join(','));

const isValid = computed(() => selectedOffice.value && selectedTwps.value);

async function handleSubmit() {
  if (!isValid.value) return;
  submitting.value = true;
  error.value = null;
  try {
    await api.post('/api/access-request', {
      officeCode: selectedOffice.value!.code,
      twps: selectedTwps.value,
    });
    await authStore.fetchUser();
  } catch (err: unknown) {
    error.value = 'Failed to submit access request. Please try again.';
    console.error('Submit error:', err);
  } finally {
    submitting.value = false;
  }
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="access-request-page">
    <!-- Form state: user needs to submit a request -->
    <Card v-if="authStore.needsAccessRequest" elevation="medium" max-width="560px">
      <PageHeader title="Request Access" />
      <p class="card-description">Please fill in the form below to request access to the TG Template system.</p>

      <Alert v-if="error" variant="error">{{ error }}</Alert>

      <form @submit.prevent="handleSubmit" class="access-form">
        <div class="field-inline">
          <span class="field-label">Username</span>
          <span class="field-value">{{ authStore.user?.username || '' }}</span>
        </div>

        <div class="field-inline">
          <span class="field-label">Full Name</span>
          <span class="field-value">{{ authStore.user?.name || '' }}</span>
        </div>

        <div class="field-inline">
          <span class="field-label">Email</span>
          <span class="field-value">{{ authStore.user?.email || '' }}</span>
        </div>

        <FormField label="Organization/Country" required>
          <div class="office-autocomplete">
            <Input
              v-model="officeSearch"
              placeholder="Search for your organization or country ..."
              @input="handleOfficeInput"
              @focus="handleOfficeFocus"
              @blur="handleOfficeBlur"
              required
            />
            <AutocompleteList
              v-if="showOfficeList && filteredOffices.length > 0"
              :items="filteredOffices"
              :loading="loadingOffices"
              @select="handleOfficeSelect"
            />
          </div>
        </FormField>

        <FormField label="Technical Working Parties" required>
          <CheckboxGroup v-model="twpCodes" :options="twpOptions" />
        </FormField>

        <Button type="primary" :disabled="!isValid || submitting" @click="handleSubmit">
          {{ submitting ? 'Submitting...' : 'Submit Request' }}
        </Button>
      </form>
    </Card>

    <!-- Pending state: request has been submitted -->
    <Card v-else-if="authStore.isPendingApproval" elevation="medium" max-width="560px" centered>
      <PageHeader title="Access Request Pending" />
      <p class="card-description">Your access request has been submitted and is awaiting administrator approval. You will be able to access the system once your request is approved.</p>
      <Button type="secondary" @click="handleLogout">Logout</Button>
    </Card>
  </div>
</template>

<style scoped>
.access-request-page {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
}

.card-description {
  color: var(--color-text-secondary);
  text-align: left;
  margin-top: 15px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.access-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.office-autocomplete {
  position: relative;
}

.field-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.field-label {
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 90px;
}

.field-value {
  color: var(--color-text-primary);
}

</style>
