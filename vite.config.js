import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig((command, mode, isSsrBuild, isPreview) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [svelte()],
    build: {
      watch: env.NODE_ENV === "dev",
      sourcemap: env.NODE_ENV === "dev",
      emptyOutDir: env.NODE_ENV === "production",
      rollupOptions: {
        input: ['src/popup/index.html', 'src/options/index.html', 'src/service-worker.js'],
        output: [
          { dir: 'dist/chromium', entryFileNames: '[name].js' },
          { dir: 'dist/firefox', entryFileNames: '[name].js' },
        ],
      },
    },
  }
});
