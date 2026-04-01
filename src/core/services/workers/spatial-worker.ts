/**
 * Web Worker for compute-intensive spatial analysis algorithms.
 *
 * Runs Hough Transform, Annular Filter, Radial Detection, and
 * DBSCAN off the main thread to keep the UI responsive.
 */

import { detectHoughLines } from '../hough-transform.service';
import { detectAnnularSignatures } from '../annular-filter.service';
import { detectRadialSignatures } from '../radial-signature.service';
import type { DefectRecord } from '../../models/defect';
import type { HoughParams } from '../hough-transform.service';
import type { AnnularParams } from '../annular-filter.service';
import type { RadialParams } from '../radial-signature.service';

export interface SpatialWorkerRequest {
  type: 'analyze';
  defects: DefectRecord[];
  waferCenter: [number, number];
  waferRadius: number;
  enableHough: boolean;
  enableAnnular: boolean;
  enableRadial: boolean;
  houghParams?: Partial<HoughParams>;
  annularParams?: Partial<AnnularParams>;
  radialParams?: Partial<RadialParams>;
}

export interface SpatialWorkerResponse {
  type: 'result';
  houghLines?: import('../hough-transform.service').HoughLine[];
  annularRings?: import('../annular-filter.service').AnnularRing[];
  radialSignatures?: import('../radial-signature.service').RadialSignature[];
  durationMs: number;
}

self.onmessage = (event: MessageEvent<SpatialWorkerRequest>) => {
  const req = event.data;
  if (req.type !== 'analyze') return;

  const start = performance.now();
  const response: SpatialWorkerResponse = {
    type: 'result',
    durationMs: 0,
  };

  if (req.enableHough) {
    const result = detectHoughLines(
      req.defects, req.waferCenter, req.waferRadius, req.houghParams,
    );
    response.houghLines = result.lines;
  }

  if (req.enableAnnular) {
    const result = detectAnnularSignatures(
      req.defects, req.waferCenter, req.waferRadius, req.annularParams,
    );
    response.annularRings = result.rings;
  }

  if (req.enableRadial) {
    const result = detectRadialSignatures(
      req.defects, req.waferCenter, req.waferRadius, req.radialParams,
    );
    response.radialSignatures = result.signatures;
  }

  response.durationMs = performance.now() - start;
  self.postMessage(response);
};
