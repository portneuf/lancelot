/**
 * Standalone navigation hook using React Router.
 *
 * This file is ONLY imported from standalone-entry.tsx and never from
 * the portal code path. This ensures react-router is not pulled into
 * the library build.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';

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
  'gallery': '/analysis/gallery',
  'settings': '/settings',
};

export function useStandaloneNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (viewKey: string) => {
      const route = STANDALONE_ROUTES[viewKey] ?? `/${viewKey}`;
      navigate(route);
    },
    [navigate],
  );
}
