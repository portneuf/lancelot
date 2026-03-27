import { useCallback, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/cn';
import { useInspectionStore } from '@/stores';
import type { DefectRecord, DefectColumnSchema, ClassLookupEntry } from '@/core/models';
import { readField } from '../utils/read-field';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string;
  direction: SortDirection;
}

interface ColumnDef {
  /** Key used to read the value from a DefectRecord (or its `extra` map). */
  key: string;
  /** Display label rendered in the header. */
  label: string;
  /** Data type hint for formatting. */
  type: 'int32' | 'float' | 'string' | 'unknown';
  /** Optional unit suffix. */
  unit?: string;
}

interface DefectTableProps {
  defects: DefectRecord[];
  defectSchema: DefectColumnSchema[];
  classLookup: ClassLookupEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 32;

/**
 * Core columns that are always displayed first, in this order.
 * The `key` must match the DefectRecord property name exactly.
 */
const CORE_COLUMNS: ColumnDef[] = [
  { key: 'defectId', label: 'DefectID', type: 'int32' },
  { key: 'xRel', label: 'XRel', type: 'float', unit: 'um' },
  { key: 'yRel', label: 'YRel', type: 'float', unit: 'um' },
  { key: 'xIndex', label: 'XIndex', type: 'int32' },
  { key: 'yIndex', label: 'YIndex', type: 'int32' },
  { key: 'size', label: 'Size', type: 'float', unit: 'um' },
  { key: 'classNumber', label: 'Class', type: 'int32' },
];

/** Set of core keys for fast membership tests. */
const CORE_KEY_SET = new Set(CORE_COLUMNS.map((c) => c.key));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
});

function formatValue(
  value: number | string | undefined | null,
  type: string,
): string {
  if (value === undefined || value === null) return '\u2014';
  if (typeof value === 'string') return value;
  if (type === 'int32' || type === 'float') return numberFormatter.format(value);
  return String(value);
}

function buildClassMap(classLookup: ClassLookupEntry[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const entry of classLookup) {
    map.set(entry.classNumber, entry.className);
  }
  return map;
}

