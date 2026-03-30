/**
 * Hook for opening and parsing inspection files.
 *
 * Uses a Web Worker for parsing to keep the UI responsive.
 * Falls back to main-thread parsing if Worker is unavailable.
 */
export declare function useFileOpen(): {
    openFile: (file: File) => Promise<void>;
    openFilePicker: () => void;
};
