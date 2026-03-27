import type { PlatformAdapter, FileFilter, FileHandle } from '../platform.interface';

export class WebPlatform implements PlatformAdapter {
  readonly platform = 'web' as const;
  readonly supportsNativeFs = 'showOpenFilePicker' in globalThis;
  readonly supportsOffline = false;

  async openFileDialog(filters: FileFilter[]): Promise<FileHandle | null> {
    // Try File System Access API first
    if (this.supportsNativeFs) {
      try {
        const [fileHandle] = await (window as never as { showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]> })
          .showOpenFilePicker({
            types: filters.map((f) => ({
              description: f.name,
              accept: {
                'application/octet-stream': f.extensions.map((e) => `.${e}`),
              },
            })),
            multiple: false,
          });
        const file = await fileHandle.getFile();
        return { name: file.name, size: file.size, file };
      } catch {
        return null; // User cancelled
      }
    }

    // Fallback to input element
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve({ name: file.name, size: file.size, file });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  async readFileAsText(handle: FileHandle): Promise<string> {
    if (!handle.file) throw new Error('No File object available');
    return handle.file.text();
  }

  async readFileAsBytes(handle: FileHandle): Promise<Uint8Array> {
    if (!handle.file) throw new Error('No File object available');
    const buffer = await handle.file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async saveFile(data: string | Uint8Array, suggestedName: string): Promise<void> {
    const blob = data instanceof Uint8Array
      ? new Blob([data as BlobPart])
      : new Blob([data], { type: 'text/plain' });

    // Try File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as never as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> })
          .showSaveFilePicker({ suggestedName });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
        // Fall through to download link
      }
    }

    // Fallback: create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async setTitle(title: string): Promise<void> {
    document.title = title;
  }
}
