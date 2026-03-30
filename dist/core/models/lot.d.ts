/**
 * Lot and wafer identification types for semiconductor inspection.
 *
 * InspectionIdentity captures the traceability information that ties an
 * inspection file back to a specific lot, wafer, process step, and device.
 */
export interface InspectionIdentity {
    /** Manufacturing lot identifier. */
    lotId: string;
    /** Wafer identifier within the lot. */
    waferId: string;
    /** Cassette slot number, if applicable. */
    slot?: number;
    /** Device or product identifier. */
    deviceId: string;
    /** Process step identifier (e.g. "ETCH1", "LITHO2"). */
    stepId?: string;
    /** Timestamp of the source file creation (ISO 8601). */
    fileTimestamp?: string;
    /** Timestamp of the inspection result (ISO 8601). */
    resultTimestamp?: string;
}
