import { Upload } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export default function FileManagerPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={Upload}
        title="Open Inspection File"
        description="Drop a KLARF file here or click to browse"
      >
        <button className="mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Browse Files
        </button>
      </EmptyState>
    </div>
  );
}
