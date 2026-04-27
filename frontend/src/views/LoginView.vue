<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { Logo, Button, Spinner, CenteredPage, Card, ProgressBar } from '@upov/upov-ui';

type LoginState = 'detecting' | 'wipo-network' | 'chooser' | 'external';

const authStore = useAuthStore();

const state = ref<LoginState>('detecting');
let redirectTimer: ReturnType<typeof setTimeout>;

async function detectWipoNetwork(): Promise<boolean> {
  try {
    await fetch('https://intranet.wipo.int/', {
      mode: 'no-cors',
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch {
    return false;
  }
}

onMounted(async () => {
  const onWipoNetwork = await detectWipoNetwork();

  if (onWipoNetwork) {
    state.value = 'wipo-network';
    redirectTimer = setTimeout(() => {
      if (state.value === 'wipo-network') {
        authStore.loginEntraID();
      }
    }, 3000);
  } else {
    state.value = 'external';
  }
});

function cancelRedirect(): void {
  clearTimeout(redirectTimer);
  state.value = 'chooser';
}

</script>

<template>
  <CenteredPage background="linear-gradient(135deg, var(--color-primary-green-bright) 0%, var(--color-primary-green-dark) 100%)">
    <Card elevation="high" padding="spacious" max-width="400px" centered>
      <div class="login-logo">
        <Logo size="large" />
      </div>
      <h1 class="login-title">TG Template</h1>

      <!-- Detecting network -->
      <template v-if="state === 'detecting'">
        <Spinner :diameter="32" message="Detecting network..." />
      </template>

      <!-- WIPO network: auto-redirect to EntraID -->
      <template v-if="state === 'wipo-network'">
        <p class="login-subtitle">
          Redirecting to <strong>WIPO Entra ID</strong>
          <a href="#" class="cancel-link" @click.prevent="cancelRedirect">Cancel</a>
        </p>
        <ProgressBar animated :duration="3000" size="medium" />
      </template>

      <!-- Chooser: both providers -->
      <template v-if="state === 'chooser'">
        <p class="login-subtitle">Sign in with your account</p>
        <p class="idp-header">Log in with</p>
        <Button type="primary" size="medium" block @click="authStore.loginEntraID">
          Sign in with WIPO Entra ID
        </Button>
        <Button type="secondary" size="medium" block style="margin-top: 12px" @click="authStore.loginForgeRock">
          Sign in with WIPO Account
        </Button>
      </template>

      <!-- External: only ForgeRock -->
      <template v-if="state === 'external'">
        <p class="login-subtitle">Sign in with your account</p>
        <Button type="primary" size="medium" block @click="authStore.loginForgeRock">
          Sign in with WIPO Account
        </Button>
      </template>

    </Card>
  </CenteredPage>
</template>

<style scoped>
.login-logo {
  margin-bottom: 24px;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-green-dark);
  margin-bottom: 8px;
}

.login-subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.cancel-link {
  margin-left: 0.75em;
  color: var(--color-text-secondary);
  text-decoration: underline;
  font-size: 0.875rem;
}

.idp-header {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

</style>
