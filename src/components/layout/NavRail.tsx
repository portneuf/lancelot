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

export function NavRail() {
  const isMobile = useIsMobile();
  const expanded = useSettingsStore((s) => s.navRailExpanded);
  const setExpanded = useSettingsStore((s) => s.setNavRailExpanded);
  const collapsed = !expanded;

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
        <NavRailGroup label="File" collapsed={collapsed}>
          <NavRailItem to="/file/open" icon={FolderOpen} label="Open" collapsed={collapsed} />
          <NavRailItem to="/file/info" icon={FileText} label="File Info" collapsed={collapsed} />
        </NavRailGroup>

        <NavRailGroup label="Inspection" collapsed={collapsed}>
          <NavRailItem to="/inspection/defects" icon={Bug} label="Defects" collapsed={collapsed} />
          <NavRailItem to="/inspection/classes" icon={Tags} label="Classes" collapsed={collapsed} />
        </NavRailGroup>

        <NavRailGroup label="Wafer" collapsed={collapsed}>
          <NavRailItem to="/wafer/map" icon={CircleDot} label="Wafer Map" collapsed={collapsed} />
        </NavRailGroup>

        <NavRailGroup label="Analysis" collapsed={collapsed}>
          <NavRailItem to="/analysis/pareto" icon={BarChart3} label="Pareto" collapsed={collapsed} />
          <NavRailItem to="/analysis/spatial" icon={ScatterChart} label="Spatial" collapsed={collapsed} />
          <NavRailItem to="/analysis/yield" icon={TrendingUp} label="Yield" collapsed={collapsed} />
          <NavRailItem to="/analysis/correlation" icon={Link2} label="Correlation" collapsed={collapsed} />
          <NavRailItem to="/analysis/trend" icon={ChartLine} label="Trend" collapsed={collapsed} />
          <NavRailItem to="/analysis/cluster" icon={GitBranch} label="Cluster" collapsed={collapsed} />
          <NavRailItem to="/analysis/scratch" icon={Slash} label="Scratch" collapsed={collapsed} />
          <NavRailItem to="/analysis/spc" icon={Activity} label="SPC" collapsed={collapsed} />
          <NavRailItem to="/analysis/classifier" icon={Brain} label="Classifier" collapsed={collapsed} />
        </NavRailGroup>
      </div>

      {/* Bottom: Settings + Collapse Toggle */}
      <div className="flex flex-col gap-1 border-t border-sidebar-border p-2">
        <NavRailItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-background">
      <NavRailItem to="/file/open" icon={FolderOpen} label="Open" collapsed />
      <NavRailItem to="/wafer/map" icon={CircleDot} label="Map" collapsed />
      <NavRailItem to="/inspection/defects" icon={Bug} label="Defects" collapsed />
      <NavRailItem to="/analysis/pareto" icon={BarChart3} label="Analysis" collapsed />
      <NavRailItem to="/settings" icon={Settings} label="Settings" collapsed />
    </nav>
  );
}
