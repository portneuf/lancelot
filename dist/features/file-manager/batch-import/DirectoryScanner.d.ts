/**
 * Directory scanner for KLARF/SINF files.
 *
 * Web: uses showDirectoryPicker() (File System Access API)
 * with fallback to <input webkitdirectory>.
 */
/**
 * Pick a directory and return all KLARF/SINF files in it.
 * Uses showDirectoryPicker() if available, falls back to input[webkitdirectory].
 */
export declare function pickDirectoryFiles(): Promise<File[]>;
