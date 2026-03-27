import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

interface NavRailItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
}

export function NavRailItem({ to, icon: Icon, label, collapsed }: NavRailItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-foreground',
          isActive
            ? 'bg-sidebar-accent text-sidebar-foreground'
            : 'text-muted-foreground',
          collapsed && 'justify-center px-2',
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
