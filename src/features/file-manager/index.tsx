import { useCallback, useState } from 'react';
import { Upload, FileWarning, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { useFileOpen } from './hooks/useFileOpen';

export default function FileManagerPage() {
  const { openFile, openFilePicker } = useFileOpen();
  const loadingState = useFileStore((s) => s.loadingState);
  const loadingProgress = useFileStore((s) => s.loadingProgress);
  const parseErrors = useFileStore((s) => s.parseErrors);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) openFile(file);
  }, [openFile]);

  const isLoading = loadingState === 'reading' || loadingState === 'parsing';

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isLoading ? undefined : openFilePicker}
        className={cn(
          'flex max-w-lg cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isLoading && 'pointer-events-none opacity-60',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">
                {loadingState === 'reading' ? 'Reading file...' : 'Parsing...'}
              </h3>
              {loadingState === 'parsing' && (
                <div className="mx-auto mt-2 h-2 w-48 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.round(loadingProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </>
        ) : parseErrors.length > 0 ? (
          <>
            <FileWarning className="h-12 w-12 text-destructive" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-destructive">Parse Error</h3>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-sm text-muted-foreground">{err.message}</p>
              ))}
              <p className="mt-2 text-sm text-muted-foreground">Click to try another file</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground/50" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Open Inspection File</h3>
              <p className="text-sm text-muted-foreground">
                Drop a KLARF file here or click to browse
              </p>
            </div>
            <span className="mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Browse Files
            </span>
            <p className="text-xs text-muted-foreground">
              Supported: .klarf, .kla, .000, .001
            </p>
          </>
        )}
      </div>
    </div>
  );
}
