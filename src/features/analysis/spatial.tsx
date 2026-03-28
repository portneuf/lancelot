import { useMemo } from 'react';
import { ScatterChart as ScatterChartIcon } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DefectRecord } from '@/core/models/defect';
import type { ClassLookupEntry } from '@/core/models/inspection-file';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore, useInspectionStore } from '@/stores';
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

const DOWNSAMPLE_THRESHOLD = 10000;
const GRID_RESOLUTION = 100;

interface BucketPoint {
  x: number;
  y: number;
  count: number;
  size: number;
  className: string;
}

interface ScatterPoint {
  x: number;
  y: number;
  defectId: number;
  className: string;
  size: number;
}

function buildClassMap(
  classLookup: ClassLookupEntry[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const entry of classLookup) {
    map.set(entry.classNumber, entry.className);
  }
  return map;
}

function downsampleDefects(
  defects: DefectRecord[],
  classMap: Map<number, string>,
): Map<string, BucketPoint[]> {
  if (defects.length === 0) return new Map();

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const d of defects) {
    if (d.xAbs < xMin) xMin = d.xAbs;
    if (d.xAbs > xMax) xMax = d.xAbs;
    if (d.yAbs < yMin) yMin = d.yAbs;
    if (d.yAbs > yMax) yMax = d.yAbs;
  }

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const bucketWidth = xRange / GRID_RESOLUTION;
  const bucketHeight = yRange / GRID_RESOLUTION;

  // Key: "className|bx|by" -> { sumX, sumY, count, totalSize }
  const buckets = new Map<
    string,
    { sumX: number; sumY: number; count: number; totalSize: number; className: string }
  >();

  for (const d of defects) {
    const bx = Math.min(Math.floor((d.xAbs - xMin) / bucketWidth), GRID_RESOLUTION - 1);
    const by = Math.min(Math.floor((d.yAbs - yMin) / bucketHeight), GRID_RESOLUTION - 1);
    const clsName = classMap.get(d.classNumber ?? -1) ?? 'Unclassified';
    const key = `${clsName}|${bx}|${by}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.sumX += d.xAbs;
      existing.sumY += d.yAbs;
      existing.count += 1;
      existing.totalSize += d.size ?? 0;
    } else {
      buckets.set(key, {
        sumX: d.xAbs,
        sumY: d.yAbs,
        count: 1,
        totalSize: d.size ?? 0,
        className: clsName,
      });
    }
  }

  const seriesMap = new Map<string, BucketPoint[]>();
  for (const bucket of buckets.values()) {
    const point: BucketPoint = {
      x: Math.round((bucket.sumX / bucket.count) * 100) / 100,
      y: Math.round((bucket.sumY / bucket.count) * 100) / 100,
      count: bucket.count,
      size: Math.max(3, Math.min(20, 3 + Math.log2(bucket.count) * 3)),
      className: bucket.className,
    };
    const series = seriesMap.get(bucket.className);
    if (series) {
      series.push(point);
    } else {
      seriesMap.set(bucket.className, [point]);
    }
  }

  return seriesMap;
}

function groupDefectsByClass(
  defects: DefectRecord[],
  classMap: Map<number, string>,
): Map<string, ScatterPoint[]> {
  const seriesMap = new Map<string, ScatterPoint[]>();
  for (const d of defects) {
    const clsName = classMap.get(d.classNumber ?? -1) ?? 'Unclassified';
    const point: ScatterPoint = {
      x: d.xAbs,
      y: d.yAbs,
      defectId: d.defectId,
      className: clsName,
      size: d.size ?? 0,
    };
    const series = seriesMap.get(clsName);
    if (series) {
      series.push(point);
    } else {
      seriesMap.set(clsName, [point]);
    }
  }
  return seriesMap;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ScatterPoint | BucketPoint;
  }>;
  isDownsampled: boolean;
}

function CustomTooltip({ active, payload, isDownsampled }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      {isDownsampled ? (
        <>
          <p className="font-medium">{(data as BucketPoint).className}</p>
          <p className="text-muted-foreground">
            X: {data.x.toFixed(1)} um, Y: {data.y.toFixed(1)} um
          </p>
          <p className="text-muted-foreground">
            Count: {(data as BucketPoint).count}
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">Defect #{(data as ScatterPoint).defectId}</p>
          <p className="text-muted-foreground">
            X: {data.x.toFixed(1)} um, Y: {data.y.toFixed(1)} um
          </p>
          <p className="text-muted-foreground">
            Class: {(data as ScatterPoint).className}
          </p>
          <p className="text-muted-foreground">
            Size: {(data as ScatterPoint).size.toFixed(2)} um
          </p>
        </>
      )}
    </div>
  );
}

export default function SpatialPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : undefined;
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
  const { t } = useTranslation();

  const classMap = useMemo(() => {
    if (!file) return new Map<number, string>();
    return buildClassMap(file.classLookup);
  }, [file]);

  const activeDefects = useMemo(() => {
    if (!file) return [];
    return filteredDefectIds
      ? file.defects.filter((d) => filteredDefectIds.has(d.defectId))
      : file.defects;
  }, [file, filteredDefectIds]);

  const isDownsampled = useMemo(() => {
    return activeDefects.length > DOWNSAMPLE_THRESHOLD;
  }, [activeDefects]);

  const seriesData = useMemo(() => {
    if (!file) return new Map<string, (ScatterPoint | BucketPoint)[]>();
    if (isDownsampled) {
      return downsampleDefects(activeDefects, classMap);
    }

    if (file.classLookup.length === 0) {
      const allPoints: ScatterPoint[] = activeDefects.map((d) => ({
        x: d.xAbs,
        y: d.yAbs,
        defectId: d.defectId,
        className: 'All Defects',
        size: d.size ?? 0,
      }));
      const map = new Map<string, ScatterPoint[]>();
      map.set('All Defects', allPoints);
      return map;
    }

    return groupDefectsByClass(activeDefects, classMap);
  }, [file, activeDefects, classMap, isDownsampled]);

  const defectCount = activeDefects.length;
  const seriesNames = useMemo(() => Array.from(seriesData.keys()), [seriesData]);

  if (!activeFileId || !file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={ScatterChartIcon}
          title={t('common.noData')}
          description={t('spatial.openFileToView')}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScatterChartIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('spatial.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isDownsampled && (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Downsampled
            </span>
          )}
          <span
            className={cn(
              'rounded-md px-2.5 py-1 text-sm font-medium',
              'bg-muted text-muted-foreground',
            )}
          >
            {defectCount.toLocaleString()} defects
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="aspect-square w-full max-w-[800px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="x"
                name="X"
                label={{
                  value: 'X (um)',
                  position: 'insideBottom',
                  offset: -20,
                  style: { fill: 'currentColor' },
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Y"
                reversed
                label={{
                  value: 'Y (um)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -20,
                  style: { fill: 'currentColor' },
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={<CustomTooltip isDownsampled={isDownsampled} />}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend verticalAlign="top" height={36} />
              {seriesNames.map((name, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                const data = seriesData.get(name) ?? [];
                return (
                  <Scatter
                    key={name}
                    name={name}
                    data={data}
                    fill={color}
                    opacity={0.7}
                  >
                    {isDownsampled
                      ? data.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            r={(entry as BucketPoint).size}
                          />
                        ))
                      : undefined}
                  </Scatter>
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
