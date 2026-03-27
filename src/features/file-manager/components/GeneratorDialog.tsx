import { useState, useCallback } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';
import { generateKlarf } from '@/core/services/klarf-generator';
import type { DistributionMode } from '@/core/services/klarf-generator';
import { useFileStore } from '@/stores';
import { initializeRegistry } from '@/core/parsers';

interface GeneratorDialogProps {
  onGenerated?: () => void;
}

const distributions: { value: DistributionMode; label: string; desc: string }[] = [
  { value: 'random', label: 'Random', desc: 'Uniform across wafer' },
  { value: 'edge-heavy', label: 'Edge Heavy', desc: 'More defects near edge' },
  { value: 'clustered', label: 'Clustered', desc: 'Gaussian cluster groups' },
  { value: 'mixed', label: 'Mixed', desc: '40% edge + 30% cluster + 30% random' },
];

const presets = [
  { label: '100', value: 100 },
  { label: '1K', value: 1000 },
  { label: '10K', value: 10000 },
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
];

export function GeneratorDialog({ onGenerated }: GeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [defectCount, setDefectCount] = useState(1000);
  const [distribution, setDistribution] = useState<DistributionMode>('mixed');
  const [waferSize, setWaferSize] = useState(300);
  const [isGenerating, setIsGenerating] = useState(false);

  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const addRecentFile = useFileStore((s) => s.addRecentFile);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    // Run in next microtask to let spinner render
    await new Promise((r) => setTimeout(r, 50));

    try {
      const text = generateKlarf({
        defectCount,
        distribution,
        waferDiameter: waferSize * 1000, // mm to um
        seed: Date.now(),
      });

      const registry = initializeRegistry();
      const adapter = registry.detect('generated.klarf', text);
      if (!adapter) throw new Error('No parser found');

      const result = adapter.parse(text);
      if (!result.success) throw new Error(result.errors[0]?.message ?? 'Parse failed');

      const fileId = `generated-${defectCount}-${Date.now()}`;
      setActiveFile(fileId, result.data);
      addRecentFile({
        name: `generated-${defectCount}-${distribution}.klarf`,
        format: 'klarf',
        openedAt: new Date().toISOString(),
      });

      setOpen(false);
      onGenerated?.();
    } catch (err) {
      alert(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [defectCount, distribution, waferSize, setActiveFile, addRecentFile, onGenerated]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <Wand2 className="h-4 w-4" />
          Generate Test Data
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Generate KLARF Test Data</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Create a realistic semiconductor inspection file for testing.
          </Dialog.Description>

          <div className="mt-6 flex flex-col gap-5">
            {/* Defect Count */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium">Defect Count</label>
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {defectCount.toLocaleString()}
                </span>
              </div>
              <SliderPrimitive.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                value={[defectCount]}
                onValueChange={([v]) => setDefectCount(v)}
                min={10}
                max={100000}
                step={10}
              >
                <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
                  <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </SliderPrimitive.Root>
              <div className="flex gap-1">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setDefectCount(p.value)}
                    className={cn(
                      'flex-1 rounded border px-2 py-1 text-xs transition-colors',
                      defectCount === p.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distribution */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Distribution</label>
              <div className="grid grid-cols-2 gap-2">
                {distributions.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDistribution(d.value)}
                    className={cn(
                      'rounded-md border p-2 text-left transition-colors',
                      distribution === d.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <div className="text-xs font-medium">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Wafer Size */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Wafer Diameter</label>
              <div className="flex gap-2">
                {[200, 300, 450].map((size) => (
                  <button
                    key={size}
                    onClick={() => setWaferSize(size)}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors',
                      waferSize === size
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {size}mm
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate & Open
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
