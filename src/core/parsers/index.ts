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
export { SinfAdapter } from './sinf';

import { ParserRegistry } from './parser-registry';
import { KlarfAdapter } from './klarf';
import { SinfAdapter } from './sinf';

/** Initialize the registry with all built-in format adapters. */
export function initializeRegistry(): ParserRegistry {
  const registry = ParserRegistry.getInstance();
  try {
    registry.register(new KlarfAdapter());
    registry.register(new SinfAdapter());
  } catch {
    // Already registered (e.g., HMR re-import)
  }
  return registry;
}
