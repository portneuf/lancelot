/**
 * Directory scanner for KLARF/SINF files.
 *
 * Web: uses showDirectoryPicker() (File System Access API)
 * with fallback to <input webkitdirectory>.
 */

const EXTENSIONS = new Set([
  '.klarf', '.kla',
  '.000', '.001', '.002', '.003', '.004', '.005',
  '.006', '.007', '.008', '.009', '.010',
  '.sinf', '.inf',
]);

function hasKnownExtension(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  return EXTENSIONS.has(name.slice(dot).toLowerCase());
}

/**
 * Scan a directory using the File System Access API.
 * Recursively collects all files with known extensions.
 */
async function scanViaFSAccess(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
  const files: File[] = [];

  async function walk(handle: FileSystemDirectoryHandle) {
    for await (const entry of (handle as unknown as AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>)) {
      if (entry.kind === 'file' && hasKnownExtension(entry.name)) {
        files.push(await entry.getFile());
      } else if (entry.kind === 'directory') {
        await walk(entry);
      }
    }
  }

  await walk(dirHandle);
  return files;
}

/**
 * Pick a directory and return all KLARF/SINF files in it.
 * Uses showDirectoryPicker() if available, falls back to input[webkitdirectory].
 */
export async function pickDirectoryFiles(): Promise<File[]> {
  // Try File System Access API first
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      return scanViaFSAccess(dirHandle);
    } catch (err) {
      // User cancelled or API not available
      if ((err as Error).name === 'AbortError') return [];
      // Fall through to input fallback
    }
  }

  // Fallback: <input webkitdirectory>
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.multiple = true;
    input.onchange = () => {
      const files = input.files ? [...input.files].filter((f) => hasKnownExtension(f.name)) : [];
      resolve(files);
    };
    // If user cancels, onchange may not fire — resolve empty after timeout
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}
