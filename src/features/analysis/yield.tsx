import { useMemo } from 'react';
import { TrendingUp, Hash, Layers, Target, Gauge } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { InspectionFile } from '@/core/models/inspection-file';
import type { DefectRecord } from '@/core/models/defect';
import { EmptyState } from '@/components/shared/EmptyState';
import { useInspectionStore } from '@/stores';
import { useActiveFile } from '@/hooks/useActiveFile';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/i18n/useTranslation';

const CHART_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#0891b2',
  '#e11d48',
  '#65a30d',
];

/* ---------- KPI Card ---------- */

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, subtitle, icon, color }: KpiCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
          color,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Data computation helpers ---------- */

function computeDefectDensity(file: InspectionFile): { density: number; unit: string } {
  const defectCount = file.defects.length;

  // Try to get area from summaries (areaPerTest is in um^2)
  let totalAreaUm2 = 0;
  for (const s of file.summaries) {
    if (s.areaPerTest != null && s.areaPerTest > 0) {
      totalAreaUm2 += s.areaPerTest;
    }
  }

  // If no summary area, estimate from wafer diameter
  if (totalAreaUm2 === 0) {
    const radiusUm = file.waferGeometry.waferDiameter / 2;
    totalAreaUm2 = Math.PI * radiusUm * radiusUm;
  }

  // Convert um^2 to cm^2: 1 cm = 10,000 um => 1 cm^2 = 1e8 um^2
  const totalAreaCm2 = totalAreaUm2 / 1e8;
  const density = totalAreaCm2 > 0 ? defectCount / totalAreaCm2 : 0;

  return { density, unit: 'defects/cm\u00B2' };
}

function computeDieYield(file: InspectionFile): {
  yieldPct: number;
  cleanDies: number;
  testedDies: number;
} {
  const testedDies = file.dieMap.filter((d) => d.status === 'tested');
  const cleanDies = testedDies.filter((d) => d.defectCount === 0);
  const yieldPct =
    testedDies.length > 0 ? (cleanDies.length / testedDies.length) * 100 : 0;
  return { yieldPct, cleanDies: cleanDies.length, testedDies: testedDies.length };
}

function computeClassCount(file: InspectionFile): number {
  if (file.classLookup.length > 0) return file.classLookup.length;
  const classSet = new Set<number>();
  for (const d of file.defects) {
    if (d.classNumber != null) classSet.add(d.classNumber);
  }
  return classSet.size;
}

/* ---------- Histogram helpers ---------- */

interface HistogramBin {
  label: string;
  count: number;
}

function buildSizeHistogram(defects: DefectRecord[], binCount: number): HistogramBin[] {
  const sizes = defects
    .map((d) => d.size)
    .filter((s): s is number => s != null && s > 0);

  if (sizes.length === 0) return [];

  let min = Infinity;
  let max = -Infinity;
  for (const s of sizes) {
    if (s < min) min = s;
    if (s > max) max = s;
  }

  if (min === max) {
    return [{ label: min.toFixed(2), count: sizes.length }];
  }

  const binWidth = (max - min) / binCount;
  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    bins.push({
      label: `${lo.toFixed(1)}-${hi.toFixed(1)}`,
      count: 0,
    });
  }

  for (const s of sizes) {
    let idx = Math.floor((s - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count++;
  }

  return bins;
}

interface DieDefectEntry {
  label: string;
  count: number;
}

function buildDefectsPerDie(file: InspectionFile, topN: number): DieDefectEntry[] {
  // Count defects per die from defect records
  const dieCounts = new Map<string, number>();
  for (const d of file.defects) {
    const key = `(${d.xIndex},${d.yIndex})`;
    dieCounts.set(key, (dieCounts.get(key) ?? 0) + 1);
  }

  const entries: DieDefectEntry[] = [];
  for (const [key, count] of dieCounts) {
    entries.push({ label: key, count });
  }

  entries.sort((a, b) => b.count - a.count);
  return entries.slice(0, topN);
}

/* ---------- Custom Tooltip ---------- */

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { label: string; count: number };
  }>;
  labelKey?: string;
}

