/**
 * WaferMap page component -- full-screen Canvas visualization of a semiconductor
 * wafer with die grid and defect overlay.
 *
 * Renders:
 * - Wafer outline with notch indicator
 * - Die grid colored by defect density (green -> red gradient)
 * - Defect dots (batch-rendered for performance)
 * - Floating toolbar with zoom controls
 * - Floating legend with die color key
 *
 * Interactions:
 * - Mouse wheel to zoom, drag to pan, touch pinch-to-zoom
 * - Click defect to highlight in inspection store
 * - Hover die to update inspection store
 */
export default function WaferMapPage(): import("react/jsx-runtime").JSX.Element;
