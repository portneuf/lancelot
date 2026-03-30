/**
 * Dual-mode translation hook.
 *
 * In standalone mode: delegates to LinguiJS (useLingui).
 * In portal mode: delegates to @portneuf/i18n, prefixing keys with 'lancelot.'.
 *
 * The mode is determined by a module-level flag set once before React renders,
 * so the same branch always executes — no rules-of-hooks violation.
 */

import { useMemo } from 'react';
import { i18n } from '@lingui/core';
import { useLingui } from '@lingui/react';
import { useTranslation as usePortneufTranslation } from '@portneuf/i18n';
import { getIsPortalMode } from './mode-flag';

function useStandaloneTranslation() {
  const { i18n: _i18n } = useLingui();

  const t = useMemo(() => {
    return (key: string): string => {
      const msg = i18n.messages[key];
      if (typeof msg === 'string') return msg;
      return key;
    };
  }, [_i18n.locale]);

  return { t, locale: _i18n.locale };
}

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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useStandaloneTranslation();
}
