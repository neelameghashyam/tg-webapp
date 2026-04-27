import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { AppConfig } from '@/types';

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig | null>(null);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || '';
      const { data } = await axios.get<AppConfig>(`${baseURL}/api/config`);
      config.value = data;
    } catch (err) {
      console.error('Failed to load app config:', err);
      error.value = err instanceof Error ? err.message : 'Failed to load config';
    }
  }

  return { config, error, load };
});
