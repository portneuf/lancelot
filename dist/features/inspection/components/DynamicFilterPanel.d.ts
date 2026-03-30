import type { DefectRecord } from '@/core/models/defect';
import type { DefectColumnSchema } from '@/core/models/defect';
interface DynamicFilterPanelProps {
    defects: DefectRecord[];
    defectSchema: DefectColumnSchema[];
}
export declare function DynamicFilterPanel({ defects, defectSchema }: DynamicFilterPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
