import { FileText, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useActiveFile } from '@/hooks/useActiveFile';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/i18n/useTranslation';

export default function FileInfoPage() {
  const { file } = useActiveFile();
  const { t } = useTranslation();

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={FileText} title={t('fileInfo.noFileLoaded')} description={t('fileInfo.openFileToSeeDetails')} />
      </div>
    );
  }

  const warnings = file.source.warnings;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t('fileInfo.title')}</h1>

      <div className="flex flex-col gap-6">
        {/* Source */}
        <Section title={t('fileInfo.source')}>
          <InfoRow label={t('fileInfo.fileName')} value={file.source.fileName} />
          <InfoRow label={t('fileInfo.format')} value={`${file.source.formatId.toUpperCase()} v${file.source.formatVersion}`} />
          <InfoRow label={t('fileInfo.fileSize')} value={formatBytes(file.source.fileSize)} />
          <InfoRow label={t('fileInfo.parsedAt')} value={new Date(file.source.parseTimestamp).toLocaleString()} />
        </Section>

        {/* Identity */}
        <Section title={t('fileInfo.identification')}>
          <InfoRow label={t('fileInfo.lotId')} value={file.identity.lotId} />
          <InfoRow label={t('fileInfo.waferId')} value={file.identity.waferId} />
          <InfoRow label={t('fileInfo.deviceId')} value={file.identity.deviceId} />
          {file.identity.slot != null && <InfoRow label={t('fileInfo.slot')} value={String(file.identity.slot)} />}
          {file.identity.stepId && <InfoRow label={t('fileInfo.stepId')} value={file.identity.stepId} />}
          {file.identity.fileTimestamp && <InfoRow label={t('fileInfo.fileTimestamp')} value={file.identity.fileTimestamp} />}
          {file.identity.resultTimestamp && <InfoRow label={t('fileInfo.resultTimestamp')} value={file.identity.resultTimestamp} />}
        </Section>

        {/* Geometry */}
        <Section title={t('fileInfo.waferGeometry')}>
          <InfoRow label={t('fileInfo.waferDiameter')} value={`${(file.waferGeometry.waferDiameter / 1000).toFixed(1)} mm`} />
          <InfoRow label={t('fileInfo.diePitch')} value={`${file.waferGeometry.diePitch[0]} x ${file.waferGeometry.diePitch[1]} um`} />
          <InfoRow label={t('fileInfo.dieOrigin')} value={`${file.waferGeometry.dieOrigin[0]}, ${file.waferGeometry.dieOrigin[1]} um`} />
          <InfoRow label={t('fileInfo.center')} value={`${file.waferGeometry.sampleCenterLocation[0]}, ${file.waferGeometry.sampleCenterLocation[1]} um`} />
          {file.waferGeometry.orientationMarkType && (
            <InfoRow label={t('fileInfo.orientationMark')} value={`${file.waferGeometry.orientationMarkType} ${file.waferGeometry.orientationMarkLocation ?? ''}`} />
          )}
        </Section>

        {/* Equipment */}
        <Section title={t('fileInfo.equipment')}>
          <InfoRow label={t('fileInfo.vendor')} value={file.inspectionSetup.stationId.vendor} />
          <InfoRow label={t('fileInfo.model')} value={file.inspectionSetup.stationId.model} />
          <InfoRow label={t('fileInfo.equipmentId')} value={file.inspectionSetup.stationId.equipmentId} />
          {file.inspectionSetup.setupId && <InfoRow label={t('fileInfo.setupRecipe')} value={file.inspectionSetup.setupId} />}
        </Section>

        {/* Statistics */}
        <Section title={t('fileInfo.statistics')}>
          <InfoRow label={t('fileInfo.totalDefects')} value={file.defects.length.toLocaleString()} highlight />
          <InfoRow label={t('fileInfo.defectClasses')} value={String(file.classLookup.length)} />
          <InfoRow label={t('fileInfo.diesInMap')} value={String(file.dieMap.length)} />
          <InfoRow label={t('fileInfo.testPlanDies')} value={String(file.testPlan.length)} />
          <InfoRow label={t('fileInfo.defectColumns')} value={file.defectSchema.map((c) => c.name).join(', ')} />
        </Section>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Section title={t('fileInfo.parseWarnings')}>
            <div className="flex flex-col gap-2">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">[{w.code}]</span>{' '}
                    {w.message}
                    {w.line != null && <span className="text-muted-foreground"> (line {w.line})</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </section>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm', highlight && 'font-semibold text-primary')}>{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
