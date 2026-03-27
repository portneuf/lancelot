import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { KlarfAdapter } from '@/core/parsers/klarf';
import { ParserRegistry } from '@/core/parsers/parser-registry';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../../fixtures', name), 'utf-8');
}

describe('KlarfAdapter', () => {
  let adapter: KlarfAdapter;

  beforeEach(() => {
    adapter = new KlarfAdapter();
  });

  describe('probe', () => {
    it('should return high confidence for FileVersion header', () => {
      expect(adapter.probe('FileVersion 1 2;\nLotID "LOT";')).toBe(0.90);
    });

    it('should return 0.95 for v1.8 Record header', () => {
      expect(adapter.probe('Record FileRecord {')).toBe(0.95);
    });

    it('should return 0 for unrelated content', () => {
      expect(adapter.probe('<?xml version="1.0"?>')).toBe(0);
    });

    it('should return 0.80 for content with FileVersion and LotID anywhere', () => {
      expect(adapter.probe('# comment\nFileVersion 1 2;\nLotID "X";')).toBe(0.80);
    });
  });

  describe('parse - minimal file', () => {
    it('should parse a minimal KLARF file', () => {
      const text = readFixture('minimal.klarf');
      const result = adapter.withMeta({ fileName: 'minimal.klarf', fileSize: text.length }).parse(text);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.identity.lotId).toBe('LOT001');
      expect(result.data.identity.waferId).toBe('W01');
      expect(result.data.identity.deviceId).toBe('CHIP_A');
      expect(result.data.waferGeometry.waferDiameter).toBe(300000);
      expect(result.data.waferGeometry.diePitch).toEqual([5000, 5000]);
      expect(result.data.defects).toHaveLength(0);
      expect(result.data.source.formatVersion).toBe('1.2');
    });
  });

  describe('parse - full sample file', () => {
    it('should parse all sections of a v1.2 KLARF file', () => {
      const text = readFixture('sample-v12.klarf');
      const result = adapter.withMeta({ fileName: 'sample-v12.klarf', fileSize: text.length }).parse(text);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const file = result.data;

      // Identity
      expect(file.identity.lotId).toBe('PROD-LOT-42');
      expect(file.identity.waferId).toBe('W03');
      expect(file.identity.deviceId).toBe('ADV-7NM-LOGIC');
      expect(file.identity.slot).toBe(3);
      expect(file.identity.stepId).toBe('ETCH1');

      // Equipment
      expect(file.inspectionSetup.stationId.vendor).toBe('KLA');
      expect(file.inspectionSetup.stationId.model).toBe('2830');
      expect(file.inspectionSetup.setupId).toBe('RECIPE_BRIGHTFIELD_01');

      // Geometry
      expect(file.waferGeometry.waferDiameter).toBe(300000);
      expect(file.waferGeometry.diePitch).toEqual([10000, 12000]);
      expect(file.waferGeometry.dieOrigin).toEqual([500, 600]);
      expect(file.waferGeometry.orientationMarkType).toBe('NOTCH');
      expect(file.waferGeometry.orientationMarkLocation).toBe('DOWN');

      // Defects
      expect(file.defects).toHaveLength(10);
      expect(file.defectSchema).toHaveLength(10);

      // First defect
      const d1 = file.defects[0];
      expect(d1.defectId).toBe(1);
      expect(d1.xRel).toBe(1523);
      expect(d1.yRel).toBe(2210);
      expect(d1.xIndex).toBe(0);
      expect(d1.yIndex).toBe(0);
      expect(d1.classNumber).toBe(1);

      // Absolute coordinates: dieOrigin + xIndex * diePitch + xRel
      expect(d1.xAbs).toBe(500 + 0 * 10000 + 1523); // 2023
      expect(d1.yAbs).toBe(600 + 0 * 12000 + 2210); // 2810

      // Defect at die (1, 0)
      const d2 = file.defects[1];
      expect(d2.xIndex).toBe(1);
      expect(d2.yIndex).toBe(0);
      expect(d2.xAbs).toBe(500 + 1 * 10000 + 9832); // 20332

      // Class lookup
      expect(file.classLookup).toHaveLength(5);
      expect(file.classLookup[0]).toEqual({ classNumber: 1, className: 'Particle', classCode: undefined });
      expect(file.classLookup[1]).toEqual({ classNumber: 2, className: 'Scratch', classCode: undefined });

      // Summaries
      expect(file.summaries).toHaveLength(1);

      // Test plan
      expect(file.testPlan).toHaveLength(3);
      expect(file.testPlan[0]).toEqual({ xIndex: 0, yIndex: 0 });

      // Die map
      expect(file.dieMap.length).toBeGreaterThan(0);
      const die00 = file.dieMap.find((d) => d.xIndex === 0 && d.yIndex === 0);
      expect(die00).toBeDefined();
      expect(die00!.defectCount).toBeGreaterThan(0);
      expect(die00!.status).toBe('tested');
    });

    it('should report progress during parsing', () => {
      const text = readFixture('sample-v12.klarf');
      const progressCalls: number[] = [];

      adapter.withMeta({ fileName: 'sample-v12.klarf', fileSize: text.length })
        .parse(text, (p) => progressCalls.push(p.fraction));

      // Should have at least start and end progress
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toBe(1);
    });
  });

  describe('parse - error handling', () => {
    it('should return error for empty file', () => {
      const result = adapter.withMeta({ fileName: 'empty.klarf', fileSize: 0 }).parse('');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.errors[0].code).toBe('KLARF_MISSING_IDENTITY');
    });

    it('should return error for v1.8 files', () => {
      const result = adapter.parse('Record FileRecord {\n}');
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.errors[0].code).toBe('KLARF_V18_NOT_SUPPORTED');
    });
  });
});

describe('ParserRegistry integration', () => {
  it('should detect KLARF files by extension', () => {
    ParserRegistry.resetInstance();
    const registry = ParserRegistry.getInstance();
    registry.register(new KlarfAdapter());

    const text = readFixture('sample-v12.klarf');
    const adapter = registry.detect('test.klarf', text);

    expect(adapter).toBeDefined();
    expect(adapter!.descriptor.id).toBe('klarf');
  });

  it('should detect KLARF files by content probing', () => {
    ParserRegistry.resetInstance();
    const registry = ParserRegistry.getInstance();
    registry.register(new KlarfAdapter());

    const text = readFixture('sample-v12.klarf');
    const adapter = registry.detect('test.unknown', text);

    expect(adapter).toBeDefined();
    expect(adapter!.descriptor.id).toBe('klarf');
  });
});
