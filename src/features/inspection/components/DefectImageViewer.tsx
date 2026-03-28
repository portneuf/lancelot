/**
 * Defect image viewer UI for inspecting SEM / optical image references
 * associated with a highlighted defect.
 *
 * KLARF files reference external image files via IMAGELIST sections.
 * Actual image loading requires file-system access that is outside the
 * browser sandbox; this component provides the UI framework and shows
 * placeholder cards with path hints for each referenced image.
 */

import { useMemo } from 'react';
import { Image, ImageOff, Camera } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useInspectionStore } from '@/stores';
import type { DefectRecord, DefectImage } from '@/core/models/defect';

interface DefectImageViewerProps {
  /** Full list of defect records to look up the highlighted one. */
  defects: DefectRecord[];
}

/**
 * Generates synthetic placeholder image metadata for a defect.
 *
 * In a production system this would come from the parsed IMAGELIST data.
 * For now we derive deterministic placeholders from the defect's imageCount.
 */
function buildImageRefs(defect: DefectRecord): DefectImage[] {
  const count = defect.imageCount ?? 0;
  if (count <= 0) return [];

  const types = ['optical', 'SEM', 'darkfield', 'brightfield', 'review'];
  const refs: DefectImage[] = [];

  for (let i = 0; i < count; i++) {
    refs.push({
      imageId: `${defect.defectId}-img-${i + 1}`,
      imageType: types[i % types.length],
      width: 512,
      height: 512,
    });
  }

  return refs;
}

function ImageCard({ img }: { img: DefectImage; defectId: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-muted/30">
      {/* Placeholder area */}
      <div className="flex aspect-square items-center justify-center bg-muted/60">
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
          <ImageOff className="h-8 w-8" />
          <span className="text-[10px]">External file</span>
        </div>
      </div>
      {/* Metadata */}
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="truncate text-xs font-medium" title={img.imageId}>
          {img.imageType.toUpperCase()}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {img.width} x {img.height} px
        </span>
        <span className="truncate text-[10px] text-muted-foreground" title={img.imageId}>
          {img.imageId}
        </span>
      </div>
    </div>
  );
}

export default function DefectImageViewer({ defects }: DefectImageViewerProps) {
  const highlightedId = useInspectionStore((s) => s.highlightedDefectId);

  const defect = useMemo(
    () => (highlightedId != null ? defects.find((d) => d.defectId === highlightedId) : undefined),
    [defects, highlightedId],
  );

  const imageRefs = useMemo(() => (defect ? buildImageRefs(defect) : []), [defect]);

  // Nothing selected or defect has no images
  if (!defect || imageRefs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold">Defect Images</span>
      </div>

      {/* Summary badge */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs',
        )}
      >
        <Image className="h-4 w-4 text-primary" />
        <span>
          Image references found: <strong className="text-foreground">{imageRefs.length}</strong>
        </span>
      </div>

      {/* Hint about external files */}
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Image files are external to the KLARF data and typically stored alongside
        the inspection output on the tool&apos;s file server. Loading requires
        file-system or network access to the original paths.
      </p>

      {/* Image cards grid */}
      <div className="grid grid-cols-2 gap-2">
        {imageRefs.map((img) => (
          <ImageCard key={img.imageId} img={img} defectId={defect.defectId} />
        ))}
      </div>
    </div>
  );
}
