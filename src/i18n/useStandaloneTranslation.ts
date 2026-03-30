/**
 * Standalone translation hook using LinguiJS.
 *
 * This file is ONLY imported from standalone-entry.tsx and never from
 * the portal code path. This ensures @lingui/core and @lingui/react
 * are not pulled into the library build.
 */

import { useMemo } from 'react';
import { i18n } from '@lingui/core';
import { useLingui } from '@lingui/react';

export function useStandaloneTranslation() {
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
