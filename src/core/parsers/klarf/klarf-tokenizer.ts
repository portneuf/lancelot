/**
 * KLARF v1.2 tokenizer.
 *
 * Splits KLARF text into logical entries delimited by semicolons.
 * Handles:
 *  - Quoted strings ("value with spaces")
 *  - Multi-line entries (e.g., DefectList spans many lines)
 *  - Line number tracking for error reporting
 *  - Whitespace normalization
 */

export interface KlarfEntry {
  /** The keyword that starts this entry (e.g., "FileVersion", "DefectList"). */
  keyword: string;
  /** The remaining tokens after the keyword (split on whitespace). */
  tokens: string[];
  /** Line number where this entry starts (1-based). */
  line: number;
}

/**
 * Tokenize a KLARF v1.2 file into a sequence of entries.
 *
 * Each entry corresponds to one semicolon-delimited statement.
 * The entry's keyword is the first token, and the remaining tokens
 * are the values associated with that keyword.
 *
 * @param text - The complete KLARF file content.
 * @param onProgress - Optional callback for progress reporting.
 * @returns Array of parsed entries.
 */
export function tokenizeKlarf(
  text: string,
  onProgress?: (fraction: number) => void,
): KlarfEntry[] {
  const entries: KlarfEntry[] = [];
  const len = text.length;

  let pos = 0;
  let lineNumber = 1;
  let entryLineStart = 1;

  // Accumulates characters for the current entry
  let buffer = '';
  let bufferEmpty = true;
  let inQuote = false;

  while (pos < len) {
    const ch = text[pos];

    if (ch === '\n') {
      lineNumber++;
    }

    if (inQuote) {
      buffer += ch;
      if (ch === '"') {
        inQuote = false;
      }
      pos++;
      continue;
    }

    if (ch === '"') {
      inQuote = true;
      if (bufferEmpty) {
        entryLineStart = lineNumber;
        bufferEmpty = false;
      }
      buffer += ch;
      pos++;
      continue;
    }

    if (ch === ';') {
      // End of entry - parse the buffer
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        const entry = parseEntryBuffer(trimmed, entryLineStart);
        if (entry) {
          entries.push(entry);
        }
      }
      buffer = '';
      bufferEmpty = true;
      pos++;

      // Report progress periodically
      if (onProgress && entries.length % 5000 === 0) {
        onProgress(pos / len);
      }
      continue;
    }

    // Track line number of first content character for this entry
    if (bufferEmpty && !isWhitespace(ch)) {
      entryLineStart = lineNumber;
      bufferEmpty = false;
    }

    buffer += ch;
    pos++;
  }

  // Handle any remaining content (some files may lack final semicolon)
  const remaining = buffer.trim();
  if (remaining.length > 0) {
    const entry = parseEntryBuffer(remaining, entryLineStart);
    if (entry) {
      entries.push(entry);
    }
  }

  if (onProgress) {
    onProgress(1);
  }

  return entries;
}

/**
 * Parse a raw entry buffer (text between semicolons) into a KlarfEntry.
 *
 * Splits on whitespace while preserving quoted strings as single tokens.
 */
function parseEntryBuffer(buffer: string, line: number): KlarfEntry | null {
  const tokens = splitTokens(buffer);
  if (tokens.length === 0) return null;

  return {
    keyword: tokens[0],
    tokens: tokens.slice(1),
    line,
  };
}

/**
 * Split a string into tokens on whitespace, preserving quoted strings.
 *
 * "LotID \"ABC 123\"" -> ["LotID", "ABC 123"]
 */
function splitTokens(input: string): string[] {
  const tokens: string[] = [];
  const len = input.length;
  let i = 0;

  while (i < len) {
    // Skip whitespace
    while (i < len && isWhitespace(input[i])) i++;
    if (i >= len) break;

    if (input[i] === '"') {
      // Quoted token - read until closing quote
      i++; // skip opening quote
      let token = '';
      while (i < len && input[i] !== '"') {
        token += input[i];
        i++;
      }
      if (i < len) i++; // skip closing quote
      tokens.push(token);
    } else {
      // Unquoted token - read until whitespace
      let token = '';
      while (i < len && !isWhitespace(input[i])) {
        token += input[i];
        i++;
      }
      tokens.push(token);
    }
  }

  return tokens;
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Check if a KLARF text is v1.2 format (flat keyword-based)
 * vs v1.8 (hierarchical Record/Field/List).
 */
export function detectKlarfVersion(text: string): '1.2' | '1.8' {
  const header = text.trimStart().slice(0, 500);
  if (header.startsWith('Record FileRecord') || header.startsWith('Record ')) {
    return '1.8';
  }
  return '1.2';
}
