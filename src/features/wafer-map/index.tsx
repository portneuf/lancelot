import { CircleDot } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';

export default function WaferMapPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);

  if (!activeFileId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={CircleDot} title="No Data" description="Open a file to view the wafer map" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold">Wafer Map</h1>
      <p className="text-sm text-muted-foreground">Wafer map canvas will be implemented in Phase 3.</p>
    </div>
  );
}
