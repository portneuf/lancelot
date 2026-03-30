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

import { useMemo } from 'react';
import { useTranslation as usePortneufTranslation } from '@portneuf/i18n';
import { getIsPortalMode, getStandaloneHook } from './mode-flag';

function usePortalTranslation() {
  const { t: portalT, locale } = usePortneufTranslation();

  const t = useMemo(() => {
    return (key: string): string => portalT(`lancelot.${key}`);
  }, [portalT]);

  return { t, locale };
}

export function useTranslation() {
  if (getIsPortalMode()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePortalTranslation();
  }
  const hook = getStandaloneHook();
  if (!hook) {
    throw new Error(
      'Translation not initialized. In standalone mode, registerStandaloneHook() ' +
        'must be called before React renders.',
    );
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return hook();
}
