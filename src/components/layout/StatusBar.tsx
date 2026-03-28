import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileStore, useUIStore, useInspectionStore } from '@/stores';
import { ExportMenu } from '@/features/export/components/ExportMenu';

interface StatusBarProps {
  onToggleFilters?: () => void;
  filterSidebarOpen?: boolean;
}

export function StatusBar({ onToggleFilters, filterSidebarOpen }: StatusBarProps) {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const loadingState = useFileStore((s) => s.loadingState);
  const statusMessage = useUIStore((s) => s.statusMessage);
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);

  const activeFile = activeFileId ? files.get(activeFileId) : null;
  const isFiltered = filteredDefectIds != null;

  return (
    <footer className="flex h-7 items-center justify-between border-t border-border bg-muted/50 px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {activeFile && (
          <>
            <span>{activeFile.source.fileName}</span>
            <span className="text-border">|</span>
            <span>{activeFile.identity.lotId} / {activeFile.identity.waferId}</span>
            <span className="text-border">|</span>
            <span>
              {isFiltered
                ? `${filteredDefectIds.size.toLocaleString()} / ${activeFile.defects.length.toLocaleString()} defects`
                : `${activeFile.defects.length.toLocaleString()} defects`}
            </span>
          </>
        )}
        {!activeFile && loadingState === 'idle' && <span>No file loaded</span>}
        {loadingState === 'parsing' && <span>Parsing...</span>}
        {loadingState === 'reading' && <span>Reading file...</span>}
      </div>
      <div className="flex items-center gap-2">
        {statusMessage && <span>{statusMessage}</span>}
        <ExportMenu />
        {activeFile && (
          <button
            onClick={onToggleFilters}
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors',
              filterSidebarOpen
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
              isFiltered && !filterSidebarOpen && 'text-primary',
            )}
            title="Toggle filter panel"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {isFiltered && (
              <span className="rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {filteredDefectIds.size}
              </span>
            )}
          </button>
        )}
        <span className="text-border">|</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
