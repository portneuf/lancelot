/**
 * Assembles the complete ToolRegistration for the Portneuf Portal.
 *
 * This is the main integration point that connects all Lancelot subsystems
 * (views, tree, filters, status bar, lifecycle) into a single registration object.
 */

import { lazy } from 'react';
import { Hexagon } from 'lucide-react';
import type { ToolRegistration } from '@portneuf/portal-framework';
import { lancelotViews } from './portal-views';
import { setPortalMode } from './i18n/mode-flag';
import { initializeRegistry } from './core/parsers';

export const lancelotRegistration: ToolRegistration = {
  id: 'lancelot',
  name: 'Lancelot',
  subtitle: 'Semiconductor Inspection',
  version: '0.1.0',
  icon: Hexagon,
  basePath: '/lancelot',

  navItems: lancelotViews.map((v) => v.navItem),

  views: lancelotViews,
  defaultViewPath: 'wafer-map',

  treeComponent: lazy(() => import('./components/portal/LancelotFileTree')),
  globalFilters: lazy(() => import('./components/portal/LancelotFilters')),

  statusBarSlots: [
    {
      id: 'lancelot-file-info',
      position: 'left',
      priority: 10,
      component: lazy(() =>
        import('./components/portal/StatusBarSlots').then((m) => ({
          default: m.FileInfoSlot,
        })),
      ),
      source: 'tool',
    },
    {
      id: 'lancelot-defect-count',
      position: 'left',
      priority: 20,
      component: lazy(() =>
        import('./components/portal/StatusBarSlots').then((m) => ({
          default: m.DefectCountSlot,
        })),
      ),
      source: 'tool',
    },
  ],

  panelConstraints: {
    tree: { minWidth: 200, maxWidth: 400, defaultWidth: 280 },
    sidebar: { minWidth: 280, maxWidth: 400, defaultWidth: 320 },
  },

  lifecycle: {
    onActivate: () => {
      setPortalMode(true);
      initializeRegistry();
    },
    onDeactivate: () => {
      // Keep stores alive for fast tool-switch back
      return true;
    },
  },
};
