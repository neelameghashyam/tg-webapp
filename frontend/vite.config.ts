import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...(process.env.UPOV_LOCAL && {


        '@upov/upov-ui/styles': resolve(__dirname, '../../../HONOPOC/DESIGNSYSTEM/upov-design-system/projects/upov-ui/src/styles/upov-ui.scss'),
        '@upov/upov-ui': resolve(__dirname, '../../../HONOPOC/DESIGNSYSTEM/upov-design-system/projects/upov-ui/src/index.ts'),
      }),
    },
  },
  server: {
    fs: {
      allow: [
        '.',

        ...(process.env.UPOV_LOCAL ? [resolve(__dirname, '../../../HONOPOC/DESIGNSYSTEM/upov-design-system')] : []),
      ],
    },
    port: 5173,
    // Allow local-dev.wipo.int (add to /etc/hosts: 127.0.0.1 local-dev.wipo.int)
    host: true,
    allowedHosts: ['local-dev.wipo.int'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    outDir: '../deployment/artifacts/frontend',
    emptyOutDir: true,
  },
});
