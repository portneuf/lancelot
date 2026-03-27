import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';

export default function ParetoPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);

  if (!activeFileId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={BarChart3} title="No Data" description="Open a file to view Pareto analysis" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold">Pareto Chart</h1>
      <p className="text-sm text-muted-foreground">Pareto chart will be implemented in Phase 4.</p>
    </div>
  );
}
