import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface NavRailGroupProps {
  label: string;
  collapsed?: boolean;
  children: ReactNode;
}

export function NavRailGroup({ label, collapsed, children }: NavRailGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      {collapsed && <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" />}
      <nav className={cn('flex flex-col gap-0.5', collapsed && 'items-center')}>
        {children}
      </nav>
    </div>
  );
}
