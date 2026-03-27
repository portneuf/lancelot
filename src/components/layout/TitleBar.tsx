import { useCallback } from 'react';
import { CircleDot, Minus, Square, X } from 'lucide-react';
import { useFileStore } from '@/stores';

/** Dynamic import helper to avoid bundler resolution of Tauri packages in web builds. */
async function tauriImport(pkg: string): Promise<Record<string, unknown>> {
  return Function('p', 'return import(p)')(pkg) as Promise<Record<string, unknown>>;
}

async function getTauriWindow() {
  const windowMod = await tauriImport('@tauri-apps/api/window');
  const getCurrentWindow = windowMod.getCurrentWindow as () => {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  return getCurrentWindow();
}

/**
 * Custom title bar for Tauri desktop builds.
 * Only renders when __IS_TAURI__ is true; returns null on web.
 */
export function TitleBar() {
  if (!__IS_TAURI__) return null;

  return <TitleBarInner />;
}

function TitleBarInner() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const activeFile = activeFileId ? files.get(activeFileId) : null;
  const fileName = activeFile?.source?.fileName ?? '';

  const handleMinimize = useCallback(async () => {
    const win = await getTauriWindow();
    await win.minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const win = await getTauriWindow();
    await win.toggleMaximize();
  }, []);

  const handleClose = useCallback(async () => {
    const win = await getTauriWindow();
    await win.close();
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 shrink-0 items-center border-b border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      {/* Left: App icon + title */}
      <div data-tauri-drag-region className="flex items-center gap-2 px-3">
        <CircleDot className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold tracking-tight">Lancelot</span>
      </div>

      {/* Center: Active file name */}
      <div data-tauri-drag-region className="flex-1 text-center">
        {fileName && (
          <span className="text-xs text-muted-foreground">{fileName}</span>
        )}
      </div>

      {/* Right: Window controls */}
      <div className="flex">
        <button
          onClick={handleMinimize}
          className="inline-flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="inline-flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Maximize"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={handleClose}
          className="inline-flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
