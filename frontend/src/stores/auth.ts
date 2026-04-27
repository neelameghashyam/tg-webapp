import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import api from '@/services/api';
import type { User, AuthProvider, TokenResponse } from '@/types';
import { useConfigStore } from './config';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const authProvider = ref<AuthProvider | null>(
    (localStorage.getItem('auth_provider') as AuthProvider) || null,
  );
  const sessionExpired = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.roles?.includes('ADM') ?? false);
  const needsAccessRequest = computed(() => !!user.value?.isNewUser || !!user.value?.needsAccessRequest);
  const isPendingApproval = computed(() => !!user.value?.isPending);
  const hasAccess = computed(() => isAuthenticated.value && !needsAccessRequest.value && !isPendingApproval.value);

  /** Redirect to ForgeRock OAuth */
  function loginForgeRock(): void {
    const { oidc } = useConfigStore().config!.auth;

    const state = btoa(JSON.stringify({ provider: 'forgerock' }));

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: oidc.clientId,
      redirect_uri: oidc.redirectUri,
      scope: oidc.scopes,
      state,
    });
    window.location.href = `${oidc.authorizationUri}?${params}`;
  }

  /** Redirect to EntraID OAuth */
  function loginEntraID(): void {
    const { entraid } = useConfigStore().config!.auth;

    const state = btoa(JSON.stringify({ provider: 'entraid' }));

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: entraid.clientId,
      redirect_uri: entraid.redirectUri,
      scope: entraid.scopes,
      state,
    });
    window.location.href = `https://login.microsoftonline.com/${entraid.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /** Backward-compatible alias */
  function login(): void {
    loginForgeRock();
  }

  const callbackError = ref<string | null>(null);

  async function handleCallback(code: string, provider: AuthProvider = 'forgerock'): Promise<boolean> {
    callbackError.value = null;
    try {
      const config = useConfigStore().config!;
      const redirectUri = provider === 'entraid'
        ? config.auth.entraid.redirectUri
        : config.auth.oidc.redirectUri;

      const response = await api.post<TokenResponse>('/api/auth/token', {
        code,
        redirect_uri: redirectUri,
        provider,
      });

      token.value = response.data.access_token;
      authProvider.value = provider;
      localStorage.setItem('token', token.value);
      localStorage.setItem('auth_provider', provider);
      await fetchUser();
      return true;
    } catch (err: unknown) {
      console.error('Auth callback error:', err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const status = err.response?.status;
        const detail = data?.error?.message || data?.message || JSON.stringify(data);
        callbackError.value = `[${status}] ${detail}`;
      } else if (err instanceof Error) {
        callbackError.value = err.message;
      } else {
        callbackError.value = 'Unknown error';
      }
      return false;
    }
  }

  let fetchUserPromise: Promise<void> | null = null;

  async function fetchUser(): Promise<void> {
    if (!token.value) return;
    if (fetchUserPromise) return fetchUserPromise;
    fetchUserPromise = api.get<User>('/api/auth/me')
      .then((response) => { user.value = response.data; })
      .catch((error) => { console.error('Fetch user error:', error); logout(); })
      .finally(() => { fetchUserPromise = null; });
    return fetchUserPromise;
  }

  function setSessionExpired(): void {
    sessionExpired.value = true;
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    authProvider.value = null;
    sessionExpired.value = false;
    localStorage.removeItem('token');
    localStorage.removeItem('auth_provider');
  }

  // Initialize: fetch user if token exists
  if (token.value) {
    fetchUser();
  }

  return {
    user,
    token,
    authProvider,
    callbackError,
    isAuthenticated,
    isAdmin,
    needsAccessRequest,
    isPendingApproval,
    hasAccess,
    sessionExpired,
    login,
    loginForgeRock,
    loginEntraID,
    handleCallback,
    fetchUser,
    setSessionExpired,
    logout,
  };
});
