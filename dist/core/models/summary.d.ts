/**
 * Summary record and schema types for semiconductor inspection data.
 *
 * Summary records aggregate per-test statistics such as defect density,
 * area inspected, and other vendor-specific metrics. SummaryColumnSchema
 * describes the columns present in the source file's summary section.
 */
export interface SummaryColumnSchema {
    /** Column header name as it appears in the source file. */
    name: string;
    /** Data type of the column values. */
    type: 'int32' | 'float' | 'string' | 'unknown';
    /** Zero-based column index in the source file. */
    index: number;
}
export interface SummaryRecord {
    /** Test number this summary row corresponds to. */
    testNumber: number;
    /** Area inspected for this test, in square micrometers. */
    areaPerTest?: number;
    /** All summary values keyed by column name. */
    values: Record<string, number | string>;
}
