import { NavRail } from './NavRail';
import { ContentArea } from './ContentArea';
import { StatusBar } from './StatusBar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFileOpen } from '@/features/file-manager/hooks/useFileOpen';

export function AppShell() {
  const isMobile = useIsMobile();
  const { openFilePicker } = useFileOpen();

  useKeyboardShortcuts({ onOpenFile: openFilePicker });

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Skip to content link for keyboard/screen-reader users */}
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
      </div>
      <StatusBar />
      {/* Mobile bottom nav takes space */}
      {isMobile && <div className="h-14 shrink-0" />}
    </div>
  );
}
