/**
 * Module-level flag for portal vs standalone mode.
 *
 * Set once before React renders (in entry points).
 * Used by hooks that need to branch without violating rules-of-hooks.
 */

let _portalMode = false;

export type TranslationHook = () => { t: (key: string) => string; locale: string };
let _standaloneHook: TranslationHook | null = null;

export function setPortalMode(value: boolean): void {
  _portalMode = value;
}

export function getIsPortalMode(): boolean {
  return _portalMode;
}

/**
 * Register the standalone (LinguiJS) translation hook.
 * Called once from standalone-entry.tsx before React renders.
 * This avoids pulling @lingui/* into the library build.
 */
export function registerStandaloneHook(hook: TranslationHook): void {
  _standaloneHook = hook;
}

export function getStandaloneHook(): TranslationHook | null {
  return _standaloneHook;
}
