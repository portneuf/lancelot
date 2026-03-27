/**
 * KLARF v1.2 flat-format parser.
 *
 * Parses the semicolon-delimited keyword/value format into RawKlarfData.
 * Each entry is `Keyword value1 value2 ...;`
 *
 * Multi-row sections (DefectList, SummaryList, ClassLookup, etc.) are
 * handled by consuming subsequent entries that are purely numeric or
 * data rows belonging to the list.
 */

import type { ParseProgress } from '../parser.interface';
import type { ParseWarning } from '../../models/inspection-file';
import { type KlarfEntry, tokenizeKlarf } from './klarf-tokenizer';
import { type RawKlarfData, createEmptyRawKlarfData } from './klarf-types';

export interface V12ParseResult {
  data: RawKlarfData;
  warnings: ParseWarning[];
}

/**
 * Parse KLARF v1.2 text into RawKlarfData.
 */
export function parseKlarfV12(
  text: string,
  onProgress?: (progress: ParseProgress) => void,
): V12ParseResult {
  const warnings: ParseWarning[] = [];
  const data = createEmptyRawKlarfData();

  onProgress?.({ fraction: 0, phase: 'Tokenizing' });
  const entries = tokenizeKlarf(text, (f) =>
    onProgress?.({ fraction: f * 0.3, phase: 'Tokenizing' }),
  );

  onProgress?.({ fraction: 0.3, phase: 'Parsing entries' });
  const totalEntries = entries.length;

  let i = 0;
  while (i < totalEntries) {
    const entry = entries[i];
    const kw = entry.keyword;

    try {
      switch (kw) {
        case 'FileVersion':
          data.fileVersion = [
            parseInt(entry.tokens[0], 10) || 1,
            parseInt(entry.tokens[1], 10) || 2,
          ];
          break;

        case 'FileTimestamp':
          data.fileTimestamp = entry.tokens.join(' ');
          break;

        case 'ResultTimestamp':
          data.resultTimestamp = entry.tokens.join(' ');
          break;

        case 'InspectionStationID':
          data.stationVendor = unquote(entry.tokens[0]);
          data.stationModel = unquote(entry.tokens[1]);
          data.stationEquipmentId = unquote(entry.tokens[2]);
          break;

        case 'SampleType':
          data.sampleType = unquote(entry.tokens[0]);
          break;

        case 'LotID':
          data.lotId = unquote(entry.tokens[0]);
          break;

        case 'DeviceID':
          data.deviceId = unquote(entry.tokens[0]);
          break;

        case 'SetupID':
          data.setupId = unquote(entry.tokens[0]);
          break;

        case 'StepID':
          data.stepId = unquote(entry.tokens[0]);
          break;

        case 'WaferID':
          data.waferId = unquote(entry.tokens[0]);
          break;

        case 'Slot':
          data.slot = parseInt(entry.tokens[0], 10);
          break;

        case 'SampleSize':
          data.sampleSize = [
            parseFloat(entry.tokens[0]),
            parseFloat(entry.tokens[1]),
          ];
          break;

        case 'DiePitch':
          data.diePitch = [
            parseFloat(entry.tokens[0]),
            parseFloat(entry.tokens[1]),
          ];
          break;

        case 'DieOrigin':
          data.dieOrigin = [
            parseFloat(entry.tokens[0]),
            parseFloat(entry.tokens[1]),
          ];
          break;

        case 'SampleCenterLocation':
          data.sampleCenterLocation = [
            parseFloat(entry.tokens[0]),
            parseFloat(entry.tokens[1]),
          ];
          break;

        case 'SampleOrientationMarkType':
          data.orientationMarkType = unquote(entry.tokens[0]);
          break;

        case 'OrientationMarkLocation':
          data.orientationMarkLocation = unquote(entry.tokens[0]);
          break;

        case 'AreaPerTest':
          data.areaPerTest = parseFloat(entry.tokens[0]);
          break;

        case 'DefectRecordSpec': {
          // DefectRecordSpec count COL1 COL2 ...;
          const count = parseInt(entry.tokens[0], 10);
          data.defectRecordCount = count;
          data.defectRecordSpec = entry.tokens.slice(1).map((t) => t.toUpperCase());
          break;
        }

        case 'DefectList': {
          // DefectList may have an inline count, then subsequent entries are data rows
          i = parseDefectList(entries, i, data, onProgress, totalEntries);
          continue; // parseDefectList advances i
        }

        case 'SummarySpec': {
          const count = parseInt(entry.tokens[0], 10);
          data.summaryRecordCount = count;
          data.summarySpec = entry.tokens.slice(1).map((t) => t.toUpperCase());
          break;
        }

        case 'SummaryList': {
          i = parseSummaryList(entries, i, data);
          continue;
        }

        case 'ClassLookup': {
          i = parseClassLookup(entries, i, data);
          continue;
        }

        case 'SampleTestPlan': {
          i = parseTestPlan(entries, i, data);
          continue;
        }

        case 'EndOfFile':
          // Stop processing
          i = totalEntries;
          continue;

        default:
          // Unknown keyword - skip with warning
          if (kw && !kw.startsWith('#')) {
            warnings.push({
              code: 'KLARF_UNKNOWN_KEYWORD',
              message: `Unknown keyword: ${kw}`,
              line: entry.line,
              severity: 'warning',
            });
          }
          break;
      }
    } catch (err) {
      warnings.push({
        code: 'KLARF_PARSE_ENTRY_ERROR',
        message: `Error parsing ${kw} at line ${entry.line}: ${err instanceof Error ? err.message : String(err)}`,
        line: entry.line,
        severity: 'warning',
      });
    }

    i++;

    // Progress reporting
    if (onProgress && i % 2000 === 0) {
      onProgress({
        fraction: 0.3 + (i / totalEntries) * 0.7,
        phase: 'Parsing entries',
        itemCount: i,
      });
    }
  }

  onProgress?.({ fraction: 1, phase: 'Done' });
  return { data, warnings };
}

