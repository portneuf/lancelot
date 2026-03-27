import { useMemo } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { CATEGORICAL_PALETTE } from '@/core/utils/color-scales';

export interface OverlayLayer {
  fileId: string;
  fileName: string;
  color: string;
  visible: boolean;
  defectCount: number;
}

interface OverlayPanelProps {
  layers: OverlayLayer[];
  onToggleLayer: (fileId: string) => void;
}

export function OverlayPanel({ layers, onToggleLayer }: OverlayPanelProps) {
  if (layers.length <= 1) return null;

  return (
    <div
      className={cn(
        'absolute left-3 top-3 flex flex-col gap-1',
        'rounded-lg border border-border bg-card/90 p-2 shadow-md backdrop-blur-sm',
      )}
    >
      <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        Layers
      </div>
      {layers.map((layer) => (
        <button
          key={layer.fileId}
          onClick={() => onToggleLayer(layer.fileId)}
          className={cn(
            'flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors',
            layer.visible
              ? 'text-foreground hover:bg-muted'
              : 'text-muted-foreground/50 hover:bg-muted',
          )}
        >
          <div
            className="h-3 w-3 shrink-0 rounded-sm border"
            style={{
              backgroundColor: layer.visible ? layer.color : 'transparent',
              borderColor: layer.color,
            }}
          />
          {layer.visible ? (
            <Eye className="h-3 w-3 shrink-0" />
          ) : (
            <EyeOff className="h-3 w-3 shrink-0" />
          )}
          <span className="max-w-[140px] truncate">{layer.fileName}</span>
          <span className="ml-auto tabular-nums text-muted-foreground">
            {layer.defectCount.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Hook to build overlay layers from all loaded files.
 */
export function useOverlayLayers(): {
  layers: OverlayLayer[];
  visibleFileIds: Set<string>;
  toggleLayer: (fileId: string) => void;
} {
  const files = useFileStore((s) => s.files);
  const allLayers = useMemo(() => {
    const result: OverlayLayer[] = [];
    let colorIdx = 0;
    for (const [fileId, file] of files) {
      result.push({
        fileId,
        fileName: file.source.fileName,
        color: CATEGORICAL_PALETTE[colorIdx % CATEGORICAL_PALETTE.length],
        visible: true,
        defectCount: file.defects.length,
      });
      colorIdx++;
    }
    return result;
  }, [files]);

  // Track visibility state
  const { layers, visibleFileIds, toggleLayer } = useMemo(() => {
    let currentLayers = allLayers;
    const visible = new Set(allLayers.map((l) => l.fileId));

    return {
      layers: currentLayers,
      visibleFileIds: visible,
      toggleLayer: (_fileId: string) => {
        // Toggle is handled by parent component state via onToggleLayer prop
      },
    };
  }, [allLayers]);

  return { layers, visibleFileIds, toggleLayer };
}
