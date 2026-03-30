/**
 * Dual-mode navigation hook.
 *
 * In standalone mode: delegates to a registered React Router hook
 *   (injected by standalone-entry.tsx to avoid pulling react-router
 *   into the library build).
 * In portal mode: uses the framework's navigateToView() from ToolContext.
 *
 * The mode is determined by getIsPortalMode(), set once before React renders.
 */

import { useCallback, useContext } from 'react';
import { getIsPortalMode, getStandaloneNavigateHook } from '@/i18n/mode-flag';
import { ToolContext } from '@portneuf/portal-framework';

function usePortalNavigate() {
  const toolCtx = useContext(ToolContext);

  return useCallback(
    (viewKey: string) => {
      toolCtx?.navigateToView(viewKey);
    },
    [toolCtx],
  );
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
