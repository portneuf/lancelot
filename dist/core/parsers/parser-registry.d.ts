/**
 * Singleton registry for file format adapters.
 *
 * The ParserRegistry manages a collection of FileFormatAdapters and
 * provides detection logic that combines file extension matching with
 * content-based probing to select the best adapter for a given file.
 */
import type { FileFormatAdapter, FileFormatDescriptor } from './parser.interface';
export declare class ParserRegistry {
    private static instance;
    private readonly adapters;
    /** Use ParserRegistry.getInstance() instead. */
    private constructor();
    /** Returns the singleton ParserRegistry instance. */
    static getInstance(): ParserRegistry;
    /**
     * Reset the singleton (primarily for testing).
     * After calling this, getInstance() will create a fresh registry.
     */
    static resetInstance(): void;
    /**
     * Register a file format adapter.
     *
     * @param adapter - The adapter to register.
     * @throws Error if an adapter with the same format id is already registered.
     */
    register(adapter: FileFormatAdapter): void;
    /**
     * Retrieve a registered adapter by its format id.
     *
     * @param id - The format id (e.g. "klarf").
     * @returns The adapter, or undefined if not registered.
     */
    getAdapter(id: string): FileFormatAdapter | undefined;
    /** Returns all registered adapters. */
    getAllAdapters(): FileFormatAdapter[];
    /** Returns descriptors for all registered formats. */
    getSupportedFormats(): FileFormatDescriptor[];
    /**
     * Detect the best adapter for a given file.
     *
     * Detection strategy:
     *  1. Build a candidate set of adapters whose declared extensions match
     *     the file name extension (case-insensitive).
     *  2. Run probe() on every candidate (and all adapters if no extension
     *     matches) using the first PROBE_HEADER_SIZE characters of the content.
     *  3. Return the adapter with the highest confidence score, provided it
     *     exceeds zero. Returns undefined if no adapter matches.
     *
     * @param fileName - The file name (or path) to inspect.
     * @param content  - The full file content (only the header portion is used for probing).
     * @returns The best-matching adapter, or undefined.
     */
    detect(fileName: string, content: string): FileFormatAdapter | undefined;
    /**
     * Returns all adapters whose declared extensions include the given extension.
     */
    private getAdaptersByExtension;
}