function compareValues(
  a: number | string | undefined,
  b: number | string | undefined,
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

// ---------------------------------------------------------------------------
// SortIcon
// ---------------------------------------------------------------------------

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === 'asc') {
    return (
      <svg
        className="ml-1 inline-block h-3 w-3"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 2L10 8H2L6 2Z" />
      </svg>
    );
  }
  if (direction === 'desc') {
    return (
      <svg
        className="ml-1 inline-block h-3 w-3"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 10L2 4H10L6 10Z" />
      </svg>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// DefectTooltip
// ---------------------------------------------------------------------------

function DefectTooltip({
  defect,
  classMap,
  columns,
}: {
  defect: DefectRecord;
  classMap: Map<number, string>;
  columns: ColumnDef[];
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <table className="border-separate border-spacing-x-2 border-spacing-y-0.5">
        <tbody>
          {columns.map((col) => {
            let display: string;
            if (col.key === 'classNumber') {
              const raw = defect.classNumber;
              const name = raw !== undefined ? classMap.get(raw) : undefined;
              display =
                name !== undefined && raw !== undefined
                  ? `${name} (${raw})`
                  : formatValue(raw, col.type);
            } else {
              display = formatValue(readField(defect, col.key), col.type);
            }
            return (
              <tr key={col.key}>
                <td className="pr-2 font-semibold text-muted-foreground whitespace-nowrap">
                  {col.label}
                  {col.unit ? ` (${col.unit})` : ''}
                </td>
                <td className="whitespace-nowrap">{display}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DefectTable
// ---------------------------------------------------------------------------

export function DefectTable({ defects, defectSchema, classLookup }: DefectTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Inspection store
  const selectedDefectIds = useInspectionStore((s) => s.selectedDefectIds);
  const selectDefects = useInspectionStore((s) => s.selectDefects);

  // Tooltip
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  // Sort state
  const [sort, setSort] = useState<SortState>({ column: '', direction: null });

  // Class lookup map
  const classMap = useMemo(() => buildClassMap(classLookup), [classLookup]);

  // Build column definitions: core first, then extras from schema
  const columns = useMemo<ColumnDef[]>(() => {
    const extra: ColumnDef[] = [];
    for (const col of defectSchema) {
      if (CORE_KEY_SET.has(col.name)) continue;
      extra.push({
        key: col.name,
        label: col.name,
        type: col.type,
        unit: col.unit,
      });
    }
    return [...CORE_COLUMNS, ...extra];
  }, [defectSchema]);

  // Sorted defects
  const sortedDefects = useMemo(() => {
    if (!sort.direction || !sort.column) return defects;

    const col = sort.column;
    const dir = sort.direction === 'asc' ? 1 : -1;

    return [...defects].sort((a, b) => {
      const va = readField(a, col);
      const vb = readField(b, col);
      return dir * compareValues(va, vb);
    });
  }, [defects, sort]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: sortedDefects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // Handlers
  const handleHeaderClick = useCallback((columnKey: string) => {
    setSort((prev) => {
      if (prev.column !== columnKey) {
        return { column: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') return { column: columnKey, direction: 'desc' };
      if (prev.direction === 'desc') return { column: '', direction: null };
      return { column: columnKey, direction: 'asc' };
    });
  }, []);

  const handleRowClick = useCallback(
    (defectId: number, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        // Toggle individual defect in multi-select
        const current = new Set(selectedDefectIds);
        if (current.has(defectId)) {
          current.delete(defectId);
        } else {
          current.add(defectId);
        }
        selectDefects([...current]);
      } else {
        selectDefects([defectId]);
      }
    },
    [selectedDefectIds, selectDefects],
  );

  // Resolve display value for a cell
  const getCellDisplay = useCallback(
    (defect: DefectRecord, col: ColumnDef): string => {
      if (col.key === 'classNumber') {
        const raw = defect.classNumber;
        const name = raw !== undefined ? classMap.get(raw) : undefined;
        return name ?? formatValue(raw, col.type);
      }
      return formatValue(readField(defect, col.key), col.type);
    },
    [classMap],
  );

  return (
    <div ref={parentRef} className="relative h-full overflow-auto">
      {/* Header row -- sticky */}
      <div className="sticky top-0 z-10 flex bg-muted/95 backdrop-blur-sm border-b border-border">
        {columns.map((col) => (
          <div
            key={col.key}
            role="columnheader"
            className="flex-shrink-0 cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            style={{ minWidth: 90 }}
            onClick={() => handleHeaderClick(col.key)}
          >
            {col.label}
            {col.unit ? (
              <span className="ml-0.5 font-normal text-muted-foreground/70">
                ({col.unit})
              </span>
            ) : null}
            <SortIcon direction={sort.column === col.key ? sort.direction : null} />
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const defect = sortedDefects[virtualRow.index];
          const isSelected = selectedDefectIds.has(defect.defectId);
          const isEven = virtualRow.index % 2 === 0;
          const isHovered = hoveredRowIndex === virtualRow.index;

          return (
            <div
              key={defect.defectId}
              role="row"
              className={cn(
                'absolute left-0 flex w-full cursor-pointer items-center transition-colors',
                isEven ? 'bg-background' : 'bg-muted/30',
                isSelected && 'bg-primary/15 hover:bg-primary/20',
                !isSelected && 'hover:bg-accent/50',
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={(e) => handleRowClick(defect.defectId, e)}
              onMouseEnter={() => setHoveredRowIndex(virtualRow.index)}
              onMouseLeave={() => setHoveredRowIndex(null)}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  role="cell"
                  className="flex-shrink-0 truncate whitespace-nowrap px-3 text-xs"
                  style={{ minWidth: 90 }}
                >
                  {getCellDisplay(defect, col)}
                </div>
              ))}

              {/* Tooltip on hover */}
              {isHovered && (
                <div className="relative">
                  <DefectTooltip
                    defect={defect}
                    classMap={classMap}
                    columns={columns}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
