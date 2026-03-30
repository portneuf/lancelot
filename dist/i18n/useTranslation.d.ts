/**
 * Dual-mode translation hook.
 *
 * In standalone mode: delegates to LinguiJS (useLingui).
 * In portal mode: delegates to @portneuf/i18n, prefixing keys with 'lancelot.'.
 *
 * The mode is determined by a module-level flag set once before React renders,
 * so the same branch always executes — no rules-of-hooks violation.
 */
export declare function useTranslation(): {
    t: (key: string) => string;
    locale: string;
};
