/**
 * Barrel export for parser interfaces and registry.
 * Also initializes the parser registry with all built-in adapters.
 */
export type { ParseProgress, ParseError, ParseResult, FileFormatDescriptor, FileFormatAdapter, } from './parser.interface';
export { ParserRegistry } from './parser-registry';
export { KlarfAdapter } from './klarf';
export { SinfAdapter } from './sinf';
import { ParserRegistry } from './parser-registry';
/** Initialize the registry with all built-in format adapters. */
export declare function initializeRegistry(): ParserRegistry;
