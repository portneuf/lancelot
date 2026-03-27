import { describe, it, expect } from 'vitest';
import { tokenizeKlarf, detectKlarfVersion } from '@/core/parsers/klarf/klarf-tokenizer';

describe('klarf-tokenizer', () => {
  describe('tokenizeKlarf', () => {
    it('should tokenize simple keyword/value entries', () => {
      const text = 'FileVersion 1 2;\nLotID "LOT001";';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(2);
      expect(entries[0].keyword).toBe('FileVersion');
      expect(entries[0].tokens).toEqual(['1', '2']);
      expect(entries[1].keyword).toBe('LotID');
      expect(entries[1].tokens).toEqual(['LOT001']);
    });

    it('should handle quoted strings with spaces', () => {
      const text = 'InspectionStationID "KLA Tencor" "2830" "EQ 001";';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(1);
      expect(entries[0].tokens).toEqual(['KLA Tencor', '2830', 'EQ 001']);
    });

    it('should handle multi-line entries', () => {
      const text = 'DefectRecordSpec 3\n  DEFECTID XREL YREL;';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(1);
      expect(entries[0].keyword).toBe('DefectRecordSpec');
      expect(entries[0].tokens).toEqual(['3', 'DEFECTID', 'XREL', 'YREL']);
    });

    it('should track line numbers', () => {
      const text = 'FileVersion 1 2;\n\nLotID "LOT001";\nWaferID "W01";';
      const entries = tokenizeKlarf(text);

      expect(entries[0].line).toBe(1);
      expect(entries[1].line).toBe(3); // LotID is on line 3 (after blank line)
      expect(entries[2].line).toBe(4); // WaferID on line 4
    });

    it('should handle empty entries', () => {
      const text = ';;FileVersion 1 2;;';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(1);
      expect(entries[0].keyword).toBe('FileVersion');
    });

    it('should handle DefectList data rows', () => {
      // Without semicolon after DefectList, first row merges into the entry
      const text = 'DefectList\n1 100 200 3 5;\n2 300 400 7 2;';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(2);
      // "DefectList" and first row are one entry (no semicolon between them)
      expect(entries[0].keyword).toBe('DefectList');
      expect(entries[0].tokens).toEqual(['1', '100', '200', '3', '5']);
      expect(entries[1].keyword).toBe('2');
      expect(entries[1].tokens).toEqual(['300', '400', '7', '2']);
    });

    it('should handle DefectList with semicolons after keyword', () => {
      // With semicolon after DefectList, it's separate entries
      const text = 'DefectList;\n1 100 200 3 5;\n2 300 400 7 2;';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(3);
      expect(entries[0].keyword).toBe('DefectList');
      expect(entries[0].tokens).toEqual([]);
      expect(entries[1].keyword).toBe('1');
    });

    it('should handle file without trailing semicolon', () => {
      const text = 'FileVersion 1 2;\nEndOfFile';
      const entries = tokenizeKlarf(text);

      expect(entries).toHaveLength(2);
      expect(entries[1].keyword).toBe('EndOfFile');
    });
  });

  describe('detectKlarfVersion', () => {
    it('should detect v1.2 format', () => {
      expect(detectKlarfVersion('FileVersion 1 2;\nLotID "LOT001";')).toBe('1.2');
    });

    it('should detect v1.8 format', () => {
      expect(detectKlarfVersion('Record FileRecord {\n  Field Version 1.8;\n}')).toBe('1.8');
    });

    it('should default to v1.2 for unknown content', () => {
      expect(detectKlarfVersion('some random text')).toBe('1.2');
    });
  });
});
