/**
 * File tree component for Portal Zone A (left panel).
 *
 * Implements TreePanelProps from @portneuf/portal-framework.
 * Displays loaded inspection files as a tree: Lot → Wafer → summary.
 */

import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { File, ChevronRight, Hexagon } from 'lucide-react';
import type { TreePanelProps } from '@portneuf/portal-framework';

export default function LancelotFileTree({ width, collapsed, onItemSelect }: TreePanelProps) {
  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const switchToFile = useFileStore((s) => s.switchToFile);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3" style={{ width }}>
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

  if (files.size === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground" style={{ width }}>
        No files loaded
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto text-sm" style={{ width }}>
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
        Files
      </div>
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
    </div>
  );
}
