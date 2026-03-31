/**
 * Stacking/Overlay View — aggregated heatmap of multiple wafers.
 *
 * Overlays defect data from selected wafers into a single heatmap.
 * Three aggregation modes:
 * - Density: defects per area
 * - Hit-Count: how many wafers have defects in this zone
 * - Class-Dominance: most frequent defect class per zone
 *
 * Supports cartesian grid (10x10 to 50x50) and wafer selection
 * via checkboxes in the sidebar.
 */
export default function StackingPage(): import("react/jsx-runtime").JSX.Element;
