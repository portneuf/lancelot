import { ScatterChart } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';

export default function SpatialPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);

  if (!activeFileId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={ScatterChart} title="No Data" description="Open a file to view spatial distribution" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold">Spatial Distribution</h1>
      <p className="text-sm text-muted-foreground">Spatial scatter plot will be implemented in Phase 4.</p>
    </div>
  );
}
