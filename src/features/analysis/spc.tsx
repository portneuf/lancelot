/**
 * SPC (Statistical Process Control) Chart page.
 *
 * Displays control charts with center line (CL), upper/lower control limits
 * (UCL/LCL at +/-3 sigma), and warning limits (+/-2 sigma). Points that
 * exceed control limits are highlighted in red as out-of-control.
 *
 * Metrics:
 * - Defects/Die: defect count per die (single file)
 * - Defect Density: defect density per die (defects / die area in cm^2)
 * - Size Mean: mean defect size per die
 *
 * When multiple files are loaded, shows defect count trend across wafers.
 */

import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { useActiveFile } from '@/hooks/useActiveFile';
import { useFilteredDefects } from '@/hooks/useFilteredDefects';
import type { DefectRecord } from '@/core/models/defect';
import type { InspectionFile } from '@/core/models/inspection-file';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SpcMetric = 'defectsPerDie' | 'defectDensity' | 'sizeMean';

interface SpcDataPoint {
  label: string;
  value: number;
  ooc: boolean;
}

interface SpcStats {
  mean: number;
  sigma: number;
  ucl: number;
  lcl: number;
  uwl: number;
  lwl: number;
}

const METRIC_LABELS: Record<SpcMetric, string> = {
  defectsPerDie: 'Defects / Die',
  defectDensity: 'Defect Density (defects/cm\u00B2)',
  sizeMean: 'Size Mean (\u00B5m)',
};

// ---------------------------------------------------------------------------
// Data computation helpers
// ---------------------------------------------------------------------------

function computeStats(values: number[]): SpcStats {
  if (values.length === 0) {
    return { mean: 0, sigma: 0, ucl: 0, lcl: 0, uwl: 0, lwl: 0 };
  }

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const sigma = Math.sqrt(variance);

  return {
    mean,
    sigma,
    ucl: mean + 3 * sigma,
    lcl: Math.max(0, mean - 3 * sigma),
    uwl: mean + 2 * sigma,
    lwl: Math.max(0, mean - 2 * sigma),
  };
}

function buildSingleFileData(
  file: InspectionFile,
  defects: DefectRecord[],
  metric: SpcMetric,
): SpcDataPoint[] {
  // Group defects by die
  const dieMap = new Map<string, DefectRecord[]>();
  for (const d of defects) {
    const key = `(${d.xIndex},${d.yIndex})`;
    const arr = dieMap.get(key);
    if (arr) {
      arr.push(d);
    } else {
      dieMap.set(key, [d]);
    }
  }

  // Also include dies with 0 defects from the die map
  for (const die of file.dieMap) {
    if (die.status === 'untested' || die.status === 'skipped') continue;
    const key = `(${die.xIndex},${die.yIndex})`;
    if (!dieMap.has(key)) {
      dieMap.set(key, []);
    }
  }

  // Compute die area in cm^2 for density calculation
  const [pitchX, pitchY] = file.waferGeometry.diePitch;
  const dieAreaCm2 = (pitchX * pitchY) / 1e8; // um^2 -> cm^2

  // Sort dies by (xIndex, yIndex) for consistent ordering
  const sortedKeys = [...dieMap.keys()].sort((a, b) => {
    const parseKey = (k: string) => {
      const match = k.match(/\((-?\d+),(-?\d+)\)/);
      return match ? [Number(match[1]), Number(match[2])] : [0, 0];
    };
    const [ax, ay] = parseKey(a);
    const [bx, by] = parseKey(b);
    return ax !== bx ? ax - bx : ay - by;
  });

  const rawValues: { label: string; value: number }[] = [];

  for (const key of sortedKeys) {
    const dieDefects = dieMap.get(key)!;
    let value: number;

    switch (metric) {
      case 'defectsPerDie':
        value = dieDefects.length;
        break;
      case 'defectDensity':
        value = dieAreaCm2 > 0 ? dieDefects.length / dieAreaCm2 : 0;
        break;
      case 'sizeMean': {
        const sizes = dieDefects
          .map((d) => d.size)
          .filter((s): s is number => s != null && s > 0);
        value = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
        break;
      }
    }

    rawValues.push({ label: key, value });
  }

  // Compute stats
  const values = rawValues.map((d) => d.value);
  const stats = computeStats(values);

  return rawValues.map((d) => ({
    label: d.label,
    value: d.value,
    ooc: d.value > stats.ucl || d.value < stats.lcl,
  }));
}

function buildMultiFileData(
  files: Map<string, InspectionFile>,
): SpcDataPoint[] {
  const entries: { label: string; value: number; timestamp: string }[] = [];

  for (const [, file] of files) {
    const waferLabel =
      file.identity.waferId ?? file.source.fileName.replace(/\.[^.]+$/, '');
    entries.push({
      label: waferLabel,
      value: file.defects.length,
      timestamp: file.source.parseTimestamp,
    });
  }

  // Sort by parse timestamp
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const values = entries.map((e) => e.value);
  const stats = computeStats(values);

  return entries.map((e) => ({
    label: e.label,
    value: e.value,
    ooc: e.value > stats.ucl || e.value < stats.lcl,
  }));
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface SpcTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: SpcDataPoint;
  }>;
  metricLabel: string;
}

function SpcTooltip({ active, payload, metricLabel }: SpcTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{data.label}</p>
      <p>
        {metricLabel}: {data.value.toFixed(2)}
      </p>
      {data.ooc && (
        <p className="font-medium text-destructive">Out of control</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom dot renderer for out-of-control highlighting
// ---------------------------------------------------------------------------

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: SpcDataPoint;
}

function ControlDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null || !payload) return null;

  if (payload.ooc) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill="#2563eb"
      stroke="#ffffff"
      strokeWidth={1}
    />
  );
}

