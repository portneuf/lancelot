import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { lingui } from '@lingui/vite-plugin';
import { resolve } from 'path';

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    tailwindcss(),
    lingui(),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    watch: isTauri ? { ignored: ['**/src-tauri/**'] } : undefined,
  },

  build: {
    target: isTauri ? 'esnext' : 'es2020',
    sourcemap: process.env.NODE_ENV === 'development',
  },

  define: {
    __IS_TAURI__: JSON.stringify(isTauri),
  },
});
