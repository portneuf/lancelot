/**
 * File tree component for Portal Zone A (left panel).
 *
 * Implements TreePanelProps from @portneuf/portal-framework.
 * Displays loaded inspection files as a tree and provides
 * file upload via button + drag & drop.
 */

import { useCallback, useState } from 'react';
import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { useFileOpen } from '@/features/file-manager/hooks/useFileOpen';
import { File, ChevronRight, FolderOpen, Hexagon, Upload } from 'lucide-react';
import type { TreePanelProps } from '@portneuf/portal-framework';

export default function LancelotFileTree({ width, collapsed, onItemSelect }: TreePanelProps) {
  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const switchToFile = useFileStore((s) => s.switchToFile);
  const loadingState = useFileStore((s) => s.loadingState);
  const { openFile, openFilePicker } = useFileOpen();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) openFile(file);
    },
    [openFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const isLoading = loadingState === 'reading' || loadingState === 'parsing';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3" style={{ width }}>
        <button
          onClick={openFilePicker}
          className="rounded p-1.5 transition-colors hover:bg-accent"
          title="Open file"
        >
          <FolderOpen className="h-4 w-4" />
        </button>
        {[...files.entries()].map(([id]) => (
          <button
            key={id}
            onClick={() => {
              switchToFile(id);
              onItemSelect?.(id);
            }}
            className={cn(
              'rounded p-1.5 transition-colors hover:bg-accent',
              activeFileId === id && 'bg-primary/10 text-primary',
            )}
            title={id}
          >
            <File className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-y-auto text-sm',
        dragOver && 'ring-2 ring-inset ring-primary/50',
      )}
      style={{ width }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header with open button */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Files</span>
        <button
          onClick={openFilePicker}
          disabled={isLoading}
          className="rounded p-1 transition-colors hover:bg-accent disabled:opacity-50"
          title="Open KLARF/SINF file"
        >
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
          {loadingState === 'reading' ? 'Reading file...' : 'Parsing...'}
        </div>
      )}

      {/* File list */}
      {files.size > 0 ? (
        <div className="flex flex-col py-1">
          {[...files.entries()].map(([id, file]) => {
            const isActive = activeFileId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  switchToFile(id);
                  onItemSelect?.(id);
                }}
                className={cn(
                  'flex flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-accent',
                  isActive && 'bg-primary/10',
                )}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn('h-3 w-3 text-muted-foreground', isActive && 'text-primary')} />
                  <span className={cn('truncate font-medium', isActive && 'text-primary')}>
                    {file.source.fileName}
                  </span>
                </div>
                <div className="ml-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Hexagon className="h-3 w-3" />
                  <span>{file.identity.lotId} / {file.identity.waferId}</span>
                </div>
                <div className="ml-5 text-xs text-muted-foreground">
                  {file.defects.length.toLocaleString()} defects
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
            <Upload className="h-6 w-6 opacity-40" />
            <span>Drop a KLARF/SINF file here or click the open button</span>
          </div>
        )
      )}
    </div>
  );
}
