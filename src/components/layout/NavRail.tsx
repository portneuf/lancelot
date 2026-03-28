import {
  FolderOpen,
  FileText,
  Bug,
  Tags,
  CircleDot,
  BarChart3,
  ScatterChart,
  TrendingUp,
  GitBranch,
  Slash,
  Activity,
  Link2,
  ChartLine,
  Brain,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { NavRailGroup } from './NavRailGroup';
import { NavRailItem } from './NavRailItem';
import { useSettingsStore } from '@/stores';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTranslation } from '@/i18n/useTranslation';

export function NavRail() {
  const isMobile = useIsMobile();
  const expanded = useSettingsStore((s) => s.navRailExpanded);
  const setExpanded = useSettingsStore((s) => s.setNavRailExpanded);
  const collapsed = !expanded;
  const { t } = useTranslation();

  if (isMobile) {
    return <MobileBottomNav />;
  }

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Logo / Header */}
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-3', collapsed && 'justify-center')}>
        {!collapsed && <span className="text-lg font-bold tracking-tight">Lancelot</span>}
        {collapsed && <CircleDot className="h-6 w-6 text-primary" />}
      </div>

      {/* Navigation Groups */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
        <NavRailGroup label={t('nav.file')} collapsed={collapsed}>
          <NavRailItem to="/file/open" icon={FolderOpen} label={t('nav.open')} collapsed={collapsed} />
          <NavRailItem to="/file/info" icon={FileText} label={t('nav.fileInfo')} collapsed={collapsed} />
        </NavRailGroup>

        <NavRailGroup label={t('nav.inspection')} collapsed={collapsed}>
          <NavRailItem to="/inspection/defects" icon={Bug} label={t('nav.defects')} collapsed={collapsed} />
          <NavRailItem to="/inspection/classes" icon={Tags} label={t('nav.classes')} collapsed={collapsed} />
        </NavRailGroup>

        <NavRailGroup label={t('nav.wafer')} collapsed={collapsed}>
          <NavRailItem to="/wafer/map" icon={CircleDot} label={t('nav.waferMap')} collapsed={collapsed} />
        </NavRailGroup>

        <NavRailGroup label={t('nav.analysis')} collapsed={collapsed}>
          <NavRailItem to="/analysis/pareto" icon={BarChart3} label={t('nav.pareto')} collapsed={collapsed} />
          <NavRailItem to="/analysis/spatial" icon={ScatterChart} label={t('nav.spatial')} collapsed={collapsed} />
          <NavRailItem to="/analysis/yield" icon={TrendingUp} label={t('nav.yield')} collapsed={collapsed} />
          <NavRailItem to="/analysis/correlation" icon={Link2} label={t('nav.correlation')} collapsed={collapsed} />
          <NavRailItem to="/analysis/trend" icon={ChartLine} label={t('nav.trend')} collapsed={collapsed} />
          <NavRailItem to="/analysis/cluster" icon={GitBranch} label={t('nav.cluster')} collapsed={collapsed} />
          <NavRailItem to="/analysis/scratch" icon={Slash} label={t('nav.scratch')} collapsed={collapsed} />
          <NavRailItem to="/analysis/spc" icon={Activity} label={t('nav.spc')} collapsed={collapsed} />
          <NavRailItem to="/analysis/classifier" icon={Brain} label={t('nav.classifier')} collapsed={collapsed} />
        </NavRailGroup>
      </div>

      {/* Bottom: Settings + Collapse Toggle */}
      <div className="flex flex-col gap-1 border-t border-sidebar-border p-2">
        <NavRailItem to="/settings" icon={Settings} label={t('nav.settings')} collapsed={collapsed} />
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="truncate">{t('nav.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-background">
      <NavRailItem to="/file/open" icon={FolderOpen} label={t('nav.open')} collapsed />
      <NavRailItem to="/wafer/map" icon={CircleDot} label={t('nav.waferMap')} collapsed />
      <NavRailItem to="/inspection/defects" icon={Bug} label={t('nav.defects')} collapsed />
      <NavRailItem to="/analysis/pareto" icon={BarChart3} label={t('nav.analysis')} collapsed />
      <NavRailItem to="/settings" icon={Settings} label={t('nav.settings')} collapsed />
    </nav>
  );
}
