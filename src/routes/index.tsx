import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function lazyPage(importFn: () => Promise<{ default: React.ComponentType }>) {
  return () => importFn().then((m) => ({ Component: m.default }));
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorBoundary><div /></ErrorBoundary>,
    children: [
      { index: true, element: <Navigate to="/file/open" replace /> },

      // File Management
      {
        path: 'file',
        children: [
          { path: 'open', lazy: lazyPage(() => import('@/features/file-manager')) },
          { path: 'info', lazy: lazyPage(() => import('@/features/file-manager/file-info')) },
        ],
      },

      // Inspection
      {
        path: 'inspection',
        children: [
          { path: 'defects', lazy: lazyPage(() => import('@/features/inspection/defects')) },
          { path: 'classes', lazy: lazyPage(() => import('@/features/inspection/classes')) },
        ],
      },

      // Wafer Map
      {
        path: 'wafer',
        children: [
          { path: 'map', lazy: lazyPage(() => import('@/features/wafer-map')) },
        ],
      },

      // Analysis
      {
        path: 'analysis',
        children: [
          { path: 'pareto', lazy: lazyPage(() => import('@/features/analysis/pareto')) },
          { path: 'spatial', lazy: lazyPage(() => import('@/features/analysis/spatial')) },
          { path: 'yield', lazy: lazyPage(() => import('@/features/analysis/yield')) },
        ],
      },

      // Settings
      { path: 'settings', lazy: lazyPage(() => import('@/features/settings')) },
    ],
  },
]);
