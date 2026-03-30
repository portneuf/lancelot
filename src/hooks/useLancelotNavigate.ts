/**
 * basePath-aware navigation hook for dual-mode operation.
 *
 * In standalone mode, maps view keys to nested routes (e.g. 'wafer-map' → '/wafer/map').
 * In portal mode, prepends basePath (e.g. 'wafer-map' → '/lancelot/wafer-map').
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useLancelotMode } from '@/mode-context';

/** Maps flat view keys to standalone nested routes. */
const STANDALONE_ROUTES: Record<string, string> = {
  'files': '/file/open',
  'file-info': '/file/info',
  'wafer-map': '/wafer/map',
  'defect-table': '/inspection/defects',
  'classes': '/inspection/classes',
  'pareto': '/analysis/pareto',
  'spatial': '/analysis/spatial',
  'yield': '/analysis/yield',
  'correlation': '/analysis/correlation',
  'trend': '/analysis/trend',
  'cluster': '/analysis/cluster',
  'scratch': '/analysis/scratch',
  'spc': '/analysis/spc',
  'classifier': '/analysis/classifier',
  'settings': '/settings',
};

/**
 * Returns a navigate function that accepts a flat view key
 * and resolves it to the correct route for the current mode.
 */
export function useLancelotNavigate() {
  const navigate = useNavigate();
  const { mode, basePath } = useLancelotMode();

  return useCallback(
    (viewKey: string) => {
      if (mode === 'standalone') {
        const route = STANDALONE_ROUTES[viewKey] ?? `/${viewKey}`;
        navigate(route);
      } else {
        const path = basePath.endsWith('/') ? basePath : `${basePath}/`;
        navigate(`${path}${viewKey}`);
      }
    },
    [navigate, mode, basePath],
  );
}
