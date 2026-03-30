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
 * Default set of built-in classification rules.
 *
 * These are constructed with a nominal 300 mm wafer (150 000 um radius)
 * centred at the origin. Call `classifyDefects` with actual geometry for
 * accurate spatial rules.
 */
export declare const DEFAULT_RULES: ClassificationRule[];
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
export declare function classifyDefects(defects: DefectRecord[], waferDiameter: number, sampleCenter: [number, number], rules?: ClassificationRule[]): ClassificationResult[];
