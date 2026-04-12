import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@traceback/shared': path.resolve(__dirname, '../packages/traceback-shared/src/index.ts')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      /** Traceback app API (sessions / branching) — set VITE_TRACEBACK_API_URL=/traceback-api in dev */
      '/traceback-api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/traceback-api/, '') || '/'
      }
    }
  }
});
