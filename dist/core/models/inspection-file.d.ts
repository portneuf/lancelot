/**
 * Top-level inspection file model that aggregates all parsed data.
 *
 * InspectionFile is the canonical in-memory representation produced by
 * any FileFormatAdapter. It unifies identity, geometry, defect, summary,
 * and metadata from vendor-specific file formats into a single structure.
 */
import type { InspectionIdentity } from './lot';
import type { WaferGeometry, DieMapEntry } from './wafer';
import type { InspectionSetup } from './equipment';
import type { DefectRecord, DefectColumnSchema } from './defect';
import type { SummaryRecord, SummaryColumnSchema } from './summary';
export interface ParseWarning {
    /** Machine-readable warning code (e.g. "MISSING_FIELD", "TRUNCATED_VALUE"). */
    code: string;
    /** Human-readable warning description. */
    message: string;
    /** Source file line number where the warning originated, if applicable. */
    line?: number;
    /** Severity is always 'warning' for non-fatal issues. */
    severity: 'warning';
}
export interface SourceInfo {
    /** Identifier of the file format (e.g. "klarf", "sinf"). */
    formatId: string;
    /** Version string of the detected file format. */
    formatVersion: string;
    /** Original file name. */
    fileName: string;
    /** File size in bytes. */
    fileSize: number;
    /** ISO 8601 timestamp of when the file was parsed. */
    parseTimestamp: string;
    /** Warnings generated during parsing. */
    warnings: ParseWarning[];
}
export interface ClassLookupEntry {
    /** Numeric class identifier used in DefectRecord.classNumber. */
    classNumber: number;
    /** Human-readable class name. */
    className: string;
    /** Optional short code for the class. */
    classCode?: string;
}
export interface TestPlanEntry {
    /** Die X index included in the test plan. */
    xIndex: number;
    /** Die Y index included in the test plan. */
    yIndex: number;
}
export interface InspectionFile {
    /** Metadata about the source file and parse operation. */
    source: SourceInfo;
    /** Lot, wafer, and device identification. */
    identity: InspectionIdentity;
    /** Physical wafer geometry and coordinate system. */
    waferGeometry: WaferGeometry;
    /** Equipment and recipe information. */
    inspectionSetup: InspectionSetup;
    /** All defect records parsed from the file. */
    defects: DefectRecord[];
    /** Schema describing the defect data columns. */
    defectSchema: DefectColumnSchema[];
    /** Die map with status and defect counts. */
    dieMap: DieMapEntry[];
    /** Mapping from class numbers to human-readable names. */
    classLookup: ClassLookupEntry[];
    /** Per-test summary statistics. */
    summaries: SummaryRecord[];
    /** Schema describing the summary data columns. */
    summarySchema: SummaryColumnSchema[];
    /** List of die coordinates included in the test plan. */
    testPlan: TestPlanEntry[];
}
