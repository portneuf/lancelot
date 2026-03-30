import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { lingui } from '@lingui/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

const isTauri = !!process.env.TAURI_ENV_PLATFORM;
const isLibBuild = process.env.BUILD_MODE === 'lib';

export default defineConfig({
  plugins: [
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    tailwindcss(),
    lingui(),

    // PWA only for web builds, not Tauri or library builds
    !isTauri &&
      !isLibBuild &&
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

  build: isLibBuild
    ? {
        lib: {
          entry: resolve(__dirname, 'src/portal-entry.ts'),
          formats: ['es'],
          fileName: 'portal-entry',
        },
        rollupOptions: {
          external: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react-router',
            /^@portneuf\//,
            /^@radix-ui\//,
            /^@lingui\//,
            'lucide-react',
            'recharts',
            'zustand',
            'zustand/middleware',
            '@tanstack/react-virtual',
            'react-resizable-panels',
            'clsx',
            'tailwind-merge',
            'react-is',
          ],
        },
        cssCodeSplit: false,
        sourcemap: true,
        minify: false,
      }
    : {
        target: isTauri ? 'esnext' : 'es2020',
        sourcemap: process.env.NODE_ENV === 'development',
      },

  define: {
    __IS_TAURI__: JSON.stringify(isTauri),
  },
});
