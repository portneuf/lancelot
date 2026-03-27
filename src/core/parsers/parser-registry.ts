/**
 * Singleton registry for file format adapters.
 *
 * The ParserRegistry manages a collection of FileFormatAdapters and
 * provides detection logic that combines file extension matching with
 * content-based probing to select the best adapter for a given file.
 */

import type {
  FileFormatAdapter,
  FileFormatDescriptor,
} from './parser.interface';

/** Number of characters from the file start passed to probe(). */
const PROBE_HEADER_SIZE = 4096;

export class ParserRegistry {
  private static instance: ParserRegistry | null = null;
  private readonly adapters: Map<string, FileFormatAdapter> = new Map();

  /** Use ParserRegistry.getInstance() instead. */
  private constructor() {}

  /** Returns the singleton ParserRegistry instance. */
  static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry();
    }
    return ParserRegistry.instance;
  }

  /**
   * Reset the singleton (primarily for testing).
   * After calling this, getInstance() will create a fresh registry.
   */
  static resetInstance(): void {
    ParserRegistry.instance = null;
  }

  /**
   * Register a file format adapter.
   *
   * @param adapter - The adapter to register.
   * @throws Error if an adapter with the same format id is already registered.
   */
  register(adapter: FileFormatAdapter): void {
    const id = adapter.descriptor.id;
    if (this.adapters.has(id)) {
      throw new Error(
        `ParserRegistry: adapter with id "${id}" is already registered.`,
      );
    }
    this.adapters.set(id, adapter);
  }

  /**
   * Retrieve a registered adapter by its format id.
   *
   * @param id - The format id (e.g. "klarf").
   * @returns The adapter, or undefined if not registered.
   */
  getAdapter(id: string): FileFormatAdapter | undefined {
    return this.adapters.get(id);
  }

  /** Returns all registered adapters. */
  getAllAdapters(): FileFormatAdapter[] {
    return [...this.adapters.values()];
  }

  /** Returns descriptors for all registered formats. */
  getSupportedFormats(): FileFormatDescriptor[] {
    return this.getAllAdapters().map((a) => a.descriptor);
  }

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
  detect(
    fileName: string,
    content: string,
  ): FileFormatAdapter | undefined {
    const extension = extractExtension(fileName);
    const header = content.slice(0, PROBE_HEADER_SIZE);

    // Phase 1: try extension-matched adapters first
    const extensionCandidates = this.getAdaptersByExtension(extension);

    if (extensionCandidates.length > 0) {
      const best = pickBestByProbe(extensionCandidates, header);
      if (best) return best;
    }

    // Phase 2: fall back to probing all adapters
    return pickBestByProbe(this.getAllAdapters(), header);
  }

  /**
   * Returns all adapters whose declared extensions include the given extension.
   */
  private getAdaptersByExtension(
    extension: string | null,
  ): FileFormatAdapter[] {
    if (!extension) return [];
    const ext = extension.toLowerCase();
    return this.getAllAdapters().filter((adapter) =>
      adapter.descriptor.extensions.some((e) => e.toLowerCase() === ext),
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the file extension without the leading dot.
 * Returns null if the file name has no extension.
 */
function extractExtension(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) return null;
  // Handle paths: strip directory separators first
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
  const dotIndex = baseName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === baseName.length - 1) return null;
  return baseName.slice(dotIndex + 1);
}

/**
 * Run probe() on each candidate and return the one with the highest
 * confidence score above zero. Returns undefined if none match.
 */
function pickBestByProbe(
  candidates: FileFormatAdapter[],
  header: string,
): FileFormatAdapter | undefined {
  let bestAdapter: FileFormatAdapter | undefined;
  let bestScore = 0;

  for (const adapter of candidates) {
    const score = adapter.probe(header);
    if (score > bestScore) {
      bestScore = score;
      bestAdapter = adapter;
    }
  }

  return bestAdapter;
}
