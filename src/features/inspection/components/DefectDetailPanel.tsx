import { useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useInspectionStore } from '@/stores';
import type { DefectRecord, DefectColumnSchema } from '@/core/models/defect';
import type { ClassLookupEntry } from '@/core/models/inspection-file';

interface DefectDetailPanelProps {
  defects: DefectRecord[];
  defectSchema: DefectColumnSchema[];
  classLookup: ClassLookupEntry[];
}

const numFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

export function DefectDetailPanel({ defects, classLookup }: DefectDetailPanelProps) {
  const highlightedId = useInspectionStore((s) => s.highlightedDefectId);
  const highlightDefect = useInspectionStore((s) => s.highlightDefect);

  const classMap = useMemo(
    () => new Map(classLookup.map((c) => [c.classNumber, c.className])),
    [classLookup],
  );

  const currentIndex = useMemo(
    () => defects.findIndex((d) => d.defectId === highlightedId),
    [defects, highlightedId],
  );

  const defect = currentIndex >= 0 ? defects[currentIndex] : null;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) highlightDefect(defects[currentIndex - 1].defectId);
  }, [currentIndex, defects, highlightDefect]);

  const handleNext = useCallback(() => {
    if (currentIndex < defects.length - 1) highlightDefect(defects[currentIndex + 1].defectId);
  }, [currentIndex, defects, highlightDefect]);

  const handleClose = useCallback(() => highlightDefect(null), [highlightDefect]);

  if (!defect) return null;

  const coreRows: [string, string][] = [
    ['Defect ID', String(defect.defectId)],
    ['X Rel', numFmt.format(defect.xRel) + ' um'],
    ['Y Rel', numFmt.format(defect.yRel) + ' um'],
    ['X Index', String(defect.xIndex)],
    ['Y Index', String(defect.yIndex)],
    ['Size', defect.size != null ? numFmt.format(defect.size) + ' um' : '-'],
    ['Class', defect.classNumber != null
      ? `${classMap.get(defect.classNumber) ?? defect.classNumber} (#${defect.classNumber})`
      : '-'],
    ['X Abs', numFmt.format(defect.xAbs) + ' um'],
    ['Y Abs', numFmt.format(defect.yAbs) + ' um'],
  ];

  const extraRows: [string, string][] = Object.entries(defect.extra)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => [k, typeof v === 'number' ? numFmt.format(v) : String(v)]);

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">Defect #{defect.defectId}</span>
        <button onClick={handleClose} className="rounded p-1 hover:bg-muted" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className={cn('rounded p-1', currentIndex > 0 ? 'hover:bg-muted' : 'opacity-30')}
          aria-label="Previous defect"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} of {defects.length}
        </span>
        <button
          onClick={handleNext}
          disabled={currentIndex >= defects.length - 1}
          className={cn('rounded p-1', currentIndex < defects.length - 1 ? 'hover:bg-muted' : 'opacity-30')}
          aria-label="Next defect"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-1.5">
          {coreRows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular-nums">{value}</span>
            </div>
          ))}

          {extraRows.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground">Extra Fields</span>
              {extraRows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums">{value}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
