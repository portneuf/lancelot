import { useCallback } from 'react';
import { Download, FileSpreadsheet, Image, FileText } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { exportDefectsAsCsv } from '../export-csv';
import { exportWaferMapAsPng } from '../export-png';
import { exportReportAsPdf } from '../export-pdf';
import { useTranslation } from '@/i18n/useTranslation';

export function ExportMenu() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : null;
  const { t } = useTranslation();

  const handleExportCsv = useCallback(() => {
    if (!file) return;
    exportDefectsAsCsv(file.defects, file.defectSchema, file.classLookup, file.source.fileName);
  }, [file]);

  const handleExportPng = useCallback(() => {
    if (!file) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    exportWaferMapAsPng(canvas, file.source.fileName);
  }, [file]);

  const handleExportPdf = useCallback(() => {
    if (!file) return;
    const canvas = document.querySelector('canvas');
    exportReportAsPdf(file, canvas);
  }, [file]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors',
            file
              ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              : 'cursor-not-allowed text-muted-foreground/40',
          )}
          disabled={!file}
          title={t('export.title')}
        >
          <Download className="h-3.5 w-3.5" />
          {t('export.title')}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] rounded-md border border-border bg-popover p-1 shadow-md"
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onSelect={handleExportCsv}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t('export.defectsAsCsv')}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onSelect={handleExportPng}
          >
            <Image className="h-4 w-4" />
            {t('export.waferMapAsPng')}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onSelect={handleExportPdf}
          >
            <FileText className="h-4 w-4" />
            {t('export.reportAsPdf')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
