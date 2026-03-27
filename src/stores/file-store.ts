import { create } from 'zustand';
import type { InspectionFile, ParseWarning } from '@/core/models/inspection-file';
import type { ParseError } from '@/core/parsers/parser.interface';

export type LoadingState = 'idle' | 'reading' | 'parsing' | 'complete' | 'error';

export interface RecentFileEntry {
  name: string;
  path?: string;
  format: string;
  openedAt: string;
}

export interface FileState {
  files: Map<string, InspectionFile>;
  activeFileId: string | null;
  loadingState: LoadingState;
  loadingProgress: number;
  parseErrors: ParseError[];
  parseWarnings: ParseWarning[];
  recentFiles: RecentFileEntry[];

  setActiveFile: (id: string, file: InspectionFile) => void;
  closeFile: (id: string) => void;
  switchToFile: (id: string) => void;
  setLoadingState: (state: LoadingState) => void;
  setLoadingProgress: (progress: number) => void;
  setParseErrors: (errors: ParseError[]) => void;
  setParseWarnings: (warnings: ParseWarning[]) => void;
  addRecentFile: (entry: RecentFileEntry) => void;
  reset: () => void;
}

export const useFileStore = create<FileState>()((set) => ({
  files: new Map(),
  activeFileId: null,
  loadingState: 'idle',
  loadingProgress: 0,
  parseErrors: [],
  parseWarnings: [],
  recentFiles: [],

  setActiveFile: (id, file) =>
    set((state) => {
      const files = new Map(state.files);
      files.set(id, file);
      return { files, activeFileId: id, loadingState: 'complete', parseErrors: [] };
    }),

  closeFile: (id) =>
    set((state) => {
      const files = new Map(state.files);
      files.delete(id);
      const activeFileId =
        state.activeFileId === id
          ? (files.keys().next().value ?? null)
          : state.activeFileId;
      return { files, activeFileId };
    }),

  switchToFile: (id) => set({ activeFileId: id }),

  setLoadingState: (loadingState) => set({ loadingState }),
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
  setParseErrors: (parseErrors) => set({ parseErrors, loadingState: 'error' }),
  setParseWarnings: (parseWarnings) => set({ parseWarnings }),

  addRecentFile: (entry) =>
    set((state) => ({
      recentFiles: [entry, ...state.recentFiles.filter((f) => f.name !== entry.name)].slice(0, 10),
    })),

  reset: () =>
    set({
      files: new Map(),
      activeFileId: null,
      loadingState: 'idle',
      loadingProgress: 0,
      parseErrors: [],
      parseWarnings: [],
    }),
}));
