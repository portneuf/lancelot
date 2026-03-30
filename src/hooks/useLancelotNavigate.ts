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

import { useCallback } from 'react';
import { getIsPortalMode, getStandaloneNavigateHook } from '@/i18n/mode-flag';

function usePortalNavigate() {
  return useCallback((_viewKey: string) => {
    // Intentionally empty — portal views read from Zustand stores directly.
    // The Portal framework's ContentArea renders the active view;
    // file data flows through stores and views update reactively.
  }, []);
}

export function useLancelotNavigate() {
  if (getIsPortalMode()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePortalNavigate();
  }
  const hook = getStandaloneNavigateHook();
  if (!hook) {
    throw new Error(
      'Navigation not initialized. In standalone mode, registerStandaloneNavigateHook() ' +
        'must be called before React renders.',
    );
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return hook();
}
