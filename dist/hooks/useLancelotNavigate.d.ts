/**
 * Dual-mode navigation hook.
 *
 * In standalone mode: delegates to a registered React Router hook
 *   (injected by standalone-entry.tsx to avoid pulling react-router
 *   into the library build).
 * In portal mode: no-op. The Portal framework controls view rendering;
 *   data flows through Zustand stores and views update reactively.
 *
 * The mode is determined by getIsPortalMode(), set once before React renders.
 */
export declare function useLancelotNavigate(): (_viewKey: string) => void;
