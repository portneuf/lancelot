/**
 * KLARF v1.8 hierarchical parser.
 *
 * Parses the Record/Field/List format with brace-delimited nesting:
 *
 *   Record FileRecord {
 *     Field FileVersion "1.8";
 *     Record LotRecord {
 *       Field LotID "LOT001";
 *       Record WaferRecord {
 *         Field WaferID "W01";
 *         List DefectList {
 *           Columns { DEFECTID XREL YREL XINDEX YINDEX }
 *           Data {
 *             1 1523 2210 0 0
 *             2 9832 4500 1 0
 *           }
 *         }
 *       }
 *     }
 *   }
 */

import type { ParseProgress } from '../parser.interface';
import type { ParseWarning } from '../../models/inspection-file';
import { type RawKlarfData, createEmptyRawKlarfData } from './klarf-types';

export interface V18ParseResult {
  data: RawKlarfData;
  warnings: ParseWarning[];
}

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type TokenType = 'KEYWORD' | 'STRING' | 'NUMBER' | 'LBRACE' | 'RBRACE' | 'SEMICOLON' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  line: number;
}

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  const len = text.length;

  while (pos < len) {
    const ch = text[pos];

    // Newline
    if (ch === '\n') { line++; pos++; continue; }

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r') { pos++; continue; }

    // Comment (# to end of line)
    if (ch === '#') {
      while (pos < len && text[pos] !== '\n') pos++;
      continue;
    }

    // Braces
    if (ch === '{') { tokens.push({ type: 'LBRACE', value: '{', line }); pos++; continue; }
    if (ch === '}') { tokens.push({ type: 'RBRACE', value: '}', line }); pos++; continue; }

    // Semicolon
    if (ch === ';') { tokens.push({ type: 'SEMICOLON', value: ';', line }); pos++; continue; }

    // Quoted string
    if (ch === '"') {
      pos++;
      let str = '';
      while (pos < len && text[pos] !== '"') {
        if (text[pos] === '\n') line++;
        str += text[pos];
        pos++;
      }
      if (pos < len) pos++; // skip closing quote
      tokens.push({ type: 'STRING', value: str, line });
      continue;
    }

    // Number or keyword
    let word = '';
    while (pos < len && !isDelimiter(text[pos])) {
      word += text[pos];
      pos++;
    }

    if (word.length > 0) {
      const num = Number(word);
      if (!isNaN(num) && word !== '') {
        tokens.push({ type: 'NUMBER', value: word, line });
      } else {
        tokens.push({ type: 'KEYWORD', value: word, line });
      }
    }
  }

  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

function isDelimiter(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' ||
         ch === '{' || ch === '}' || ch === ';' || ch === '"' || ch === '#';
}

// ---------------------------------------------------------------------------
// Recursive descent parser
// ---------------------------------------------------------------------------

class V18Parser {
  private tokens: Token[];
  private pos = 0;
  private data: RawKlarfData;
  private warnings: ParseWarning[] = [];
  private onProgress?: (progress: ParseProgress) => void;

  constructor(tokens: Token[], onProgress?: (progress: ParseProgress) => void) {
    this.tokens = tokens;
    this.data = createEmptyRawKlarfData();
    this.onProgress = onProgress;
  }

  parse(): V18ParseResult {
    this.onProgress?.({ fraction: 0, phase: 'Parsing v1.8 structure' });

    while (!this.isAtEnd()) {
      const tok = this.peek();
      if (tok.type === 'KEYWORD' && tok.value === 'Record') {
        this.parseRecord();
      } else {
        this.advance(); // skip unexpected tokens
      }
    }

    this.onProgress?.({ fraction: 1, phase: 'Done' });
    return { data: this.data, warnings: this.warnings };
  }

  private parseRecord(): void {
    this.expect('KEYWORD', 'Record');
    const recordType = this.advance(); // e.g. FileRecord, LotRecord, WaferRecord
    this.expect('LBRACE');

    const type = recordType.value;

    while (!this.isAtEnd() && this.peek().type !== 'RBRACE') {
      const tok = this.peek();

      if (tok.type === 'KEYWORD' && tok.value === 'Record') {
        this.parseRecord(); // recurse
      } else if (tok.type === 'KEYWORD' && tok.value === 'Field') {
        this.parseField(type);
      } else if (tok.type === 'KEYWORD' && tok.value === 'List') {
        this.parseList(type);
      } else {
        this.advance(); // skip
      }
    }

    this.expect('RBRACE');
  }

  private parseField(_recordContext: string): void {
    this.expect('KEYWORD', 'Field');
    const fieldName = this.advance().value;
    const values: string[] = [];

    while (!this.isAtEnd() && this.peek().type !== 'SEMICOLON' && this.peek().type !== 'RBRACE') {
      values.push(this.advance().value);
    }

    if (this.peek().type === 'SEMICOLON') this.advance();

    this.applyField(_recordContext, fieldName, values);
  }