function BarTooltip({ active, payload, labelKey = 'Range' }: BarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">
        {labelKey}: {data.payload.label}
      </p>
      <p className="text-muted-foreground">Count: {data.value.toLocaleString()}</p>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function YieldPage() {
  const { file } = useActiveFile();
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
  const { t } = useTranslation();

  const kpis = useMemo(() => {
    if (!file) {
      return {
        totalDefects: 0,
        density: 0,
        densityUnit: '',
        yieldPct: 0,
        cleanDies: 0,
        testedDies: 0,
        classCount: 0,
      };
    }

    const { density, unit: densityUnit } = computeDefectDensity(file);
    const { yieldPct, cleanDies, testedDies } = computeDieYield(file);
    const classCount = computeClassCount(file);

    const activeDefects = filteredDefectIds
      ? file.defects.filter((d) => filteredDefectIds.has(d.defectId))
      : file.defects;

    return {
      totalDefects: activeDefects.length,
      density,
      densityUnit,
      yieldPct,
      cleanDies,
      testedDies,
      classCount,
    };
  }, [file, filteredDefectIds]);

  const sizeHistogram = useMemo(() => {
    if (!file) return [];
    const defects = filteredDefectIds
      ? file.defects.filter((d) => filteredDefectIds.has(d.defectId))
      : file.defects;
    return buildSizeHistogram(defects, 10);
  }, [file, filteredDefectIds]);

  const defectsPerDie = useMemo(() => {
    if (!file) return [];
    return buildDefectsPerDie(file, 20);
  }, [file]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={TrendingUp}
          title={t('common.noData')}
          description={t('yield.openFileToView')}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t('yield.title')}</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('yield.totalDefects')}
          value={kpis.totalDefects.toLocaleString()}
          icon={<Hash className="h-5 w-5 text-white" />}
          color="bg-blue-600"
        />
        <KpiCard
          title={t('yield.defectDensity')}
          value={kpis.density.toFixed(1)}
          subtitle={kpis.densityUnit}
          icon={<Gauge className="h-5 w-5 text-white" />}
          color="bg-red-600"
        />
        <KpiCard
          title={t('yield.dieYield')}
          value={`${kpis.yieldPct.toFixed(1)}%`}
          subtitle={`${kpis.cleanDies} ${t('yield.clean')} / ${kpis.testedDies} ${t('yield.tested')}`}
          icon={<Target className="h-5 w-5 text-white" />}
          color="bg-green-600"
        />
        <KpiCard
          title={t('yield.defectClasses')}
          value={kpis.classCount}
          icon={<Layers className="h-5 w-5 text-white" />}
          color="bg-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Size Distribution Histogram */}
        <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t('yield.defectSizeDistribution')}</h2>
          {sizeHistogram.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sizeHistogram}
                  margin={{ top: 10, right: 20, bottom: 40, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    label={{
                      value: 'Size Range (um)',
                      position: 'insideBottom',
                      offset: -30,
                      style: { fill: 'currentColor', fontSize: 12 },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{
                      value: 'Count',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -5,
                      style: { fill: 'currentColor', fontSize: 12 },
                    }}
                  />
                  <Tooltip content={<BarTooltip labelKey="Size Range" />} />
                  <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center">
              <p className="text-sm text-muted-foreground">No size data available</p>
            </div>
          )}
        </div>

        {/* Defects per Die */}
        <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t('yield.defectsPerDie')}</h2>
          {defectsPerDie.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={defectsPerDie}
                  margin={{ top: 10, right: 20, bottom: 40, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    label={{
                      value: 'Die Index',
                      position: 'insideBottom',
                      offset: -30,
                      style: { fill: 'currentColor', fontSize: 12 },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{
                      value: 'Defect Count',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -5,
                      style: { fill: 'currentColor', fontSize: 12 },
                    }}
                  />
                  <Tooltip content={<BarTooltip labelKey="Die" />} />
                  <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center">
              <p className="text-sm text-muted-foreground">No die data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
