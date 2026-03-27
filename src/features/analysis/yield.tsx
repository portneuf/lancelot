import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';

export default function YieldPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);

  if (!activeFileId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={TrendingUp} title="No Data" description="Open a file to view yield summary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold">Yield Summary</h1>
      <p className="text-sm text-muted-foreground">Yield summary will be implemented in Phase 4.</p>
    </div>
  );
}