// ---------------------------------------------------------------------------
// Metric selector
// ---------------------------------------------------------------------------

function MetricSelector({
  value,
  onChange,
}: {
  value: SpcMetric;
  onChange: (v: SpcMetric) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SpcMetric)}
      className={cn(
        'rounded-md border border-border bg-card px-3 py-1.5 text-sm',
        'text-foreground outline-none',
        'focus:ring-2 focus:ring-ring',
      )}
    >
      <option value="defectsPerDie">Defects / Die</option>
      <option value="defectDensity">Defect Density</option>
      <option value="sizeMean">Size Mean</option>
    </select>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export default function SpcPage() {
  const { fileId: activeFileId } = useActiveFile();
  const files = useFileStore((s) => s.files);
  const { file, filteredDefects } = useFilteredDefects();

  const [metric, setMetric] = useState<SpcMetric>('defectsPerDie');

  const isMultiFile = files.size > 1;

  const chartData = useMemo(() => {
    if (isMultiFile) {
      return buildMultiFileData(files);
    }
    if (file) {
      return buildSingleFileData(file, filteredDefects, metric);
    }
    return [];
  }, [file, filteredDefects, files, isMultiFile, metric]);

  const stats = useMemo(() => {
    const values = chartData.map((d) => d.value);
    return computeStats(values);
  }, [chartData]);

  const oocCount = useMemo(
    () => chartData.filter((d) => d.ooc).length,
    [chartData],
  );

  const currentMetricLabel = isMultiFile
    ? 'Defect Count / Wafer'
    : METRIC_LABELS[metric];

  if (!activeFileId || !file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Activity}
          title="No Data"
          description="Open a file to view SPC control charts"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">
            SPC Control Chart
            {isMultiFile ? ' (Multi-Wafer Trend)' : ''}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {!isMultiFile && (
            <MetricSelector value={metric} onChange={setMetric} />
          )}
          <span className="text-xs text-muted-foreground">
            {chartData.length} data points
            {oocCount > 0 && (
              <span className="ml-2 font-medium text-destructive">
                {oocCount} OOC
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Stats summary cards */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-4 py-2">
        <StatBadge label="CL (Mean)" value={stats.mean} />
        <StatBadge label="UCL (+3\u03C3)" value={stats.ucl} color="text-destructive" />
        <StatBadge label="LCL (-3\u03C3)" value={stats.lcl} color="text-destructive" />
        <StatBadge label="UWL (+2\u03C3)" value={stats.uwl} color="text-yellow-600 dark:text-yellow-400" />
        <StatBadge label="LWL (-2\u03C3)" value={stats.lwl} color="text-yellow-600 dark:text-yellow-400" />
        <StatBadge label="\u03C3" value={stats.sigma} />
      </div>

      {/* Chart */}
      <div className="flex-1 p-4">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={Activity}
              title="No Data Points"
              description="Not enough data to build a control chart"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 40, bottom: 60, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={chartData.length > 50 ? Math.floor(chartData.length / 25) : 0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: currentMetricLabel,
                  angle: -90,
                  position: 'insideLeft',
                  offset: -5,
                  style: { fontSize: 11 },
                }}
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.8)),
                  (dataMax: number) => Math.ceil(Math.max(dataMax, stats.ucl) * 1.1),
                ]}
              />
              <Tooltip
                content={<SpcTooltip metricLabel={currentMetricLabel} />}
              />

              {/* Upper Control Limit (UCL) - solid red */}
              <ReferenceLine
                y={stats.ucl}
                stroke="#ef4444"
                strokeWidth={1.5}
                label={{
                  value: `UCL ${numberFormatter.format(stats.ucl)}`,
                  position: 'right',
                  style: { fontSize: 10, fill: '#ef4444' },
                }}
              />

              {/* Lower Control Limit (LCL) - solid red */}
              <ReferenceLine
                y={stats.lcl}
                stroke="#ef4444"
                strokeWidth={1.5}
                label={{
                  value: `LCL ${numberFormatter.format(stats.lcl)}`,
                  position: 'right',
                  style: { fontSize: 10, fill: '#ef4444' },
                }}
              />

              {/* Upper Warning Limit (UWL) - dashed yellow */}
              <ReferenceLine
                y={stats.uwl}
                stroke="#ca8a04"
                strokeWidth={1}
                strokeDasharray="6 3"
                label={{
                  value: `UWL ${numberFormatter.format(stats.uwl)}`,
                  position: 'right',
                  style: { fontSize: 10, fill: '#ca8a04' },
                }}
              />

              {/* Lower Warning Limit (LWL) - dashed yellow */}
              <ReferenceLine
                y={stats.lwl}
                stroke="#ca8a04"
                strokeWidth={1}
                strokeDasharray="6 3"
                label={{
                  value: `LWL ${numberFormatter.format(stats.lwl)}`,
                  position: 'right',
                  style: { fontSize: 10, fill: '#ca8a04' },
                }}
              />

              {/* Center Line (CL) - solid green */}
              <ReferenceLine
                y={stats.mean}
                stroke="#16a34a"
                strokeWidth={2}
                label={{
                  value: `CL ${numberFormatter.format(stats.mean)}`,
                  position: 'right',
                  style: { fontSize: 10, fill: '#16a34a', fontWeight: 600 },
                }}
              />

              {/* Data line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={1.5}
                dot={<ControlDot />}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat badge sub-component
// ---------------------------------------------------------------------------

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-xs font-semibold tabular-nums', color)}>
        {numberFormatter.format(value)}
      </span>
    </div>
  );
}
