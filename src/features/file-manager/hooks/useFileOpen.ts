/**
 * Hook for opening and parsing inspection files.
 *
 * Uses a Web Worker for parsing to keep the UI responsive.
 * Falls back to main-thread parsing if Worker is unavailable.
 */

import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useFileStore } from '@/stores';
import { initializeRegistry } from '@/core/parsers';
import type { WorkerRequest, WorkerResponse } from '@/core/parsers/worker/parse-worker-protocol';

export function useFileOpen() {
  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const setLoadingState = useFileStore((s) => s.setLoadingState);
  const setLoadingProgress = useFileStore((s) => s.setLoadingProgress);
  const setParseErrors = useFileStore((s) => s.setParseErrors);
  const setParseWarnings = useFileStore((s) => s.setParseWarnings);
  const addRecentFile = useFileStore((s) => s.addRecentFile);
  const navigate = useNavigate();
  const workerRef = useRef<Worker | null>(null);

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
  }, [setActiveFile, setLoadingState, setLoadingProgress, setParseErrors, setParseWarnings, addRecentFile]);

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
              const fileId = `${file.name}-${Date.now()}`;
              setActiveFile(fileId, msg.result.data);
              setParseWarnings(msg.result.warnings);
              addRecentFile({
                name: file.name,
                format: msg.result.data.source.formatId,
                openedAt: new Date().toISOString(),
              });
              navigate('/wafer/map');
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
  }, [setActiveFile, setLoadingProgress, setParseErrors, setParseWarnings, addRecentFile, navigate]);

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
      const fileId = `${file.name}-${Date.now()}`;
      setActiveFile(fileId, result.data);
      setParseWarnings(result.warnings);
      addRecentFile({
        name: file.name,
        format: result.data.source.formatId,
        openedAt: new Date().toISOString(),
      });
      navigate('/wafer/map');
    } else {
      setParseErrors(result.errors);
    }
  }, [setActiveFile, setLoadingProgress, setParseErrors, setParseWarnings, addRecentFile, navigate]);

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.klarf,.kla,.000,.001,.002,.003';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) openFile(file);
    };
    input.click();
  }, [openFile]);

  return { openFile, openFilePicker };
}