/**
 * Parse the DefectList section.
 *
 * The DefectList keyword entry may contain inline data tokens (when the
 * first defect row appears on the same line without a separating semicolon).
 * Subsequent entries are numeric data rows until we hit a recognized keyword.
 */
function parseDefectList(
  entries: KlarfEntry[],
  startIndex: number,
  data: RawKlarfData,
  onProgress: ((progress: ParseProgress) => void) | undefined,
  totalEntries: number,
): number {
  const colCount = data.defectRecordSpec.length;
  const defectListEntry = entries[startIndex];

  // Check if the DefectList entry itself contains inline defect data
  // (happens when there's no semicolon between "DefectList" and the first row)
  if (defectListEntry.tokens.length >= colCount) {
    const row = defectListEntry.tokens.map(parseNumericToken);
    data.defects.push(row.slice(0, colCount));
  }

  let i = startIndex + 1;

  while (i < totalEntries) {
    const entry = entries[i];
    // If entry starts with a known keyword, we've left the defect list
    if (isKnownKeyword(entry.keyword)) break;

    // Parse the row: keyword + tokens form the data values
    const allTokens = [entry.keyword, ...entry.tokens];
    const row = allTokens.map(parseNumericToken);

    // Only add if we have enough columns
    if (row.length >= colCount) {
      data.defects.push(row.slice(0, colCount));
    } else if (row.length > 0) {
      // Pad with zeros for short rows
      while (row.length < colCount) row.push(0);
      data.defects.push(row);
    }

    i++;

    if (onProgress && data.defects.length % 10000 === 0) {
      onProgress({
        fraction: 0.3 + (i / totalEntries) * 0.7,
        phase: 'Reading defects',
        itemCount: data.defects.length,
      });
    }
  }

  return i; // caller should NOT increment
}

/**
 * Parse the SummaryList section.
 */
function parseSummaryList(
  entries: KlarfEntry[],
  startIndex: number,
  data: RawKlarfData,
): number {
  const colCount = data.summarySpec.length;
  const summaryListEntry = entries[startIndex];

  // Check if inline data tokens exist on the SummaryList entry
  if (summaryListEntry.tokens.length >= colCount) {
    const row = summaryListEntry.tokens.map(parseNumericToken);
    data.summaries.push(row.slice(0, colCount));
  }

  let i = startIndex + 1;

  while (i < entries.length) {
    const entry = entries[i];
    if (isKnownKeyword(entry.keyword)) break;

    const allTokens = [entry.keyword, ...entry.tokens];
    const row = allTokens.map(parseNumericToken);
    if (row.length >= colCount) {
      data.summaries.push(row.slice(0, colCount));
    }

    i++;
  }

  return i;
}

/**
 * Parse the ClassLookup section.
 *
 * Format: ClassLookup count; then entries like: classNumber "ClassName" ["code"];
 */
function parseClassLookup(
  entries: KlarfEntry[],
  startIndex: number,
  data: RawKlarfData,
): number {
  // The ClassLookup entry itself may contain the count
  let i = startIndex + 1;

  while (i < entries.length) {
    const entry = entries[i];
    if (isKnownKeyword(entry.keyword)) break;

    // Each class entry: number "name" [optional "code"]
    const classNumber = parseInt(entry.keyword, 10);
    if (!isNaN(classNumber)) {
      const className = unquote(entry.tokens[0] ?? `Class ${classNumber}`);
      const classCode = entry.tokens[1] ? unquote(entry.tokens[1]) : undefined;
      data.classLookup.push({ classNumber, className, classCode });
    }

    i++;
  }

  return i;
}

/**
 * Parse the SampleTestPlan section.
 */
function parseTestPlan(
  entries: KlarfEntry[],
  startIndex: number,
  data: RawKlarfData,
): number {
  let i = startIndex + 1;

  while (i < entries.length) {
    const entry = entries[i];
    if (isKnownKeyword(entry.keyword)) break;

    const x = parseInt(entry.keyword, 10);
    const y = parseInt(entry.tokens[0], 10);
    if (!isNaN(x) && !isNaN(y)) {
      data.testPlan.push([x, y]);
    }

    i++;
  }

  return i;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KNOWN_KEYWORDS = new Set([
  'FileVersion', 'FileTimestamp', 'InspectionStationID', 'SampleType',
  'ResultTimestamp', 'LotID', 'SampleSize', 'DeviceID', 'SetupID',
  'StepID', 'WaferID', 'Slot', 'SampleOrientationMarkType',
  'OrientationMarkLocation', 'DiePitch', 'DieOrigin',
  'SampleCenterLocation', 'DefectRecordSpec', 'DefectList',
  'SummarySpec', 'SummaryList', 'ClassLookup',
  'ClusterClassificationList', 'SampleTestPlan', 'AreaPerTest',
  'EndOfFile',
]);

function isKnownKeyword(token: string): boolean {
  return KNOWN_KEYWORDS.has(token);
}

function unquote(s: string | undefined): string {
  if (!s) return '';
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

function parseNumericToken(s: string): number {
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
