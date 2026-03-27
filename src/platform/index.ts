import type { PlatformAdapter } from './platform.interface';

export type { PlatformAdapter, FileFilter, FileHandle, FileMetadata } from './platform.interface';

/**
 * Detect the current platform and return the appropriate adapter.
 *
 * Detection order:
 * 1. Tauri: __TAURI_INTERNALS__ on window
 * 2. PWA: running in standalone display mode
 * 3. Web: default fallback
 */
export async function createPlatformAdapter(): Promise<PlatformAdapter> {
  // Tauri detection - @vite-ignore prevents Vite from bundling Tauri packages in web builds
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { TauriPlatform } = await import('./tauri/tauri-platform');
    return new TauriPlatform();
  }

  // PWA detection (installed to home screen / standalone)
  if (
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as Record<string, unknown>)['standalone'] === true)
  ) {
    const { PwaPlatform } = await import('./pwa/pwa-platform');
    return new PwaPlatform();
  }

  // Web fallback
  const { WebPlatform } = await import('./web/web-platform');
  return new WebPlatform();
}
