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
export declare const useFileStore: import("zustand").UseBoundStore<import("zustand").StoreApi<FileState>>;
