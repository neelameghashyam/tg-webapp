<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { AuthProvider } from '@/types';
import { Alert, Spinner, Button, CenteredPage, Card } from '@upov/upov-ui';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const error = ref<string | null>(null);

function parseProvider(stateParam: unknown): AuthProvider {
  if (typeof stateParam !== 'string') return 'forgerock';
  try {
    const parsed = JSON.parse(atob(stateParam));
    return parsed.provider === 'entraid' ? 'entraid' : 'forgerock';
  } catch {
    return 'forgerock';
  }
}

onMounted(async () => {
  const code = route.query.code;
  if (typeof code !== 'string') {
    error.value = 'No authorization code received';
    return;
  }

  const provider = parseProvider(route.query.state);
  const success = await authStore.handleCallback(code, provider);
  if (success) {
    if (authStore.needsAccessRequest || authStore.isPendingApproval) {
      router.push('/access-request');
    } else {
      const redirect = (route.query.redirect as string)
        || sessionStorage.getItem('auth_redirect')
        || '/test-guidelines';
      sessionStorage.removeItem('auth_redirect');
      router.push(redirect);
    }
  } else {
    error.value = authStore.callbackError || 'Authentication failed. Please try again.';
  }
});
</script>

<template>
  <CenteredPage background="var(--color-bg-light)">
    <Card elevation="medium" padding="spacious" maxWidth="33.3%" centered>
      <div v-if="error">
        <Alert variant="error" :title="error">
          <details class="error-details">
            <summary>Debug info</summary>
            <pre>provider: {{ parseProvider(route.query.state) }}
code: {{ route.query.code ? '(present)' : '(missing)' }}
state: {{ route.query.state ? '(present)' : '(missing)' }}
error param: {{ route.query.error || '(none)' }}</pre>
          </details>
        </Alert>
        <RouterLink to="/login" class="retry-link">
          <Button type="primary" size="small">Back to Login</Button>
        </RouterLink>
      </div>
      <div v-else class="loading">
        <Spinner :diameter="48" message="Signing you in..." />
      </div>
    </Card>
  </CenteredPage>
</template>

<style scoped>
.error-details {
  text-align: left;
  margin-bottom: 16px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.error-details pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--color-bg-light, #f5f5f5);
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.retry-link {
  text-decoration: none;
}
</style>
