import { useState } from 'react';
import { NavRail } from './NavRail';
import { ContentArea } from './ContentArea';
import { StatusBar } from './StatusBar';
import { TitleBar } from './TitleBar';
import { FilterSidebar } from './FilterSidebar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFileOpen } from '@/features/file-manager/hooks/useFileOpen';
import { useFilteredDefects } from '@/hooks/useFilteredDefects';

export function AppShell() {
  const isMobile = useIsMobile();
  const { openFilePicker } = useFileOpen();
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Global filtered defects computation - runs on every page
  useFilteredDefects();

  useKeyboardShortcuts({ onOpenFile: openFilePicker });

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {__IS_TAURI__ && <TitleBar />}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <div id="main-content" className="flex flex-1 flex-col overflow-hidden">
          <ContentArea />
        </div>
        <FilterSidebar
          open={filterSidebarOpen}
          onClose={() => setFilterSidebarOpen(false)}
        />
      </div>
      <StatusBar
        onToggleFilters={() => setFilterSidebarOpen((prev) => !prev)}
        filterSidebarOpen={filterSidebarOpen}
      />
      {isMobile && <div className="h-14 shrink-0" />}
    </div>
  );
}
