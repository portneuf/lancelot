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
export declare function tokenizeKlarf(text: string, onProgress?: (fraction: number) => void): KlarfEntry[];
/**
 * Check if a KLARF text is v1.2 format (flat keyword-based)
 * vs v1.8 (hierarchical Record/Field/List).
 */
export declare function detectKlarfVersion(text: string): '1.2' | '1.8';
