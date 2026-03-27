import { NavRail } from './NavRail';
import { ContentArea } from './ContentArea';
import { StatusBar } from './StatusBar';
import { useIsMobile } from '@/hooks/useMediaQuery';

export function AppShell() {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <ContentArea />
      </div>
      <StatusBar />
      {/* Mobile bottom nav takes space */}
      {isMobile && <div className="h-14 shrink-0" />}
    </div>
  );
}
