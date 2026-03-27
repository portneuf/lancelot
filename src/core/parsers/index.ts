/**
 * Barrel export for parser interfaces and registry.
 */

export type {
  ParseProgress,
  ParseError,
  ParseResult,
  FileFormatDescriptor,
  FileFormatAdapter,
} from './parser.interface';

export { ParserRegistry } from './parser-registry';
