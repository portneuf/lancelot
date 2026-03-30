/**
 * StatusBar slot components for the Portal's status bar.
 *
 * These are lightweight components that read from Zustand stores
 * and render compact info for the Portal's bottom bar.
 */

import { useFileStore, useInspectionStore } from '@/stores';

export function FileInfoSlot() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const loadingState = useFileStore((s) => s.loadingState);

  const file = activeFileId ? files.get(activeFileId) : null;

  if (!file) {
    if (loadingState === 'parsing') return <span>Parsing...</span>;
    if (loadingState === 'reading') return <span>Reading...</span>;
    return <span>No file loaded</span>;
  }

  return (
    <span>
      {file.source.fileName} | {file.identity.lotId} / {file.identity.waferId}
    </span>
  );
}

export function DefectCountSlot() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);

  const file = activeFileId ? files.get(activeFileId) : null;
  if (!file) return null;

  const total = file.defects.length;
  const isFiltered = filteredDefectIds != null;

  return (
    <span>
      {isFiltered
        ? `${filteredDefectIds.size.toLocaleString()} / ${total.toLocaleString()}`
        : total.toLocaleString()}{' '}
      defects
    </span>
  );
}
