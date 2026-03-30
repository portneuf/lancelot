/**
 * Equipment and inspection setup types for semiconductor inspection.
 *
 * StationId identifies the physical inspection tool, while InspectionSetup
 * captures the recipe and configuration used for the inspection run.
 */
export interface StationId {
    /** Equipment vendor name (e.g. "KLA", "Applied Materials"). */
    vendor: string;
    /** Equipment model designation. */
    model: string;
    /** Unique equipment identifier in the fab. */
    equipmentId: string;
}
export interface InspectionSetup {
    /** Identifies the inspection station that produced the data. */
    stationId: StationId;
    /** Recipe name or identifier used for the inspection. */
    recipeId?: string;
    /** Recipe version string. */
    recipeVersion?: string;
    /** Setup or job identifier. */
    setupId?: string;
}
