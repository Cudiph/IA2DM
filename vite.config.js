import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: ['src/popup/index.html', 'src/options/index.html', 'src/service-worker.js'],
      output: [
        { dir: 'dist/chromium', entryFileNames: '[name].js' },
        { dir: 'dist/firefox', entryFileNames: '[name].js' },
      ],
    },
  },
});
