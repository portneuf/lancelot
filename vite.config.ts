import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { lingui } from '@lingui/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    tailwindcss(),
    lingui(),

    // PWA only for web builds, not Tauri
    !isTauri &&
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Lancelot - Semiconductor Inspection Viewer',
          short_name: 'Lancelot',
          description: 'View and analyze semiconductor wafer inspection files (KLARF)',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          categories: ['productivity', 'utilities'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^\/locales\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'i18n-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
  ].filter(Boolean),

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
