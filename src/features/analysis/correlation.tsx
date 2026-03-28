import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ScatterChart as ScatterIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFilteredDefects } from '@/hooks/useFilteredDefects';
import { readField } from '@/features/inspection/utils/read-field';
import { useTranslation } from '@/i18n/useTranslation';

/** Available numeric columns for axis selection. */
const AXIS_OPTIONS = [
  { key: 'xAbs', label: 'X Abs (um)' },
  { key: 'yAbs', label: 'Y Abs (um)' },
  { key: 'xRel', label: 'X Rel (um)' },
  { key: 'yRel', label: 'Y Rel (um)' },
  { key: 'size', label: 'Size (um)' },
  { key: 'xIndex', label: 'Die X' },
  { key: 'yIndex', label: 'Die Y' },
  { key: 'defectId', label: 'Defect ID' },
  { key: 'classNumber', label: 'Class' },
];

interface DataPoint {
  x: number;
  y: number;
  id: number;
}

function pearsonR(data: DataPoint[]): number {
  const n = data.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of data) {
    sumX += p.x; sumY += p.y; sumXY += p.x * p.y;
    sumX2 += p.x * p.x; sumY2 += p.y * p.y;
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function linearRegression(data: DataPoint[]): { slope: number; intercept: number } | null {
  const n = data.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of data) { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x; }
  const den = n * sumX2 - sumX * sumX;
  if (den === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / den;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export default function CorrelationPage() {
  const { file, filteredDefects } = useFilteredDefects();
  const [xKey, setXKey] = useState('size');
  const [yKey, setYKey] = useState('xAbs');
  const [showRegression, setShowRegression] = useState(true);
  const { t } = useTranslation();

  // Build extra axis options from defectSchema
  const axisOptions = useMemo(() => {
    if (!file) return AXIS_OPTIONS;
    const extraKeys = new Set(AXIS_OPTIONS.map((o) => o.key));
    const extras = file.defectSchema
      .filter((s) => (s.type === 'int32' || s.type === 'float') && !extraKeys.has(s.name) && !extraKeys.has(s.name.toLowerCase()))
      .map((s) => ({ key: s.name, label: s.name }));
    return [...AXIS_OPTIONS, ...extras];
  }, [file]);

  const data = useMemo<DataPoint[]>(() => {
    return filteredDefects
      .map((d) => {
        const x = readField(d, xKey);
        const y = readField(d, yKey);
        if (typeof x !== 'number' || typeof y !== 'number') return null;
        return { x, y, id: d.defectId };
      })
      .filter((p): p is DataPoint => p !== null)
      .slice(0, 10000); // cap for chart performance
  }, [filteredDefects, xKey, yKey]);

  const r = useMemo(() => pearsonR(data), [data]);
  const regression = useMemo(() => showRegression ? linearRegression(data) : null, [data, showRegression]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={ScatterIcon} title={t('common.noData')} description={t('correlation.openFileToView')} />
      </div>
    );
  }

  const xLabel = axisOptions.find((o) => o.key === xKey)?.label ?? xKey;
  const yLabel = axisOptions.find((o) => o.key === yKey)?.label ?? yKey;

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <label className="font-medium text-muted-foreground">{t('correlation.xAxis')}:</label>
          <select
            value={xKey}
            onChange={(e) => setXKey(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            {axisOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="font-medium text-muted-foreground">{t('correlation.yAxis')}:</label>
          <select
            value={yKey}
            onChange={(e) => setYKey(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            {axisOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={showRegression}
            onChange={(e) => setShowRegression(e.target.checked)}
            className="rounded"
          />
          {t('correlation.regressionLine')}
        </label>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>Pearson r = <span className="font-semibold tabular-nums text-foreground">{r.toFixed(4)}</span></span>
          <span>{data.length.toLocaleString()} points</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="x"
              type="number"
              name={xLabel}
              tick={{ fontSize: 10 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -10, style: { fontSize: 11 } }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name={yLabel}
              tick={{ fontSize: 10 }}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as DataPoint;
                return (
                  <div className="rounded border border-border bg-popover px-2 py-1 text-xs shadow">
                    <p>ID: {p.id}</p>
                    <p>{xLabel}: {p.x.toLocaleString()}</p>
                    <p>{yLabel}: {p.y.toLocaleString()}</p>
                  </div>
                );
              }}
            />
            <Scatter data={data} fill="#2563eb" fillOpacity={0.5} r={2} />
            {regression && data.length > 0 && (() => {
              const xs = data.map((d) => d.x);
              const minX = Math.min(...xs), maxX = Math.max(...xs);
              return (
                <ReferenceLine
                  segment={[
                    { x: minX, y: regression.intercept + regression.slope * minX },
                    { x: maxX, y: regression.intercept + regression.slope * maxX },
                  ]}
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              );
            })()}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
