/**
 * Batch import dialog — directory picker + progress + result report.
 *
 * Flow:
 * 1. User clicks "Batch Import" → directory picker opens
 * 2. Files are scanned and listed
 * 3. Sequential parsing with progress bar
 * 4. Result report: succeeded/failed/total + error details
 */

import { useCallback, useState } from 'react';
import { FolderSearch, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useFileStore } from '@/stores';
import { useStorage } from '@/core/storage';
import { useTranslation } from '@/i18n/useTranslation';
import { pickDirectoryFiles } from './DirectoryScanner';
import { importBatch } from './BatchImporter';
import type { BatchProgress, BatchResult } from './BatchImporter';

type Phase = 'idle' | 'scanning' | 'importing' | 'done';

export function ImportProgressDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);

  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const addRecentFile = useFileStore((s) => s.addRecentFile);
  const storage = useStorage();

  const handleStart = useCallback(async () => {
    setPhase('scanning');
    setProgress(null);
    setResult(null);

    const files = await pickDirectoryFiles();
    if (files.length === 0) {
      setPhase('idle');
      return;
    }

    setPhase('importing');

    const batchResult = await importBatch(files, (p) => {
      setProgress({ ...p });
    });

    // Store successful results in file-store and storage adapter
    let lastFileId: string | null = null;
    for (const r of batchResult.results) {
      if (r.success && r.data) {
        const fileId = `${r.fileName}-${Date.now()}`;
        setActiveFile(fileId, r.data);
        addRecentFile({
          name: r.fileName,
          format: r.data.source.formatId,
          openedAt: new Date().toISOString(),
        });
        storage.importFile(r.data).catch(() => {});
        lastFileId = fileId;
      }
    }

    // Keep last file as active
    if (lastFileId) {
      // Already set by setActiveFile above
    }

    setResult(batchResult);
    setPhase('done');
  }, [setActiveFile, addRecentFile, storage]);

  const handleClose = useCallback(() => {
    if (phase === 'importing') return; // Don't close while importing
    setOpen(false);
    setPhase('idle');
    setProgress(null);
    setResult(null);
  }, [phase]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <FolderSearch className="h-4 w-4" />
          {t('batch.importDirectory')}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">
            {t('batch.title')}
          </Dialog.Title>

          {phase === 'idle' && (
            <>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {t('batch.description')}
              </Dialog.Description>
              <div className="mt-6 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
                    {t('common.cancel')}
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <FolderSearch className="h-4 w-4" />
                  {t('batch.selectDirectory')}
                </button>
              </div>
            </>
          )}

          {phase === 'scanning' && (
            <div className="mt-6 flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('batch.scanning')}</p>
            </div>
          )}

          {phase === 'importing' && progress && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {progress.phase === 'reading' ? t('batch.reading') : t('batch.parsing')}: {progress.fileName}
              </p>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="mt-4 flex flex-col gap-4">
              {/* Summary */}
              <div className="flex items-center gap-4 rounded-lg border border-border p-3">
                {result.failed === 0 ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : result.succeeded === 0 ? (
                  <XCircle className="h-8 w-8 text-destructive" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {result.succeeded} {t('batch.succeeded')}, {result.failed} {t('batch.failed')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(result.totalDurationMs / 1000).toFixed(1)}s {t('batch.total')}
                  </span>
                </div>
              </div>

              {/* Error details */}
              {result.failed > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border border-border">
                  {result.results
                    .filter((r) => !r.success)
                    .map((r, i) => (
                      <div key={i} className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{r.fileName}</p>
                          <p className="text-xs text-muted-foreground">{r.error}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
