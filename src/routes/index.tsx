import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RequireFile } from './guards';

function lazyPage(importFn: () => Promise<{ default: React.ComponentType }>) {
  return () => importFn().then((m) => ({ Component: m.default }));
}

function RouteErrorFallback({ context }: { context: string }) {
  return (
    <ErrorBoundary context={context}>
      <div />
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorFallback context="Root" />,
    children: [
      { index: true, element: <Navigate to="/file/open" replace /> },

      // File Management
      {
        path: 'file',
        errorElement: <RouteErrorFallback context="File Manager" />,
        children: [
          { path: 'open', lazy: lazyPage(() => import('@/features/file-manager')) },
          { path: 'info', lazy: lazyPage(() => import('@/features/file-manager/file-info')) },
        ],
      },

      // Guarded routes: require an active file
      {
        element: <RequireFile />,
        children: [
          // Inspection
          {
            path: 'inspection',
            errorElement: <RouteErrorFallback context="Inspection" />,
            children: [
              { path: 'defects', lazy: lazyPage(() => import('@/features/inspection/defects')) },
              { path: 'classes', lazy: lazyPage(() => import('@/features/inspection/classes')) },
            ],
          },

          // Wafer Map
          {
            path: 'wafer',
            errorElement: <RouteErrorFallback context="Wafer Map" />,
            children: [
              { path: 'map', lazy: lazyPage(() => import('@/features/wafer-map')) },
            ],
          },

          // Analysis
          {
            path: 'analysis',
            errorElement: <RouteErrorFallback context="Analysis" />,
            children: [
              { path: 'pareto', lazy: lazyPage(() => import('@/features/analysis/pareto')) },
              { path: 'spatial', lazy: lazyPage(() => import('@/features/analysis/spatial')) },
              { path: 'yield', lazy: lazyPage(() => import('@/features/analysis/yield')) },
              { path: 'correlation', lazy: lazyPage(() => import('@/features/analysis/correlation')) },
              { path: 'trend', lazy: lazyPage(() => import('@/features/analysis/trend')) },
              { path: 'cluster', lazy: lazyPage(() => import('@/features/analysis/cluster')) },
              { path: 'scratch', lazy: lazyPage(() => import('@/features/analysis/scratch')) },
              { path: 'spc', lazy: lazyPage(() => import('@/features/analysis/spc')) },
            ],
          },
        ],
      },

      // Settings
      { path: 'settings', lazy: lazyPage(() => import('@/features/settings')) },
    ],
  },
]);
