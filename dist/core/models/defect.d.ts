/**
 * Defect record and schema types for semiconductor inspection data.
 *
 * A DefectRecord represents a single detected defect on the wafer surface.
 * DefectColumnSchema describes the columns present in the source file's
 * defect data section, allowing generic parsers to map vendor-specific
 * column names to the canonical DefectRecord fields.
 */
export interface DefectColumnSchema {
    /** Column header name as it appears in the source file. */
    name: string;
    /** Data type of the column values. */
    type: 'int32' | 'float' | 'string' | 'unknown';
    /** Optional physical unit (e.g. "um", "nm", "count"). */
    unit?: string;
    /** Zero-based column index in the source file. */
    index: number;
}
export interface DefectImage {
    /** Unique identifier for this image within the defect. */
    imageId: string;
    /** Image type description (e.g. "optical", "SEM", "darkfield"). */
    imageType: string;
    /** Pixel width of the image. */
    width: number;
    /** Pixel height of the image. */
    height: number;
    /** Raw image data as a binary blob, if loaded. */
    data?: ArrayBuffer;
    /** MIME type of the image data (e.g. "image/tiff", "image/bmp"). */
    mimeType?: string;
}
export interface DefectRecord {
    /** Unique defect identifier within the inspection file. */
    defectId: number;
    /** X coordinate relative to die origin, in micrometers. */
    xRel: number;
    /** Y coordinate relative to die origin, in micrometers. */
    yRel: number;
    /** Die X index on the wafer map. */
    xIndex: number;
    /** Die Y index on the wafer map. */
    yIndex: number;
    /** Defect size in micrometers. */
    size?: number;
    /** Classification number assigned by the inspection tool or classifier. */
    classNumber?: number;
    /** Cluster identifier, grouping spatially proximate defects. */
    clusterNumber?: number;
    /** Test number that detected this defect. */
    test?: number;
    /** Number of images captured for this defect. */
    imageCount?: number;
    /** Vendor-specific or non-standard columns keyed by column name. */
    extra: Record<string, number | string>;
    /** Absolute X coordinate on the wafer, in micrometers. */
    xAbs: number;
    /** Absolute Y coordinate on the wafer, in micrometers. */
    yAbs: number;
}
