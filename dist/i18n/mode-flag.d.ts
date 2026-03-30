/**
 * Module-level flag for portal vs standalone mode.
 *
 * Set once before React renders (in entry points).
 * Used by hooks that need to branch without violating rules-of-hooks.
 */
export type TranslationHook = () => {
    t: (key: string) => string;
    locale: string;
};
export declare function setPortalMode(value: boolean): void;
export declare function getIsPortalMode(): boolean;
/**
 * Register the standalone (LinguiJS) translation hook.
 * Called once from standalone-entry.tsx before React renders.
 * This avoids pulling @lingui/* into the library build.
 */
export declare function registerStandaloneHook(hook: TranslationHook): void;
export declare function getStandaloneHook(): TranslationHook | null;
