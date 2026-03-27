import { useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (n: number) => string;
  histogramData?: number[];
  unit?: string;
  className?: string;
}

const defaultFormat = (n: number) => {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(1);
};

export function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue = defaultFormat,
  histogramData,
  unit,
  className,
}: RangeSliderProps) {
  const effectiveStep = step ?? (max - min > 100 ? 1 : (max - min) / 100);
  const isFullRange = value[0] <= min && value[1] >= max;

  const histogramBars = useMemo(() => {
    if (!histogramData || histogramData.length === 0) return null;
    const maxCount = Math.max(...histogramData);
    if (maxCount === 0) return null;

    return histogramData.map((count, i) => {
      const height = (count / maxCount) * 100;
      return (
        <div
          key={i}
          className="flex-1"
          style={{ height: `${height}%` }}
        >
          <div className="h-full w-full rounded-sm bg-muted-foreground/15" />
        </div>
      );
    });
  }, [histogramData]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Header: label + values */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn(
          'text-xs tabular-nums',
          isFullRange ? 'text-muted-foreground/50' : 'text-foreground font-medium',
        )}>
          {formatValue(value[0])}
          {unit ? ` ${unit}` : ''}
          {' — '}
          {formatValue(value[1])}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>

      {/* Slider with histogram background */}
      <div className="relative">
        {/* Histogram bars behind the slider */}
        {histogramBars && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end gap-px px-2">
            {histogramBars}
          </div>
        )}

        {/* Radix Slider */}
        <Slider.Root
          className="relative flex h-6 w-full touch-none select-none items-center"
          value={value}
          onValueChange={(v) => onChange(v as [number, number])}
          min={min}
          max={max}
          step={effectiveStep}
          minStepsBetweenThumbs={1}
        >
          <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
            <Slider.Range className="absolute h-full rounded-full bg-primary/40" />
          </Slider.Track>
          <Slider.Thumb
            className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${label} minimum`}
          />
          <Slider.Thumb
            className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${label} maximum`}
          />
        </Slider.Root>
      </div>
    </div>
  );
}
