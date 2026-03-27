import { useFileStore, useUIStore } from '@/stores';
import { ExportMenu } from '@/features/export/components/ExportMenu';

export function StatusBar() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const loadingState = useFileStore((s) => s.loadingState);
  const statusMessage = useUIStore((s) => s.statusMessage);

  const activeFile = activeFileId ? files.get(activeFileId) : null;

  return (
    <footer className="flex h-7 items-center justify-between border-t border-border bg-muted/50 px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {activeFile && (
          <>
            <span>{activeFile.source.fileName}</span>
            <span className="text-border">|</span>
            <span>{activeFile.identity.lotId} / {activeFile.identity.waferId}</span>
            <span className="text-border">|</span>
            <span>{activeFile.defects.length.toLocaleString()} defects</span>
          </>
        )}
        {!activeFile && loadingState === 'idle' && <span>No file loaded</span>}
        {loadingState === 'parsing' && <span>Parsing...</span>}
        {loadingState === 'reading' && <span>Reading file...</span>}
      </div>
      <div className="flex items-center gap-3">
        {statusMessage && <span>{statusMessage}</span>}
        <ExportMenu />
        <span className="text-border">|</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
