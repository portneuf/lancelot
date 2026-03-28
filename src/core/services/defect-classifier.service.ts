/**
 * Rule-based automatic defect classification service.
 *
 * Applies a configurable set of classification rules to defect records,
 * suggesting class labels based on geometric and spatial properties.
 * Rules are evaluated in priority order (highest first); the first
 * matching rule wins for each defect.
 */

import type { DefectRecord } from '@/core/models/defect';

export interface ClassificationRule {
  /** Human-readable rule name. */
  name: string;
  /** Short description of what this rule detects. */
  description: string;
  /** Predicate that determines whether a defect matches this rule. */
  condition: (defect: DefectRecord) => boolean;
  /** Class name to suggest when the rule matches. */
  suggestedClass: string;
  /** Evaluation priority — higher values are checked first. */
  priority: number;
}

export interface ClassificationResult {
  /** Unique defect identifier. */
  defectId: number;
  /** Current numeric class from the inspection tool, if any. */
  currentClass: number | undefined;
  /** Suggested class name from the matching rule. */
  suggestedClass: string;
  /** Name of the rule that triggered this classification. */
  ruleName: string;
  /** Confidence score between 0 and 1. */
  confidence: number;
}

/**
 * Compute the Euclidean distance from a defect's absolute position to a
 * reference center point.
 */
function distanceFromCenter(
  defect: DefectRecord,
  center: [number, number],
): number {
  const dx = defect.xAbs - center[0];
  const dy = defect.yAbs - center[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build the set of default classification rules.
 *
 * Rules that depend on wafer geometry (edge / center distance) are
 * parameterised via closures so they capture the correct radius.
 */
function buildDefaultRules(
  waferRadius: number,
  sampleCenter: [number, number],
): ClassificationRule[] {
  return [
    {
      name: 'Large Particle',
      description: 'Defect size exceeds 200 um',
      condition: (d) => (d.size ?? 0) > 200,
      suggestedClass: 'Particle',
      priority: 100,
    },
    {
      name: 'Edge Defect',
      description: 'Defect is located beyond 80% of wafer radius from center',
      condition: (d) => distanceFromCenter(d, sampleCenter) > waferRadius * 0.8,
      suggestedClass: 'Edge Defect',
      priority: 90,
    },
    {
      name: 'Cluster Member',
      description: 'Defect has an assigned cluster number',
      condition: (d) => d.clusterNumber != null && d.clusterNumber > 0,
      suggestedClass: 'Cluster Defect',
      priority: 80,
    },
    {
      name: 'Scratch Candidate',
      description: 'Aspect ratio (XSIZE/YSIZE) exceeds 3:1 or is below 1:3',
      condition: (d) => {
        const xSize = Number(d.extra['XSIZE'] ?? d.extra['xSize'] ?? 0);
        const ySize = Number(d.extra['YSIZE'] ?? d.extra['ySize'] ?? 0);
        if (xSize <= 0 || ySize <= 0) return false;
        const ratio = xSize / ySize;
        return ratio > 3 || ratio < 0.33;
      },
      suggestedClass: 'Scratch',
      priority: 70,
    },
    {
      name: 'Micro Defect',
      description: 'Defect size is below 10 um',
      condition: (d) => d.size != null && d.size > 0 && d.size < 10,
      suggestedClass: 'Micro-scratch',
      priority: 60,
    },
    {
      name: 'Central Defect',
      description: 'Defect is located within 20% of wafer radius from center',
      condition: (d) => distanceFromCenter(d, sampleCenter) < waferRadius * 0.2,
      suggestedClass: 'Pattern Defect',
      priority: 50,
    },
  ];
}

/** Confidence lookup keyed by rule name. */
const CONFIDENCE_MAP: Record<string, number> = {
  'Large Particle': 0.8,
  'Micro Defect': 0.6,
  'Edge Defect': 0.7,
  'Cluster Member': 0.7,
  'Scratch Candidate': 0.6,
  'Central Defect': 0.5,
};

/**
 * Default set of built-in classification rules.
 *
 * These are constructed with a nominal 300 mm wafer (150 000 um radius)
 * centred at the origin. Call `classifyDefects` with actual geometry for
 * accurate spatial rules.
 */
export const DEFAULT_RULES: ClassificationRule[] = buildDefaultRules(150_000, [0, 0]);

/**
 * Classify an array of defects using the provided (or default) rules.
 *
 * Each defect is tested against rules sorted by descending priority.
 * The first matching rule produces a `ClassificationResult` for that defect.
 * Defects that match no rule are omitted from the result array.
 *
 * @param defects        Array of defect records to classify.
 * @param waferDiameter  Wafer diameter in micrometers.
 * @param sampleCenter   [x, y] centre of the wafer in micrometers.
 * @param rules          Optional custom rule set; defaults to built-in rules
 *                       parameterised with the supplied geometry.
 * @returns              Array of classification results, one per matched defect.
 */
export function classifyDefects(
  defects: DefectRecord[],
  waferDiameter: number,
  sampleCenter: [number, number],
  rules?: ClassificationRule[],
): ClassificationResult[] {
  const waferRadius = waferDiameter / 2;
  const activeRules = rules ?? buildDefaultRules(waferRadius, sampleCenter);

  // Sort rules by descending priority so highest-priority matches first.
  const sorted = [...activeRules].sort((a, b) => b.priority - a.priority);

  const results: ClassificationResult[] = [];

  for (const defect of defects) {
    for (const rule of sorted) {
      if (rule.condition(defect)) {
        results.push({
          defectId: defect.defectId,
          currentClass: defect.classNumber,
          suggestedClass: rule.suggestedClass,
          ruleName: rule.name,
          confidence: CONFIDENCE_MAP[rule.name] ?? 0.5,
        });
        break; // first matching rule wins
      }
    }
  }

  return results;
}
