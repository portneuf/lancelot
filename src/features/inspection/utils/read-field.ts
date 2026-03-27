import type { DefectRecord } from '@/core/models/defect';

/**
 * Read a field value from a DefectRecord by key.
 * Checks core properties first, then falls back to the `extra` map.
 */
export function readField(defect: DefectRecord, key: string): number | string | undefined {
  if (key in defect) {
    return (defect as unknown as Record<string, number | string | undefined>)[key];
  }
  return defect.extra[key];
}
