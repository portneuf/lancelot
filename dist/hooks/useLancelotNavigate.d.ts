/**
 * Dual-mode navigation hook.
 *
 * In standalone mode: delegates to a registered React Router hook
 *   (injected by standalone-entry.tsx to avoid pulling react-router
 *   into the library build).
 * In portal mode: uses the framework's navigateToView() from ToolContext.
 *
 * The mode is determined by getIsPortalMode(), set once before React renders.
 */
export declare function useLancelotNavigate(): (viewKey: string) => void;
