import type { DefectRecord, DefectColumnSchema, ClassLookupEntry } from '@/core/models';
interface DefectTableProps {
    defects: DefectRecord[];
    defectSchema: DefectColumnSchema[];
    classLookup: ClassLookupEntry[];
}
export declare function DefectTable({ defects, defectSchema, classLookup }: DefectTableProps): import("react/jsx-runtime").JSX.Element;
export {};
