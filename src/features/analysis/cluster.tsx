/**
 * Cluster Analysis page — runs DBSCAN on filtered defects and visualises
 * the resulting clusters as a colour-coded scatter plot.
 */

import { useMemo, useState } from 'react';
import { GitBranch } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFileStore, useInspectionStore } from '@/stores';
import { dbscan } from '@/core/services/cluster-detection.service';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/cn';
import type { ClusterResult } from '@/core/services/cluster-detection.service';

// Distinct colours for up to 16 clusters; wraps for more.
const CLUSTER_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#e11d48', '#65a30d', '#6d28d9', '#059669',
  '#d97706', '#4f46e5', '#be123c', '#0d9488', '#c026d3',
  '#ea580c',
];
const NOISE_COLOR = '#94a3b8'; // slate-400

interface ClusterPoint {
  x: number;
  y: number;
  defectId: number;
  cluster: number;
}

interface ClusterSummary {
  id: number;
  size: number;
  centroidX: number;
  centroidY: number;
}

function buildSummaries(
  result: ClusterResult,
  points: ClusterPoint[],
): ClusterSummary[] {
  const summaries: ClusterSummary[] = [];
  for (const [id, indices] of result.clusters) {
    let sumX = 0;
    let sumY = 0;
    for (const idx of indices) {
      sumX += points[idx].x;
      sumY += points[idx].y;
    }
    summaries.push({
      id,
      size: indices.length,
      centroidX: Math.round((sumX / indices.length) * 100) / 100,
      centroidY: Math.round((sumY / indices.length) * 100) / 100,
    });
  }
  summaries.sort((a, b) => b.size - a.size);
  return summaries;
}

export default function ClusterPage() {
  const [epsilon, setEpsilon] = useState(5000);
  const [minPoints, setMinPoints] = useState(3);

  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : undefined;
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);

  const activeDefects = useMemo(() => {
    if (!file) return [];
    return filteredDefectIds
      ? file.defects.filter((d) => filteredDefectIds.has(d.defectId))
      : file.defects;
  }, [file, filteredDefectIds]);

  const result = useMemo<ClusterResult | null>(() => {
    if (activeDefects.length === 0) return null;
    return dbscan(activeDefects, epsilon, minPoints);
  }, [activeDefects, epsilon, minPoints]);

  const points = useMemo<ClusterPoint[]>(() => {
    return activeDefects.map((d, i) => ({
      x: d.xAbs,
      y: d.yAbs,
      defectId: d.defectId,
      cluster: result ? result.labels[i] : -1,
    }));
  }, [activeDefects, result]);

  const noiseCount = useMemo(() => {
    if (!result) return 0;
    return result.labels.filter((l) => l === -1).length;
  }, [result]);

  const largestCluster = useMemo(() => {
    if (!result || result.clusters.size === 0) return 0;
    let max = 0;
    for (const indices of result.clusters.values()) {
      if (indices.length > max) max = indices.length;
    }
    return max;
  }, [result]);

  const summaries = useMemo(() => {
    if (!result) return [];
    return buildSummaries(result, points);
  }, [result, points]);

  // Build series data: one series per cluster + noise
  const seriesMap = useMemo(() => {
    const map = new Map<string, ClusterPoint[]>();
    for (const p of points) {
      const key = p.cluster === -1 ? 'Noise' : `Cluster ${p.cluster}`;
      const arr = map.get(key);
      if (arr) arr.push(p);
      else map.set(key, [p]);
    }
    return map;
  }, [points]);

  const seriesNames = useMemo(() => Array.from(seriesMap.keys()), [seriesMap]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={GitBranch}
          title="No Data"
          description="Open a file to run cluster analysis"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">DBSCAN Cluster Analysis</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{activeDefects.length.toLocaleString()} defects</span>
          {result && (
            <>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 font-medium',
                  'bg-primary/10 text-primary',
                )}
              >
                {result.clusterCount} clusters
              </span>
              <span>{noiseCount.toLocaleString()} noise</span>
              <span>Largest: {largestCluster}</span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Epsilon (um):</span>
          <input
            type="range"
            min={1000}
            max={20000}
            step={500}
            value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))}
            className="w-40"
          />
          <span className="w-16 text-right font-mono text-xs">
            {epsilon.toLocaleString()}
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Min Points:</span>
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={minPoints}
            onChange={(e) => setMinPoints(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-8 text-right font-mono text-xs">{minPoints}</span>
        </label>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Chart */}
        <div className="min-w-0 flex-1">
          {activeDefects.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={GitBranch}
                title="No Defects"
                description="No defects match the current filters"
              />
            </div>
          ) : (
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
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload as ClusterPoint;
                    return (
                      <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                        <p className="font-medium">
                          Defect #{data.defectId}
                        </p>
                        <p className="text-muted-foreground">
                          X: {data.x.toFixed(1)} um, Y: {data.y.toFixed(1)} um
                        </p>
                        <p className="text-muted-foreground">
                          {data.cluster === -1
                            ? 'Noise'
                            : `Cluster ${data.cluster}`}
                        </p>
                      </div>
                    );
                  }}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Legend verticalAlign="top" height={36} />
                {seriesNames.map((name) => {
                  const isNoise = name === 'Noise';
                  const clusterIdx = isNoise
                    ? -1
                    : Number(name.replace('Cluster ', ''));
                  const color = isNoise
                    ? NOISE_COLOR
                    : CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
                  return (
                    <Scatter
                      key={name}
                      name={name}
                      data={seriesMap.get(name) ?? []}
                      fill={color}
                      opacity={isNoise ? 0.35 : 0.8}
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cluster table */}
        {summaries.length > 0 && (
          <div className="w-72 shrink-0 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Cluster</th>
                  <th className="px-3 py-2 text-right font-medium">Size</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Centroid X
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Centroid Y
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-border hover:bg-muted/50"
                  >
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              CLUSTER_COLORS[s.id % CLUSTER_COLORS.length],
                          }}
                        />
                        {s.id}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">{s.size}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {s.centroidX.toFixed(0)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {s.centroidY.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
