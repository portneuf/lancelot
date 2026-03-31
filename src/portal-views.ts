/**
 * Maps Lancelot's 14 views to the Portal's ViewDefinition[] format.
 *
 * Each view is lazy-loaded and has a corresponding NavItem
 * for the Portal's navigation rail.
 */

import { lazy } from 'react';
import {
  FolderOpen,
  FileText,
  Hexagon,
  Table,
  Tags,
  BarChart3,
  ScatterChart,
  TrendingUp,
  GitCompare,
  LineChart,
  CircleDot,
  Slash,
  Activity,
  Brain,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import type { ViewDefinition } from '@portneuf/portal-framework';

export const lancelotViews: ViewDefinition[] = [
  // --- Files group ---
  {
    path: 'files',
    component: lazy(() => import('./features/file-manager')),
    navItem: {
      type: 'link',
      group: 'files',
      icon: FolderOpen,
      label: 'lancelot.nav.open',
      path: 'files',
    },
  },
  {
    path: 'file-info',
    component: lazy(() => import('./features/file-manager/file-info')),
    navItem: {
      type: 'link',
      group: 'files',
      icon: FileText,
      label: 'lancelot.nav.fileInfo',
      path: 'file-info',
    },
  },

  // --- Views group ---
  {
    path: 'wafer-map',
    component: lazy(() => import('./features/wafer-map')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Hexagon,
      label: 'lancelot.nav.waferMap',
      path: 'wafer-map',
    },
  },
  {
    path: 'defect-table',
    component: lazy(() => import('./features/inspection/defects')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Table,
      label: 'lancelot.nav.defects',
      path: 'defect-table',
    },
  },
  {
    path: 'classes',
    component: lazy(() => import('./features/inspection/classes')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Tags,
      label: 'lancelot.nav.classes',
      path: 'classes',
    },
  },
  {
    path: 'pareto',
    component: lazy(() => import('./features/analysis/pareto')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: BarChart3,
      label: 'lancelot.nav.pareto',
      path: 'pareto',
    },
  },
  {
    path: 'spatial',
    component: lazy(() => import('./features/analysis/spatial')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: ScatterChart,
      label: 'lancelot.nav.spatial',
      path: 'spatial',
    },
  },
  {
    path: 'yield',
    component: lazy(() => import('./features/analysis/yield')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: TrendingUp,
      label: 'lancelot.nav.yield',
      path: 'yield',
    },
  },
  {
    path: 'correlation',
    component: lazy(() => import('./features/analysis/correlation')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: GitCompare,
      label: 'lancelot.nav.correlation',
      path: 'correlation',
    },
  },
  {
    path: 'trend',
    component: lazy(() => import('./features/analysis/trend')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: LineChart,
      label: 'lancelot.nav.trend',
      path: 'trend',
    },
  },
  {
    path: 'cluster',
    component: lazy(() => import('./features/analysis/cluster')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: CircleDot,
      label: 'lancelot.nav.cluster',
      path: 'cluster',
    },
  },
  {
    path: 'scratch',
    component: lazy(() => import('./features/analysis/scratch')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Slash,
      label: 'lancelot.nav.scratch',
      path: 'scratch',
    },
  },
  {
    path: 'spc',
    component: lazy(() => import('./features/analysis/spc')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Activity,
      label: 'lancelot.nav.spc',
      path: 'spc',
    },
  },
  {
    path: 'classifier',
    component: lazy(() => import('./features/analysis/classifier')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Brain,
      label: 'lancelot.nav.classifier',
      path: 'classifier',
    },
  },
  {
    path: 'gallery',
    component: lazy(() => import('./features/gallery')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: LayoutGrid,
      label: 'lancelot.nav.gallery',
      path: 'gallery',
    },
  },
  {
    path: 'stacking',
    component: lazy(() => import('./features/stacking')),
    navItem: {
      type: 'link',
      group: 'views',
      icon: Layers,
      label: 'lancelot.nav.stacking',
      path: 'stacking',
    },
  },
];
