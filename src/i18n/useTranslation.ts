/**
 * Simple translation hook that reads from the loaded Lingui catalog.
 *
 * Returns a `t(key)` function that looks up the key in the active
 * locale's message catalog, falling back to the key itself.
 */

import { useMemo } from 'react';
import { i18n } from '@lingui/core';
import { useLingui } from '@lingui/react';

/**
 * Returns a translation function `t(key)` that reads from the active catalog.
 * Re-renders when the locale changes.
 */
export function useTranslation() {
  // useLingui triggers re-render on locale change
  const { i18n: _i18n } = useLingui();

  const t = useMemo(() => {
    return (key: string): string => {
      // Look up in the active catalog
      const msg = i18n.messages[key];
      if (typeof msg === 'string') return msg;
      // Fallback: return key itself
      return key;
    };
  }, [_i18n.locale]);

  return { t, locale: _i18n.locale };
}
