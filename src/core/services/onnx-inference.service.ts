/**
 * ONNX Runtime Web wrapper for wafer map classification.
 *
 * Loads and runs XGBoost ONNX models for WM-811K pattern classification.
 * Uses WASM execution provider (no GPU required).
 */

import * as ort from 'onnxruntime-web';
import { extractFeatures, featuresToArray, FEATURE_DIM } from './wafer-feature-extractor';
import type { DefectRecord } from '@/core/models/defect';
import type { WaferFeatures } from './wafer-feature-extractor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** WM-811K defect pattern categories. */
export const WM811K_CLASSES = [
  'center', 'donut', 'edge-loc', 'edge-ring',
  'loc', 'near-full', 'random', 'scratch', 'none',
] as const;

export type Wm811kClass = (typeof WM811K_CLASSES)[number];

export interface ClassificationResult {
  /** Predicted pattern class. */
  predictedClass: Wm811kClass;
  /** Confidence score [0, 1]. */
  confidence: number;
  /** Scores for all 9 classes, sorted descending. */
  scores: Array<{ className: Wm811kClass; score: number }>;
  /** Feature vector used for classification. */
  features: WaferFeatures;
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export class WaferClassifier {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;

  constructor(modelPath: string = '/models/wm811k-xgboost-v1.onnx') {
    this.modelPath = modelPath;
  }

  async loadModel(): Promise<void> {
    if (this.session) return;
    this.session = await ort.InferenceSession.create(this.modelPath, {
      executionProviders: ['wasm'],
    });
  }

  isLoaded(): boolean {
    return this.session !== null;
  }

  /**
   * Classify a wafer's defect pattern.
   *
   * @param defects - All defect records for the wafer.
   * @param waferCenter - Wafer center in micrometers.
   * @param waferRadius - Wafer radius in micrometers.
   */
  async classify(
    defects: readonly DefectRecord[],
    waferCenter: [number, number],
    waferRadius: number,
  ): Promise<ClassificationResult> {
    const features = extractFeatures(defects, waferCenter, waferRadius);

    if (!this.session) {
      // Fallback: heuristic classification when model not loaded
      return heuristicClassify(features);
    }

    const input = new ort.Tensor('float32', featuresToArray(features), [1, FEATURE_DIM]);
    const results = await this.session.run({ input });

    // The output tensor contains class probabilities
    const outputKey = Object.keys(results)[0];
    const scores = results[outputKey].data as Float32Array;

    return interpretScores(scores, features);
  }

  async dispose(): Promise<void> {
    if (this.session) {
      // onnxruntime-web session doesn't have explicit dispose in all versions
      this.session = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Score interpretation
// ---------------------------------------------------------------------------

function interpretScores(scores: Float32Array, features: WaferFeatures): ClassificationResult {
  const classScores = WM811K_CLASSES.map((className, i) => ({
    className,
    score: i < scores.length ? scores[i] : 0,
  }));

  classScores.sort((a, b) => b.score - a.score);

  return {
    predictedClass: classScores[0].className,
    confidence: classScores[0].score,
    scores: classScores,
    features,
  };
}

// ---------------------------------------------------------------------------
// Heuristic fallback (no ONNX model)
// ---------------------------------------------------------------------------

function heuristicClassify(features: WaferFeatures): ClassificationResult {
  const scores = new Map<Wm811kClass, number>();

  // Edge ratio → edge-ring
  if (features.edgeRatio > 0.5) {
    scores.set('edge-ring', 0.6 + features.edgeRatio * 0.3);
  }

  // Centroid near center + high concentration → center
  const centroidDist = Math.sqrt(features.centroidX ** 2 + features.centroidY ** 2);
  if (centroidDist < 0.2 && features.spread < 0.4) {
    scores.set('center', 0.5 + (0.2 - centroidDist) * 2);
  }

  // Donut: edge ratio moderate + center empty
  if (features.edgeRatio > 0.3 && features.radialDistribution[0] < 0.05) {
    scores.set('donut', 0.4 + features.edgeRatio * 0.3);
  }

  // Scratch: low cluster count, high eccentricity
  if (features.eccentricity > 3 && features.clusterCount <= 2) {
    scores.set('scratch', 0.5 + Math.min(0.4, features.eccentricity / 10));
  }

  // Localized: few clusters, small spread
  if (features.clusterCount >= 1 && features.clusterCount <= 3 && features.spread < 0.3) {
    scores.set('loc', 0.4 + (0.3 - features.spread));
  }

  // Near-full: high entropy, even distribution
  if (features.entropy > 3.5 && features.spread > 0.5) {
    scores.set('near-full', 0.3 + features.entropy / 10);
  }

  // Random: high entropy, even distribution
  if (features.entropy > 4.0) {
    scores.set('random', features.entropy / 5);
  }

  // Edge-loc: localized at edge
  if (features.edgeRatio > 0.4 && features.clusterCount <= 3) {
    scores.set('edge-loc', 0.3 + features.edgeRatio * 0.4);
  }

  // Default: none
  if (scores.size === 0) {
    scores.set('none', 0.8);
  }

  // Fill missing classes with 0
  for (const c of WM811K_CLASSES) {
    if (!scores.has(c)) scores.set(c, 0);
  }

  // Normalize
  const total = [...scores.values()].reduce((s, v) => s + v, 0);
  const classScores = WM811K_CLASSES.map((className) => ({
    className,
    score: total > 0 ? (scores.get(className) ?? 0) / total : 0,
  }));
  classScores.sort((a, b) => b.score - a.score);

  return {
    predictedClass: classScores[0].className,
    confidence: classScores[0].score,
    scores: classScores,
    features,
  };
}
