import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createUpovUi } from '@upov/upov-ui';
import '@upov/upov-ui/styles';
import App from './App.vue';
import router from './router';
import { useConfigStore } from './stores/config';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);
  app.use(createUpovUi());

  const configStore = useConfigStore();
  await configStore.load();

  app.mount('#app');
}

bootstrap();
