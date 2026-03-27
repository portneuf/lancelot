/**
 * Barrel export for parser interfaces and registry.
 * Also initializes the parser registry with all built-in adapters.
 */

export type {
  ParseProgress,
  ParseError,
  ParseResult,
  FileFormatDescriptor,
  FileFormatAdapter,
} from './parser.interface';

export { ParserRegistry } from './parser-registry';
export { KlarfAdapter } from './klarf';

import { ParserRegistry } from './parser-registry';
import { KlarfAdapter } from './klarf';

/** Initialize the registry with all built-in format adapters. */
export function initializeRegistry(): ParserRegistry {
  const registry = ParserRegistry.getInstance();
  try {
    registry.register(new KlarfAdapter());
  } catch {
    // Already registered (e.g., HMR re-import)
  }
  return registry;
}
