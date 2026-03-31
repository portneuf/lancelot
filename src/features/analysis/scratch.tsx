/**
 * Scratch Detection page — runs RANSAC-based linear pattern detection
 * on filtered defects and displays detected scratch lines.
 */

import { useMemo, useState } from 'react';
import { Slash } from 'lucide-react';
import { useInspectionStore } from '@/stores';
import { useActiveFile } from '@/hooks/useActiveFile';
import { detectScratches } from '@/core/services/scratch-detection.service';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/cn';
import type { ScratchLine } from '@/core/services/scratch-detection.service';

export default function ScratchPage() {
  const [distanceThreshold, setDistanceThreshold] = useState(2000);
  const [minInliers, setMinInliers] = useState(5);
  const [iterations, setIterations] = useState(200);

  const { file } = useActiveFile();
  const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);

  const activeDefects = useMemo(() => {
    if (!file) return [];
    return filteredDefectIds
      ? file.defects.filter((d) => filteredDefectIds.has(d.defectId))
      : file.defects;
  }, [file, filteredDefectIds]);

  const scratches = useMemo<ScratchLine[]>(() => {
    if (activeDefects.length < 2) return [];
    return detectScratches(
      activeDefects,
      minInliers,
      distanceThreshold,
      iterations,
    );
  }, [activeDefects, minInliers, distanceThreshold, iterations]);

  // Compute wafer extent for SVG viewBox
  const extent = useMemo(() => {
    if (activeDefects.length === 0)
      return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const d of activeDefects) {
      if (d.xAbs < xMin) xMin = d.xAbs;
      if (d.xAbs > xMax) xMax = d.xAbs;
      if (d.yAbs < yMin) yMin = d.yAbs;
      if (d.yAbs > yMax) yMax = d.yAbs;
    }
    const pad = Math.max((xMax - xMin) * 0.05, (yMax - yMin) * 0.05, 1000);
    return {
      xMin: xMin - pad,
      xMax: xMax + pad,
      yMin: yMin - pad,
      yMax: yMax + pad,
    };
  }, [activeDefects]);

  const totalInliers = useMemo(
    () => scratches.reduce((sum, s) => sum + s.inlierCount, 0),
    [scratches],
  );

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Slash}
          title="No Data"
          description="Open a file to run scratch detection"
        />
      </div>
    );
  }

  const svgWidth = extent.xMax - extent.xMin;
  const svgHeight = extent.yMax - extent.yMin;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <Slash className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">Scratch Detection (RANSAC)</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{activeDefects.length.toLocaleString()} defects</span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 font-medium',
              scratches.length > 0
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {scratches.length} scratches detected
          </span>
          {scratches.length > 0 && (
            <span>{totalInliers} inlier defects</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Distance (um):</span>
          <input
            type="range"
            min={500}
            max={10000}
            step={250}
            value={distanceThreshold}
            onChange={(e) => setDistanceThreshold(Number(e.target.value))}
            className="w-40"
          />
          <span className="w-16 text-right font-mono text-xs">
            {distanceThreshold.toLocaleString()}
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Min Inliers:</span>
          <input
            type="range"
            min={3}
            max={30}
            step={1}
            value={minInliers}
            onChange={(e) => setMinInliers(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-8 text-right font-mono text-xs">{minInliers}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Iterations:</span>
          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-12 text-right font-mono text-xs">{iterations}</span>
        </label>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Visualization */}
        <div className="min-w-0 flex-1">
          {activeDefects.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Slash}
                title="No Defects"
                description="No defects match the current filters"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                viewBox={`${extent.xMin} ${extent.yMin} ${svgWidth} ${svgHeight}`}
                className="h-full max-h-[700px] w-full max-w-[700px] rounded-md border border-border bg-background"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Defect dots */}
                {activeDefects.map((d) => (
                  <circle
                    key={d.defectId}
                    cx={d.xAbs}
                    cy={d.yAbs}
                    r={Math.max(svgWidth, svgHeight) * 0.004}
                    className="fill-muted-foreground/40"
                  />
                ))}
                {/* Scratch lines */}
                {scratches.map((s, i) => (
                  <line
                    key={i}
                    x1={s.startX}
                    y1={s.startY}
                    x2={s.endX}
                    y2={s.endY}
                    stroke="#dc2626"
                    strokeWidth={Math.max(svgWidth, svgHeight) * 0.004}
                    strokeLinecap="round"
                    opacity={0.8}
                  />
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Scratch table */}
        {scratches.length > 0 && (
          <div className="w-80 shrink-0 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">Inliers</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Angle
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Length (um)
                  </th>
                </tr>
              </thead>
              <tbody>
                {scratches.map((s, i) => (
                  <tr
                    key={i}
                    className="border-t border-border hover:bg-muted/50"
                  >
                    <td className="px-3 py-1.5">{i + 1}</td>
                    <td className="px-3 py-1.5 text-right">{s.inlierCount}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {s.angle.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {Math.round(s.length).toLocaleString()}
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
