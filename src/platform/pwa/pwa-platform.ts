import type { PlatformAdapter, FileFilter, FileHandle } from '../platform.interface';
import { WebPlatform } from '../web/web-platform';

/**
 * PWA platform adapter.
 *
 * Delegates all operations to WebPlatform but reports itself as 'pwa'
 * with offline support. Actual offline caching is handled by the
 * Workbox service worker configured in vite.config.ts.
 */
export class PwaPlatform implements PlatformAdapter {
  readonly platform = 'pwa' as const;
  readonly supportsNativeFs: boolean;
  readonly supportsOffline = true;

  private web = new WebPlatform();

  constructor() {
    this.supportsNativeFs = this.web.supportsNativeFs;
  }

  openFileDialog(filters: FileFilter[]): Promise<FileHandle | null> {
    return this.web.openFileDialog(filters);
  }

  readFileAsText(handle: FileHandle): Promise<string> {
    return this.web.readFileAsText(handle);
  }

  readFileAsBytes(handle: FileHandle): Promise<Uint8Array> {
    return this.web.readFileAsBytes(handle);
  }

  saveFile(data: string | Uint8Array, suggestedName: string): Promise<void> {
    return this.web.saveFile(data, suggestedName);
  }

  setTitle(title: string): Promise<void> {
    return this.web.setTitle(title);
  }
}
