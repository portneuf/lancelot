/**
 * Dual-mode translation hook.
 *
 * In standalone mode: delegates to a registered LinguiJS hook (injected by standalone-entry).
 * In portal mode: delegates to @portneuf/i18n, prefixing keys with 'lancelot.'.
 *
 * The mode is determined by a module-level flag set once before React renders,
 * so the same branch always executes — no rules-of-hooks violation.
 *
 * @lingui/core and @lingui/react are NOT imported here — they live in
 * useStandaloneTranslation.ts, which is only referenced from standalone-entry.tsx.
 * This ensures the library build (portal) never pulls in LinguiJS.
 */
export declare function useTranslation(): {
    t: (key: string) => string;
    locale: string;
};
