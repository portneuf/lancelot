/**
 * Hook for opening and parsing inspection files.
 *
 * Uses a Web Worker for parsing to keep the UI responsive.
 * Falls back to main-thread parsing if Worker is unavailable.
 *
 * After parsing, data is written to both:
 * - file-store (Zustand, for existing views)
 * - DefectStorageAdapter (for new adapter-based views like Gallery/Stacking)
 */

import { useCallback, useRef } from 'react';
import { useFileStore } from '@/stores';
import { useStorage } from '@/core/storage';
import { useLancelotNavigate } from '@/hooks/useLancelotNavigate';
import { initializeRegistry } from '@/core/parsers';
import { saveInspection } from '@/core/services/inspection-db';
import type { WorkerRequest, WorkerResponse } from '@/core/parsers/worker/parse-worker-protocol';
import type { InspectionFile } from '@/core/models/inspection-file';

/** Persist parsed inspection metadata to IndexedDB (fire-and-forget). */
function persistToHistory(fileId: string, file: File, data: InspectionFile): void {
  saveInspection({
    id: fileId,
    fileName: file.name,
    lotId: data.identity.lotId ?? '',
    waferId: data.identity.waferId ?? '',
    deviceId: data.identity.deviceId ?? '',
    defectCount: data.defects.length,
    openedAt: new Date().toISOString(),
    fileSize: file.size,
    format: data.source.formatId,
  }).catch((err) => {
    // History persistence is non-critical; log and continue.
    console.warn('Failed to save inspection to history', err);
  });
}

export function useFileOpen() {
  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const setLoadingState = useFileStore((s) => s.setLoadingState);
  const setLoadingProgress = useFileStore((s) => s.setLoadingProgress);
  const setParseErrors = useFileStore((s) => s.setParseErrors);
  const setParseWarnings = useFileStore((s) => s.setParseWarnings);
  const addRecentFile = useFileStore((s) => s.addRecentFile);
  const lancelotNavigate = useLancelotNavigate();
  const storage = useStorage();
  const workerRef = useRef<Worker | null>(null);

  /** Common success handler for both worker and main-thread paths. */
  const handleParseSuccess = useCallback(
    (file: File, data: InspectionFile, warnings: import('@/core/models/inspection-file').ParseWarning[]) => {
      const fileId = `${file.name}-${Date.now()}`;

      // 1. Zustand store (existing views)
      setActiveFile(fileId, data);
      setParseWarnings(warnings);
      addRecentFile({
        name: file.name,
        format: data.source.formatId,
        openedAt: new Date().toISOString(),
      });

      // 2. Storage adapter (new adapter-based views)
      storage.importFile(data).catch((err) => {
        console.warn('Failed to import file into storage adapter', err);
      });

      // 3. IndexedDB history (fire-and-forget)
      persistToHistory(fileId, file, data);

      // 4. Navigate to wafer map
      lancelotNavigate('wafer-map');
    },
    [setActiveFile, setParseWarnings, addRecentFile, storage, lancelotNavigate],
  );

  const openFile = useCallback(async (file: File) => {
    setLoadingState('reading');
    setLoadingProgress(0);

    try {
      const text = await file.text();
      setLoadingState('parsing');

      // Try Web Worker first
      if (typeof Worker !== 'undefined') {
        try {
          await parseInWorker(file, text);
          return;
        } catch {
          // Fall back to main thread
        }
      }

      // Main-thread fallback
      parseOnMainThread(file, text);
    } catch (err) {
      setParseErrors([{
        code: 'FILE_READ_ERROR',
        message: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      }]);
    }
  }, [setLoadingState, setLoadingProgress, setParseErrors]);

  const parseInWorker = useCallback((file: File, text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Terminate previous worker if any
      workerRef.current?.terminate();

      const worker = new Worker(
        new URL('@/core/parsers/worker/parse-worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;

        switch (msg.type) {
          case 'progress':
            setLoadingProgress(msg.progress.fraction);
            break;

          case 'complete':
            worker.terminate();
            workerRef.current = null;

            if (msg.result.success) {
              handleParseSuccess(file, msg.result.data, msg.result.warnings);
            } else {
              setParseErrors(msg.result.errors);
            }
            resolve();
            break;

          case 'error':
            worker.terminate();
            workerRef.current = null;
            reject(new Error(msg.message));
            break;
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        workerRef.current = null;
        reject(err);
      };

      const request: WorkerRequest = {
        type: 'parse',
        text,
        fileName: file.name,
        fileSize: file.size,
      };
      worker.postMessage(request);
    });
  }, [setLoadingProgress, setParseErrors, handleParseSuccess]);

  const parseOnMainThread = useCallback((file: File, text: string) => {
    const registry = initializeRegistry();
    const adapter = registry.detect(file.name, text);

    if (!adapter) {
      setParseErrors([{
        code: 'NO_PARSER',
        message: `No parser found for file: ${file.name}`,
        severity: 'error',
      }]);
      return;
    }

    const result = adapter.parse(text, (progress) => {
      setLoadingProgress(progress.fraction);
    });

    if (result.success) {
      handleParseSuccess(file, result.data, result.warnings);
    } else {
      setParseErrors(result.errors);
    }
  }, [setLoadingProgress, setParseErrors, handleParseSuccess]);

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.klarf,.kla,.000,.001,.002,.003,.sinf,.inf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) openFile(file);
    };
    input.click();
  }, [openFile]);

  return { openFile, openFilePicker };
}
