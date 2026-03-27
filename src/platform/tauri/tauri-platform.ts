/**
 * Tauri v2 platform adapter.
 *
 * Uses Tauri plugins for native file access, dialogs, and window management.
 * This module is only dynamically imported when running inside Tauri.
 *
 * Imports use globalThis.__TAURI_INTERNALS__ to avoid bundler resolution
 * of @tauri-apps/* packages in web builds.
 */

import type { PlatformAdapter, FileFilter, FileHandle } from '../platform.interface';

// Dynamic import helper that prevents Vite/Rolldown from analyzing the import path
async function tauriImport(pkg: string): Promise<Record<string, unknown>> {
  // Construct import path at runtime to prevent static analysis
  return Function('p', 'return import(p)')(pkg) as Promise<Record<string, unknown>>;
}

export class TauriPlatform implements PlatformAdapter {
  readonly platform = 'tauri' as const;
  readonly supportsNativeFs = true;
  readonly supportsOffline = true;

  async openFileDialog(filters: FileFilter[]): Promise<FileHandle | null> {
    const dialog = await tauriImport('@tauri-apps/plugin-dialog');
    const open = dialog.open as (opts: unknown) => Promise<string | null>;
    const result = await open({
      multiple: false,
      filters: filters.map((f) => ({ name: f.name, extensions: f.extensions })),
    });

    if (!result) return null;
    const path = String(result);

    const fs = await tauriImport('@tauri-apps/plugin-fs');
    const stat = fs.stat as (path: string) => Promise<{ size: number }>;
    const info = await stat(path);
    return {
      name: path.split(/[/\\]/).pop() ?? 'unknown',
      size: info.size,
      path,
    };
  }

  async readFileAsText(handle: FileHandle): Promise<string> {
    if (!handle.path) throw new Error('No file path available');
    const fs = await tauriImport('@tauri-apps/plugin-fs');
    const readTextFile = fs.readTextFile as (path: string) => Promise<string>;
    return readTextFile(handle.path);
  }

  async readFileAsBytes(handle: FileHandle): Promise<Uint8Array> {
    if (!handle.path) throw new Error('No file path available');
    const fs = await tauriImport('@tauri-apps/plugin-fs');
    const readFile = fs.readFile as (path: string) => Promise<Uint8Array>;
    return readFile(handle.path);
  }

  async saveFile(data: string | Uint8Array, suggestedName: string): Promise<void> {
    const dialog = await tauriImport('@tauri-apps/plugin-dialog');
    const save = dialog.save as (opts: unknown) => Promise<string | null>;
    const path = await save({ defaultPath: suggestedName });
    if (!path) return;

    const fs = await tauriImport('@tauri-apps/plugin-fs');
    if (data instanceof Uint8Array) {
      const writeFile = fs.writeFile as (path: string, data: Uint8Array) => Promise<void>;
      await writeFile(String(path), data);
    } else {
      const writeTextFile = fs.writeTextFile as (path: string, data: string) => Promise<void>;
      await writeTextFile(String(path), data);
    }
  }

  async setTitle(title: string): Promise<void> {
    const windowMod = await tauriImport('@tauri-apps/api/window');
    const getCurrentWindow = windowMod.getCurrentWindow as () => { setTitle: (t: string) => Promise<void> };
    await getCurrentWindow().setTitle(title);
  }
}
