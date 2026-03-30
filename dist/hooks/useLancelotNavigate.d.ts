/**
 * basePath-aware navigation hook for dual-mode operation.
 *
 * In standalone mode, maps view keys to nested routes (e.g. 'wafer-map' → '/wafer/map').
 * In portal mode, prepends basePath (e.g. 'wafer-map' → '/lancelot/wafer-map').
 */
/**
 * Returns a navigate function that accepts a flat view key
 * and resolves it to the correct route for the current mode.
 */
export declare function useLancelotNavigate(): (viewKey: string) => void;
