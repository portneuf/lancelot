/**
 * Platform abstraction interface.
 *
 * All platform-specific I/O (file access, persistence, window management)
 * is abstracted behind this interface. Implementations exist for:
 * - Web (File API, localStorage)
 * - Tauri (native fs, dialog, window)
 * - PWA (extends Web with offline caching)
 */

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileHandle {
  name: string;
  size: number;
  file?: File;
  path?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  lastModified: number;
}

export interface PlatformAdapter {
  readonly platform: 'web' | 'tauri' | 'pwa';
  readonly supportsNativeFs: boolean;
  readonly supportsOffline: boolean;

  openFileDialog(filters: FileFilter[]): Promise<FileHandle | null>;
  readFileAsText(handle: FileHandle): Promise<string>;
  readFileAsBytes(handle: FileHandle): Promise<Uint8Array>;
  saveFile(data: string | Uint8Array, suggestedName: string): Promise<void>;
  setTitle(title: string): Promise<void>;
}
