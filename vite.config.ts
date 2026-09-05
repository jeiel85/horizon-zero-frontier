import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1600,
    assetsInlineLimit: 4096
  },
  server: {
    port: 3000,
    open: true
  }
});
