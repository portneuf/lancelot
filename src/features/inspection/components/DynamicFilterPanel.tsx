import { useMemo, useState, useEffect, useCallback } from 'react';
import { RangeSlider } from '@/components/shared/RangeSlider';
import { useInspectionStore } from '@/stores';
import { useDebounce } from '@/hooks/useDebounce';
import { readField } from '../utils/read-field';
import { computeHistogramBins } from '../utils/compute-histogram';
import type { DefectRecord } from '@/core/models/defect';
import type { DefectColumnSchema } from '@/core/models/defect';

interface DynamicFilterPanelProps {
  defects: DefectRecord[];
  defectSchema: DefectColumnSchema[];
}

/** Core numeric fields always available on DefectRecord. */
const CORE_NUMERIC_KEYS = [
  { key: 'size', label: 'Size', unit: 'um' },
  { key: 'xAbs', label: 'X (wafer)', unit: 'um' },
  { key: 'yAbs', label: 'Y (wafer)', unit: 'um' },
  { key: 'xRel', label: 'X (die-rel)', unit: 'um' },
  { key: 'yRel', label: 'Y (die-rel)', unit: 'um' },
  { key: 'xIndex', label: 'Die X' },
  { key: 'yIndex', label: 'Die Y' },
];

/** Keys already covered by CORE_NUMERIC_KEYS (don't duplicate from schema). */
const CORE_KEY_SET = new Set(CORE_NUMERIC_KEYS.map((c) => c.key));
/** Schema column names that map to core keys. */
const SCHEMA_TO_CORE: Record<string, string> = {
  XREL: 'xRel', YREL: 'yRel', XINDEX: 'xIndex', YINDEX: 'yIndex',
  DSIZE: 'size', DEFECTSIZE: 'size', DEFECTID: 'defectId',
  CLASSNUMBER: 'classNumber', TEST: 'test', CLUSTERNUMBER: 'clusterNumber',
  IMAGECOUNT: 'imageCount',
};

interface ColumnRange {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  histogram: number[];
}

export function DynamicFilterPanel({ defects, defectSchema }: DynamicFilterPanelProps) {
  const filters = useInspectionStore((s) => s.filters);
  const updateFilters = useInspectionStore((s) => s.updateFilters);

  // Compute column ranges and histograms from full defect set
  const columns = useMemo(() => {
    const result: ColumnRange[] = [];

    // Core numeric fields
    for (const col of CORE_NUMERIC_KEYS) {
      const values = defects
        .map((d) => readField(d, col.key))
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      if (values.length === 0) continue;

      let min = Infinity, max = -Infinity;
      for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
      if (min === max) { min -= 1; max += 1; }

      result.push({
        key: col.key,
        label: col.label,
        unit: col.unit,
        min,
        max,
        histogram: computeHistogramBins(values, min, max),
      });
    }

    // Extra columns from defectSchema (not already covered)
    for (const schemaCol of defectSchema) {
      const coreKey = SCHEMA_TO_CORE[schemaCol.name];
      if (coreKey && CORE_KEY_SET.has(coreKey)) continue;
      if (coreKey) {
        // Mapped but not in core list (e.g., TEST, CLUSTERNUMBER)
        const values = defects
          .map((d) => readField(d, coreKey))
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        if (values.length === 0) continue;
        let min = Infinity, max = -Infinity;
        for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
        if (min === max) { min -= 1; max += 1; }
        result.push({
          key: coreKey,
          label: schemaCol.name,
          min, max,
          histogram: computeHistogramBins(values, min, max),
        });
        continue;
      }

      if (schemaCol.type !== 'int32' && schemaCol.type !== 'float') continue;

      const values = defects
        .map((d) => readField(d, schemaCol.name))
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) continue;

      let min = Infinity, max = -Infinity;
      for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
      if (min === max) { min -= 1; max += 1; }

      result.push({
        key: schemaCol.name,
        label: schemaCol.name,
        min, max,
        histogram: computeHistogramBins(values, min, max),
      });
    }

    return result;
  }, [defects, defectSchema]);

  // Local slider values for immediate feedback
  const [localRanges, setLocalRanges] = useState<Record<string, [number, number]>>({});

  // Initialize local ranges from store or defaults
  useEffect(() => {
    const initial: Record<string, [number, number]> = {};
    for (const col of columns) {
      const storeRange = filters.numericRanges[col.key];
      initial[col.key] = storeRange
        ? [storeRange[0] ?? col.min, storeRange[1] ?? col.max]
        : [col.min, col.max];
    }
    setLocalRanges(initial);
  }, [columns]); // Only on column structure change, not on every filter update

  // Debounce local ranges before writing to store
  const debouncedRanges = useDebounce(localRanges, 150);

  useEffect(() => {
    const numericRanges: Record<string, [number | null, number | null]> = {};
    for (const col of columns) {
      const range = debouncedRanges[col.key];
      if (!range) continue;
      // Only set filter if range is narrower than full extent
      if (range[0] > col.min || range[1] < col.max) {
        numericRanges[col.key] = [range[0], range[1]];
      }
    }
    updateFilters({ numericRanges });
  }, [debouncedRanges, columns, updateFilters]);

  const handleSliderChange = useCallback((key: string, value: [number, number]) => {
    setLocalRanges((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (columns.length === 0) return null;

  return (
    <div className="border-b border-border bg-muted/20 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <RangeSlider
            key={col.key}
            label={col.label}
            min={col.min}
            max={col.max}
            value={localRanges[col.key] ?? [col.min, col.max]}
            onChange={(v) => handleSliderChange(col.key, v)}
            histogramData={col.histogram}
            unit={col.unit}
          />
        ))}
      </div>
    </div>
  );
}
