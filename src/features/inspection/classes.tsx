import { useMemo } from 'react';
import { Tags } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { cn } from '@/lib/cn';
import type { ClassLookupEntry, DefectRecord } from '@/core/models';

const numberFormatter = new Intl.NumberFormat();

/**
 * Build a map from class number to the count of defects with that class.
 */
function buildDefectCountMap(defects: DefectRecord[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const defect of defects) {
    if (defect.classNumber !== undefined) {
      counts.set(defect.classNumber, (counts.get(defect.classNumber) ?? 0) + 1);
    }
  }
  return counts;
}

interface ClassRowData {
  entry: ClassLookupEntry;
  defectCount: number;
}

export default function ClassesPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);

  const file = activeFileId ? files.get(activeFileId) : undefined;

  const rows = useMemo<ClassRowData[]>(() => {
    if (!file) return [];
    const countMap = buildDefectCountMap(file.defects);
    return file.classLookup.map((entry) => ({
      entry,
      defectCount: countMap.get(entry.classNumber) ?? 0,
    }));
  }, [file]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Tags} title="No Data" description="Open a file to view class lookup" />
      </div>
    );
  }

  const classCount = file.classLookup.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <h1 className="text-sm font-semibold">Class Lookup</h1>
        <span className="text-xs text-muted-foreground">
          {numberFormatter.format(classCount)} class{classCount !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={Tags}
              title="No Classes"
              description="No class lookup entries found in this file"
            />
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <tr>
                <th className="whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold text-muted-foreground">
                  Class Number
                </th>
                <th className="whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold text-muted-foreground">
                  Class Name
                </th>
                <th className="whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold text-muted-foreground">
                  Class Code
                </th>
                <th className="whitespace-nowrap border-b border-border px-4 py-2 text-right font-semibold text-muted-foreground">
                  Defect Count
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.entry.classNumber}
                  className={cn(
                    'transition-colors hover:bg-accent/50',
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                  )}
                >
                  <td className="whitespace-nowrap border-b border-border/50 px-4 py-2 tabular-nums">
                    {row.entry.classNumber}
                  </td>
                  <td className="whitespace-nowrap border-b border-border/50 px-4 py-2">
                    {row.entry.className}
                  </td>
                  <td className="whitespace-nowrap border-b border-border/50 px-4 py-2 text-muted-foreground">
                    {row.entry.classCode ?? '\u2014'}
                  </td>
                  <td className="whitespace-nowrap border-b border-border/50 px-4 py-2 text-right tabular-nums">
                    {numberFormatter.format(row.defectCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
