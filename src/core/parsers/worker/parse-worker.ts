/**
 * Web Worker entry point for parsing inspection files off the main thread.
 *
 * Receives a WorkerRequest with the full file text, detects the format,
 * parses it, and posts back progress updates and the final result.
 */

import { ParserRegistry } from '../parser-registry';
import { KlarfAdapter } from '../klarf';
import type { WorkerRequest, WorkerResponse } from './parse-worker-protocol';

// Initialize registry inside the worker
const registry = ParserRegistry.getInstance();
try {
  registry.register(new KlarfAdapter());
} catch {
  // Already registered
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;

  if (req.type !== 'parse') return;

  try {
    // Detect format
    const adapter = req.formatId
      ? registry.getAdapter(req.formatId)
      : registry.detect(req.fileName, req.text);

    if (!adapter) {
      post({
        type: 'error',
        message: `No parser found for file: ${req.fileName}`,
      });
      return;
    }

    // Parse with progress reporting
    const result = adapter.parse(req.text, (progress) => {
      post({ type: 'progress', progress });
    });

    post({ type: 'complete', result });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}
