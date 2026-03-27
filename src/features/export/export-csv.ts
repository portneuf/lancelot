import type { DefectRecord, DefectColumnSchema } from '@/core/models/defect';
import type { ClassLookupEntry } from '@/core/models/inspection-file';

/**
 * Export defect data as CSV and trigger download.
 */
export function exportDefectsAsCsv(
  defects: DefectRecord[],
  schema: DefectColumnSchema[],
  classLookup: ClassLookupEntry[],
  fileName: string,
) {
  const classMap = new Map(classLookup.map((c) => [c.classNumber, c.className]));

  // Header: core fields + extra columns
  const coreHeaders = ['DefectID', 'XRel', 'YRel', 'XIndex', 'YIndex', 'Size', 'ClassNumber', 'ClassName', 'XAbs', 'YAbs'];
  const extraHeaders = schema
    .filter((s) => !['DEFECTID', 'XREL', 'YREL', 'XINDEX', 'YINDEX', 'DSIZE', 'DEFECTSIZE', 'CLASSNUMBER'].includes(s.name))
    .map((s) => s.name);
  const headers = [...coreHeaders, ...extraHeaders];

  const rows = defects.map((d) => {
    const core = [
      d.defectId,
      d.xRel,
      d.yRel,
      d.xIndex,
      d.yIndex,
      d.size ?? '',
      d.classNumber ?? '',
      classMap.get(d.classNumber ?? -1) ?? '',
      d.xAbs,
      d.yAbs,
    ];
    const extra = extraHeaders.map((h) => d.extra[h] ?? '');
    return [...core, ...extra];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((v) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(',')
    ),
  ].join('\n');

  downloadBlob(csvContent, fileName.replace(/\.\w+$/, '') + '_defects.csv', 'text/csv');
}

function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
