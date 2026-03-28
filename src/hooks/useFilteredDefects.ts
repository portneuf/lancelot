/**
 * Global hook that computes filtered defects from the active file
 * based on the current filter criteria in inspection-store.
 *
 * Used by all views (DefectTable, WaferMap, Analysis charts) to ensure
 * consistent filtering across the entire application.
 */

import { useMemo, useEffect } from 'react';
import { useFileStore, useInspectionStore } from '@/stores';
import { readField } from '@/features/inspection/utils/read-field';
import type { DefectRecord } from '@/core/models/defect';

export function useFilteredDefects() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const filters = useInspectionStore((s) => s.filters);
  const setFilteredDefectIds = useInspectionStore((s) => s.setFilteredDefectIds);

  const file = activeFileId ? files.get(activeFileId) : undefined;
  const allDefects = file?.defects ?? [];

  const filteredDefects = useMemo(() => {
    let defects: DefectRecord[] = allDefects;

    // Class filter
    if (filters.classNumbers.size > 0) {
      defects = defects.filter((d) => d.classNumber != null && filters.classNumbers.has(d.classNumber));
    }

    // Numeric range filters
    for (const [key, range] of Object.entries(filters.numericRanges)) {
      const [min, max] = range;
      if (min == null && max == null) continue;
      defects = defects.filter((d) => {
        const val = readField(d, key);
        if (typeof val !== 'number') return true;
        if (min != null && val < min) return false;
        if (max != null && val > max) return false;
        return true;
      });
    }

    // Text search
    if (filters.searchText) {
      const q = filters.searchText.toLowerCase();
      defects = defects.filter((d) =>
        String(d.defectId).includes(q) ||
        String(d.classNumber).includes(q) ||
        (d.extra['_className'] ?? '').toString().toLowerCase().includes(q),
      );
    }

    return defects;
  }, [allDefects, filters]);

  const totalCount = allDefects.length;
  const filteredCount = filteredDefects.length;
  const isFiltered = filteredCount < totalCount;

  // Sync filteredDefectIds to store for WaferMap dimming
  useEffect(() => {
    if (isFiltered && filteredCount > 0) {
      setFilteredDefectIds(new Set(filteredDefects.map((d) => d.defectId)));
    } else {
      setFilteredDefectIds(null);
    }
  }, [filteredDefects, isFiltered, filteredCount, setFilteredDefectIds]);

  return { file, filteredDefects, totalCount, filteredCount, isFiltered };
}
