import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';

export default function FileInfoPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : null;

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={FileText} title="No File Loaded" description="Open a file to see its details" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">File Information</h1>
      <div className="grid max-w-2xl gap-4">
        <InfoRow label="File Name" value={file.source.fileName} />
        <InfoRow label="Format" value={`${file.source.formatId} v${file.source.formatVersion}`} />
        <InfoRow label="Lot ID" value={file.identity.lotId} />
        <InfoRow label="Wafer ID" value={file.identity.waferId} />
        <InfoRow label="Device ID" value={file.identity.deviceId} />
        <InfoRow label="Wafer Diameter" value={`${file.waferGeometry.waferDiameter} um`} />
        <InfoRow label="Die Pitch" value={`${file.waferGeometry.diePitch[0]} x ${file.waferGeometry.diePitch[1]} um`} />
        <InfoRow label="Total Defects" value={file.defects.length.toLocaleString()} />
        <InfoRow label="Equipment" value={`${file.inspectionSetup.stationId.vendor} ${file.inspectionSetup.stationId.model}`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-border pb-2">
      <span className="w-40 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
