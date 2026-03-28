/**
 * Inspection history panel that displays previously opened files
 * stored in IndexedDB.
 *
 * Renders a table sorted by most-recently-opened first, with per-row
 * delete and a bulk "Clear History" action.
 */

import { useCallback, useEffect, useState } from 'react';
import { Trash2, History, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  getInspectionHistory,
  deleteInspection,
  clearHistory,
} from '@/core/services/inspection-db';
import type { InspectionHistoryEntry } from '@/core/services/inspection-db';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}


export default function InspectionHistory() {
  const [entries, setEntries] = useState<InspectionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInspectionHistory();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteInspection(id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        console.error('Failed to delete inspection entry', err);
      }
    },
    [],
  );

  const handleClear = useCallback(async () => {
    try {
      await clearHistory();
      setEntries([]);
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        Loading history...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <History className="h-8 w-8 opacity-40" />
        <p>No inspection history yet.</p>
        <p className="text-xs">Files you open will appear here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" />
          Recent Inspections
        </h3>
        <button
          onClick={handleClear}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          Clear History
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 font-medium text-muted-foreground">File Name</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Lot</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Wafer</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Defects</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Opened At</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={cn(
                  'border-b border-border last:border-b-0 transition-colors hover:bg-muted/30',
                )}
              >
                <td className="max-w-[180px] truncate px-3 py-2 font-medium" title={entry.fileName}>
                  {entry.fileName}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{entry.lotId || '-'}</td>
                <td className="px-3 py-2 text-muted-foreground">{entry.waferId || '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {entry.defectCount.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.openedAt)}</td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${entry.fileName} from history`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-1.5 text-right text-xs text-muted-foreground">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
}