  private parseList(_recordContext: string): void {
    this.expect('KEYWORD', 'List');
    const listName = this.advance().value;
    this.expect('LBRACE');

    let columns: string[] = [];
    const rows: number[][] = [];

    while (!this.isAtEnd() && this.peek().type !== 'RBRACE') {
      const tok = this.peek();

      if (tok.type === 'KEYWORD' && tok.value === 'Columns') {
        this.advance(); // skip 'Columns'
        this.expect('LBRACE');
        while (!this.isAtEnd() && this.peek().type !== 'RBRACE') {
          columns.push(this.advance().value.toUpperCase());
        }
        this.expect('RBRACE');
      } else if (tok.type === 'KEYWORD' && tok.value === 'Data') {
        this.advance(); // skip 'Data'
        this.expect('LBRACE');
        // Read all numeric values, then split into rows by column count
        const colCount = columns.length || 1;
        let row: number[] = [];
        while (!this.isAtEnd() && this.peek().type !== 'RBRACE') {
          const t = this.advance();
          if (t.type === 'NUMBER') {
            row.push(Number(t.value));
          } else if (t.type === 'KEYWORD') {
            // Keywords in data blocks are likely numeric values parsed as words
            const num = Number(t.value);
            if (!isNaN(num)) {
              row.push(num);
            }
          } else if (t.type === 'STRING') {
            row.push(0);
          } else if (t.type === 'SEMICOLON') {
            // Explicit row separator
            if (row.length > 0) {
              rows.push(row);
              row = [];
            }
            continue;
          }

          // Split row when we have enough columns
          if (row.length >= colCount) {
            rows.push(row.slice(0, colCount));
            row = row.slice(colCount);
          }

          if (this.onProgress && rows.length % 10000 === 0 && rows.length > 0) {
            this.onProgress({
              fraction: this.pos / this.tokens.length,
              phase: `Reading ${listName}`,
              itemCount: rows.length,
            });
          }
        }
        if (row.length > 0) rows.push(row);
        this.expect('RBRACE');
      } else {
        this.advance(); // skip
      }
    }

    this.expect('RBRACE');

    this.applyList(listName, columns, rows);
  }

  private applyField(_recordContext: string, fieldName: string, values: string[]): void {
    const val = (i: number) => values[i] ?? '';
    const num = (i: number) => parseFloat(values[i]) || 0;

    switch (fieldName) {
      case 'FileVersion':
        this.data.fileVersion = [parseInt(val(0)) || 1, parseInt(val(1)) || 8];
        break;
      case 'FileTimestamp':
        this.data.fileTimestamp = values.join(' ');
        break;
      case 'ResultTimestamp':
        this.data.resultTimestamp = values.join(' ');
        break;
      case 'InspectionStationID':
        this.data.stationVendor = val(0);
        this.data.stationModel = val(1);
        this.data.stationEquipmentId = val(2);
        break;
      case 'SampleType':
        this.data.sampleType = val(0);
        break;
      case 'LotID':
        this.data.lotId = val(0);
        break;
      case 'DeviceID':
        this.data.deviceId = val(0);
        break;
      case 'SetupID':
        this.data.setupId = val(0);
        break;
      case 'StepID':
        this.data.stepId = val(0);
        break;
      case 'WaferID':
        this.data.waferId = val(0);
        break;
      case 'Slot':
        this.data.slot = parseInt(val(0));
        break;
      case 'SampleSize':
        this.data.sampleSize = [num(0), num(1)];
        break;
      case 'DiePitch':
        this.data.diePitch = [num(0), num(1)];
        break;
      case 'DieOrigin':
        this.data.dieOrigin = [num(0), num(1)];
        break;
      case 'SampleCenterLocation':
        this.data.sampleCenterLocation = [num(0), num(1)];
        break;
      case 'SampleOrientationMarkType':
        this.data.orientationMarkType = val(0);
        break;
      case 'OrientationMarkLocation':
        this.data.orientationMarkLocation = val(0);
        break;
      case 'AreaPerTest':
        this.data.areaPerTest = num(0);
        break;
      default:
        // Unknown field - skip silently for v1.8
        break;
    }
  }

  private applyList(listName: string, columns: string[], rows: number[][]): void {
    switch (listName) {
      case 'DefectList':
        this.data.defectRecordSpec = columns;
        this.data.defectRecordCount = rows.length;
        this.data.defects = rows;
        break;
      case 'SummaryList':
        this.data.summarySpec = columns;
        this.data.summaryRecordCount = rows.length;
        this.data.summaries = rows;
        break;
      case 'ClassLookup':
        // ClassLookup in v1.8 has columns like CLASSNUMBER, CLASSNAME
        for (const row of rows) {
          const classNumber = row[0] ?? 0;
          this.data.classLookup.push({
            classNumber,
            className: `Class ${classNumber}`,
          });
        }
        break;
      case 'SampleTestPlan':
        for (const row of rows) {
          if (row.length >= 2) {
            this.data.testPlan.push([row[0], row[1]]);
          }
        }
        break;
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Token helpers
  // -------------------------------------------------------------------------

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF' as const, value: '', line: 0 };
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok ?? { type: 'EOF' as const, value: '', line: 0 };
  }

  private expect(type: TokenType, value?: string): Token {
    const tok = this.advance();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      this.warnings.push({
        code: 'KLARF_V18_UNEXPECTED_TOKEN',
        message: `Expected ${type}${value ? ` "${value}"` : ''} but got ${tok.type} "${tok.value}" at line ${tok.line}`,
        line: tok.line,
        severity: 'warning',
      });
    }
    return tok;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.tokens[this.pos].type === 'EOF';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse KLARF v1.8 text into RawKlarfData.
 */
export function parseKlarfV18(
  text: string,
  onProgress?: (progress: ParseProgress) => void,
): V18ParseResult {
  onProgress?.({ fraction: 0, phase: 'Tokenizing v1.8' });
  const tokens = tokenize(text);
  onProgress?.({ fraction: 0.2, phase: 'Parsing v1.8 structure' });
  const parser = new V18Parser(tokens, onProgress);
  return parser.parse();
}
