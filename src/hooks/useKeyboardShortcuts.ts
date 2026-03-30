import { useEffect } from 'react';
import { useInspectionStore } from '@/stores';
import { useLancelotNavigate } from '@/hooks/useLancelotNavigate';

interface KeyboardShortcutConfig {
  onOpenFile: () => void;
}

/**
 * Global keyboard shortcut handler.
 *
 * Registered shortcuts:
 * - Ctrl+O / Cmd+O: Open file picker
 * - Escape: Clear defect selection
 * - F11: Toggle fullscreen
 * - Ctrl+1..5: Navigate to sections (file, inspection, wafer, analysis, settings)
 */
export function useKeyboardShortcuts({ onOpenFile }: KeyboardShortcutConfig) {
  const resetSelection = useInspectionStore((s) => s.resetSelection);
  const lancelotNavigate = useLancelotNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const modKey = e.ctrlKey || e.metaKey;

      // Ctrl+O / Cmd+O: Open file picker
      if (modKey && e.key === 'o') {
        e.preventDefault();
        onOpenFile();
        return;
      }

      // Escape: Clear defect selection
      if (e.key === 'Escape') {
        e.preventDefault();
        resetSelection();
        return;
      }

      // F11: Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        return;
      }

      // Ctrl+1..5: Navigate to sections
      if (modKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const sectionViews: Record<string, string> = {
          '1': 'files',
          '2': 'defect-table',
          '3': 'wafer-map',
          '4': 'pareto',
          '5': 'settings',
        };
        const viewKey = sectionViews[e.key];
        if (viewKey) {
          lancelotNavigate(viewKey);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenFile, resetSelection, lancelotNavigate]);
}
