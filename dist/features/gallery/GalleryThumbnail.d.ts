/**
 * Single wafer map thumbnail for the Gallery grid.
 *
 * Uses IntersectionObserver for lazy rendering — only renders
 * when scrolled into view. Displays wafer ID, defect count,
 * and selection state.
 */
import type { InspectionFile } from '@/core/models/inspection-file';
import type { WaferMapColorMode } from '@/features/wafer-map/hooks/useWaferMapRenderer';
interface GalleryThumbnailProps {
    file: InspectionFile;
    fileId: string;
    size: number;
    colorMode: WaferMapColorMode;
    isSelected: boolean;
    onSelect: (fileId: string, shiftKey: boolean) => void;
    onClick: (fileId: string) => void;
}
export declare function GalleryThumbnail({ file, fileId, size, colorMode, isSelected, onSelect, onClick, }: GalleryThumbnailProps): import("react/jsx-runtime").JSX.Element;
export {};
