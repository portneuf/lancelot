import { useMemo } from 'react';
import { useInspectionStore } from '@/stores';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { useTranslation } from '@/i18n/useTranslation';
import type { DefectRecord } from '@/core/models/defect';
import type { ClassLookupEntry } from '@/core/models/inspection-file';

const CHART_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#e11d48', '#65a30d'];

interface ParetoEntry {
  className: string;
  count: number;
  cumulative: number;
  color: string;
}

function buildParetoData(defects: DefectRecord[], classLookup: ClassLookupEntry[]): ParetoEntry[] {
  // Count defects per class
  const counts = new Map<number, number>();
  for (const d of defects) {
    if (d.classNumber != null) {
      counts.set(d.classNumber, (counts.get(d.classNumber) ?? 0) + 1);
    }
  }

  // Build lookup map
  const nameMap = new Map<number, string>();
  for (const c of classLookup) {
    nameMap.set(c.classNumber, c.className);
  }

  // Sort descending by count
  const sorted = [...counts.entries()]
    .map(([classNum, count]) => ({
      className: nameMap.get(classNum) ?? `Class ${classNum}`,
      classNumber: classNum,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Compute cumulative percentage
  const total = defects.length || 1;
  let cumSum = 0;

  return sorted.map((entry, i) => {
    cumSum += entry.count;
    return {
      className: entry.className,
      count: entry.count,
      cumulative: Math.round((cumSum / total) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
}

const numberFormatter = new Intl.NumberFormat();

export default function ParetoPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : undefined;
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
  const { t } = useTranslation();

  const paretoData = useMemo(() => {
    if (!file) return [];
    const defects = filteredDefectIds
      ? file.defects.filter((d) => filteredDefectIds.has(d.defectId))
      : file.defects;
    return buildParetoData(defects, file.classLookup);
  }, [file, filteredDefectIds]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={BarChart3} title={t('common.noData')} description={t('pareto.openFileToView')} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <h1 className="text-sm font-semibold">{t('pareto.title')}</h1>
        <span className="text-xs text-muted-foreground">
          {numberFormatter.format(file.defects.length)} defects across {paretoData.length} classes
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4">
        {paretoData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={BarChart3} title={t('pareto.noClassificationData')} description={t('pareto.noClassesFound')} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={paretoData} margin={{ top: 20, right: 40, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="className"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis
                yAxisId="count"
                tick={{ fontSize: 11 }}
                label={{ value: 'Defect Count', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload as ParetoEntry;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{data.className}</p>
                      <p>Count: {numberFormatter.format(data.count)}</p>
                      <p>Cumulative: {data.cumulative}%</p>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" height={30} />
              <Bar
                yAxisId="count"
                dataKey="count"
                name="Defect Count"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="cumulative"
                name="Cumulative %"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 3, fill: '#dc2626' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
