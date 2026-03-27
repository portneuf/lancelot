import { Palette } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WaferMapColorMode } from '../hooks/useWaferMapRenderer';

const modes: { value: WaferMapColorMode; label: string }[] = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'byClass', label: 'By Class' },
  { value: 'bySize', label: 'By Size' },
  { value: 'byCluster', label: 'By Cluster' },
];

interface ColorModeSelectorProps {
  value: WaferMapColorMode;
  onChange: (mode: WaferMapColorMode) => void;
}

export function ColorModeSelector({ value, onChange }: ColorModeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            'rounded px-2 py-0.5 text-xs transition-colors',
            value === m.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
          title={`Color defects ${m.label.toLowerCase()}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
