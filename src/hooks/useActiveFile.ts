/**
 * Convenience hook for accessing the active InspectionFile.
 *
 * Reads from file-store (Zustand). This is the backward-compatible
 * path used by all existing views. New adapter-based views can use
 * useStorage() + useQuery() directly for DB-backed queries.
 */

import { useFileStore } from '@/stores';
import type { InspectionFile } from '@/core/models/inspection-file';

interface ActiveFileResult {
  file: InspectionFile | null;
  fileId: string | null;
  isLoading: boolean;
}

export function useActiveFile(): ActiveFileResult {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const loadingState = useFileStore((s) => s.loadingState);

  const file = activeFileId ? files.get(activeFileId) ?? null : null;
  const isLoading = loadingState === 'reading' || loadingState === 'parsing';

  return { file, fileId: activeFileId, isLoading };
}
