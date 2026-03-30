import type { DefectRecord, DefectColumnSchema } from '@/core/models/defect';
import type { ClassLookupEntry } from '@/core/models/inspection-file';
interface DefectDetailPanelProps {
    defects: DefectRecord[];
    defectSchema: DefectColumnSchema[];
    classLookup: ClassLookupEntry[];
}
export declare function DefectDetailPanel({ defects, classLookup }: DefectDetailPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
