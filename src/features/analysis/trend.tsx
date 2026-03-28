import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { useTranslation } from '@/i18n/useTranslation';
import type { InspectionFile } from '@/core/models/inspection-file';

type Metric = 'defects' | 'density' | 'yield';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'defects', label: 'Defect Count' },
  { value: 'density', label: 'Defect Density' },
  { value: 'yield', label: 'Die Yield %' },
];

interface TrendPoint {
  label: string;
  value: number;
  waferId: string;
}

function computeTrendData(files: InspectionFile[], metric: Metric): TrendPoint[] {
  // Sort by timestamp (or wafer ID as fallback)
  const sorted = [...files].sort((a, b) => {
    const ta = a.identity.fileTimestamp ?? a.identity.waferId;
    const tb = b.identity.fileTimestamp ?? b.identity.waferId;
    return ta.localeCompare(tb);
  });

  return sorted.map((file) => {
    let value: number;
    const label = file.identity.waferId || file.source.fileName;

    switch (metric) {
      case 'defects':
        value = file.defects.length;
        break;
      case 'density': {
        const waferAreaCm2 = Math.PI * Math.pow(file.waferGeometry.waferDiameter / 20000, 2);
        value = waferAreaCm2 > 0 ? file.defects.length / waferAreaCm2 : 0;
        break;
      }
      case 'yield': {
        const tested = file.dieMap.filter((d) => d.status === 'tested');
        const clean = tested.filter((d) => d.defectCount === 0);
        value = tested.length > 0 ? (clean.length / tested.length) * 100 : 0;
        break;
      }
    }

    return { label, value, waferId: file.identity.waferId };
  });
}

export default function TrendPage() {
  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const [metric, setMetric] = useState<Metric>('defects');
  const { t } = useTranslation();

  const allFiles = useMemo(() => Array.from(files.values()), [files]);

  const trendData = useMemo(() => {
    if (allFiles.length === 0) return [];

    // If only 1 file loaded, create per-die trend instead
    if (allFiles.length === 1) {
      const file = allFiles[0];
      const dieData = file.dieMap
        .filter((d) => d.status === 'tested')
        .sort((a, b) => a.xIndex * 1000 + a.yIndex - (b.xIndex * 1000 + b.yIndex))
        .map((die) => ({
          label: `(${die.xIndex},${die.yIndex})`,
          value: metric === 'yield' ? (die.defectCount === 0 ? 100 : 0) : die.defectCount,
          waferId: file.identity.waferId,
        }));
      return dieData.slice(0, 100); // cap
    }

    return computeTrendData(allFiles, metric);
  }, [allFiles, metric]);

  // Compute statistics
  const stats = useMemo(() => {
    if (trendData.length === 0) return null;
    const values = trendData.map((d) => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sigma = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
    return { mean, sigma, ucl: mean + 3 * sigma, lcl: Math.max(0, mean - 3 * sigma) };
  }, [trendData]);

  if (!activeFileId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={TrendingUp} title={t('common.noData')} description={t('trend.openFileToView')} />
      </div>
    );
  }

  const isSingleFile = allFiles.length === 1;

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-2">
        <h1 className="text-sm font-semibold">
          {isSingleFile ? t('trend.perDieTrend') : t('trend.lotTrend')}
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <label className="font-medium text-muted-foreground">{t('trend.metric')}:</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {isSingleFile
            ? `${trendData.length} dies`
            : `${allFiles.length} wafers loaded`}
        </span>
      </div>

      {trendData.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={TrendingUp} title={t('trend.noTrendData')} description={t('trend.loadMultipleWafers')} />
        </div>
      ) : (
        <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.max(0, Math.floor(trendData.length / 20))}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const p = payload[0].payload as TrendPoint;
                  return (
                    <div className="rounded border border-border bg-popover px-2 py-1 text-xs shadow">
                      <p className="font-semibold">{p.label}</p>
                      <p>{METRICS.find((m) => m.value === metric)?.label}: {p.value.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={METRICS.find((m) => m.value === metric)?.label}
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              {stats && (
                <>
                  <Line
                    type="monotone"
                    dataKey={() => stats.mean}
                    name="Mean"
                    stroke="#16a34a"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={() => stats.ucl}
                    name="UCL (3σ)"
                    stroke="#dc2626"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={() => stats.lcl}
                    name="LCL (3σ)"
                    stroke="#dc2626"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
