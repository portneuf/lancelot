/**
 * Classifier Analysis page — applies rule-based classification to filtered
 * defects and visualises the results as a table with a pie chart summary.
 */

import { useMemo, useState, useCallback } from 'react';
import { Brain } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFilteredDefects } from '@/hooks/useFilteredDefects';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  classifyDefects,
  DEFAULT_RULES,
} from '@/core/services/defect-classifier.service';
import type { ClassificationResult } from '@/core/services/defect-classifier.service';
import type { ClassLookupEntry } from '@/core/models/inspection-file';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PIE_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#e11d48', '#65a30d', '#6d28d9', '#059669',
  '#d97706', '#4f46e5', '#be123c', '#0d9488', '#c026d3',
  '#ea580c',
];

const numberFormatter = new Intl.NumberFormat();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

interface PieEntry {
  name: string;
  value: number;
  color: string;
}

function buildPieData(results: ClassificationResult[]): PieEntry[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    counts.set(r.suggestedClass, (counts.get(r.suggestedClass) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

function confidenceColor(confidence: number): string {
  if (confidence > 0.7) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function confidenceBg(confidence: number): string {
  if (confidence > 0.7) return 'bg-green-500/10';
  if (confidence >= 0.5) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

function resolveClassName(
  classNumber: number | undefined,
  classLookup: ClassLookupEntry[],
): string {
  if (classNumber == null) return 'Unclassified';
  const entry = classLookup.find((c) => c.classNumber === classNumber);
  return entry ? entry.className : `Class ${classNumber}`;
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function ClassifierPage() {
  const { file, filteredDefects, filteredCount, isFiltered } =
    useFilteredDefects();

  // Track which rules are enabled by name.
  const [disabledRules, setDisabledRules] = useState<Set<string>>(new Set());

  const toggleRule = useCallback((ruleName: string) => {
    setDisabledRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleName)) {
        next.delete(ruleName);
      } else {
        next.add(ruleName);
      }
      return next;
    });
  }, []);

  // Classification results.
  const results = useMemo<ClassificationResult[]>(() => {
    if (!file || filteredDefects.length === 0) return [];

    const { waferDiameter, sampleCenterLocation } = file.waferGeometry;

    // Filter out disabled rules while preserving geometry-aware closures.
    const enabledRules = DEFAULT_RULES.filter(
      (r) => !disabledRules.has(r.name),
    );

    return classifyDefects(
      filteredDefects,
      waferDiameter,
      sampleCenterLocation,
      enabledRules.length > 0 ? enabledRules : undefined,
    );
  }, [file, filteredDefects, disabledRules]);

  // Summary stats.
  const reclassifiedCount = useMemo(() => {
    if (!file) return 0;
    return results.filter((r) => {
      const currentName = resolveClassName(r.currentClass, file.classLookup);
      return currentName !== r.suggestedClass;
    }).length;
  }, [results, file]);

  // Pie chart data.
  const pieData = useMemo(() => buildPieData(results), [results]);

  /* -- Empty state -------------------------------------------------- */

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Brain}
          title="No Data"
          description="Open a file to run defect classification"
        />
      </div>
    );
  }

  /* -- Main render -------------------------------------------------- */

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">Rule-Based Defect Classifier</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {numberFormatter.format(filteredCount)} defect{filteredCount !== 1 ? 's' : ''}
            {isFiltered ? ' (filtered)' : ''}
          </span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 font-medium',
              'bg-primary/10 text-primary',
            )}
          >
            {numberFormatter.format(results.length)} classified
          </span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 font-medium',
              reclassifiedCount > 0
                ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                : 'bg-green-500/10 text-green-700 dark:text-green-400',
            )}
          >
            {numberFormatter.format(reclassifiedCount)} would be reclassified
          </span>
        </div>
      </div>

      {/* Rule toggles */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Rules:</span>
        {DEFAULT_RULES.map((rule) => {
          const enabled = !disabledRules.has(rule.name);
          return (
            <button
              key={rule.name}
              onClick={() => toggleRule(rule.name)}
              title={rule.description}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                enabled
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-muted text-muted-foreground line-through',
              )}
            >
              {rule.name}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* Results table */}
        <div className="min-w-0 flex-1 overflow-auto">
          {results.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Brain}
                title="No Matches"
                description="No defects matched the active classification rules"
              />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Defect ID</th>
                  <th className="px-3 py-2 text-left font-medium">Current Class</th>
                  <th className="px-3 py-2 text-left font-medium">Suggested Class</th>
                  <th className="px-3 py-2 text-left font-medium">Rule</th>
                  <th className="px-3 py-2 text-right font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const currentName = resolveClassName(
                    r.currentClass,
                    file.classLookup,
                  );
                  const changed = currentName !== r.suggestedClass;
                  return (
                    <tr
                      key={r.defectId}
                      className={cn(
                        'border-t border-border transition-colors hover:bg-muted/50',
                        changed && 'bg-yellow-500/5',
                      )}
                    >
                      <td className="px-3 py-1.5 font-mono">{r.defectId}</td>
                      <td className="px-3 py-1.5">{currentName}</td>
                      <td className="px-3 py-1.5 font-medium">
                        {r.suggestedClass}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {r.ruleName}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 font-mono font-medium',
                            confidenceColor(r.confidence),
                            confidenceBg(r.confidence),
                          )}
                        >
                          {(r.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie chart sidebar */}
        {pieData.length > 0 && (
          <div className="flex w-80 shrink-0 flex-col border-l border-border">
            <div className="border-b border-border px-4 py-2">
              <h2 className="text-xs font-semibold text-muted-foreground">
                Suggested Class Distribution
              </h2>
            </div>
            <div className="flex-1 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    innerRadius="40%"
                    paddingAngle={2}
                    label={false}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload as PieEntry;
                      return (
                        <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold">{data.name}</p>
                          <p>
                            Count: {numberFormatter.format(data.value)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary breakdown */}
            <div className="border-t border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Class</th>
                    <th className="px-3 py-1.5 text-right font-medium">Count</th>
                    <th className="px-3 py-1.5 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((entry) => (
                    <tr
                      key={entry.name}
                      className="border-t border-border hover:bg-muted/50"
                    >
                      <td className="px-3 py-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-right font-mono">
                        {numberFormatter.format(entry.value)}
                      </td>
                      <td className="px-3 py-1 text-right font-mono">
                        {results.length > 0
                          ? ((entry.value / results.length) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
