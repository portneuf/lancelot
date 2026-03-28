import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SinfAdapter } from '@/core/parsers/sinf';
import { ParserRegistry } from '@/core/parsers/parser-registry';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../../fixtures', name), 'utf-8');
}

describe('SinfAdapter', () => {
  let adapter: SinfAdapter;

  beforeEach(() => {
    adapter = new SinfAdapter();
  });

  describe('probe', () => {
    it('should return high confidence for SINF content', () => {
      expect(adapter.probe('DEVICE:TEST\nROWCT:10')).toBe(0.90);
    });

    it('should return 0 for unrelated content', () => {
      expect(adapter.probe('FileVersion 1 2;')).toBe(0);
    });
  });

  describe('parse', () => {
    it('should parse a SINF wafer map file', () => {
      const text = readFixture('sample.sinf');
      const result = adapter.parse(text);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const file = result.data;

      // Identity
      expect(file.identity.lotId).toBe('SINF-LOT-01');
      expect(file.identity.waferId).toBe('W01');
      expect(file.identity.deviceId).toBe('TEST-CHIP-A');

      // Format
      expect(file.source.formatId).toBe('sinf');

      // No defects (SINF is die-level only)
      expect(file.defects).toHaveLength(0);

      // Die map should have entries
      expect(file.dieMap.length).toBeGreaterThan(0);

      // Check die statuses
      const tested = file.dieMap.filter((d) => d.status === 'tested');
      const failed = file.dieMap.filter((d) => d.status === 'failed');
      const reference = file.dieMap.filter((d) => d.status === 'reference');

      // Bin 01, 02 are good (BCEQU), 03 is bad, FF is reference
      expect(tested.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
      expect(reference.length).toBe(1); // FF die

      // Geometry
      expect(file.waferGeometry.diePitch).toEqual([8000, 8000]);

      // Class lookup should contain bin codes
      expect(file.classLookup.length).toBeGreaterThan(0);
    });
  });
});

describe('ParserRegistry with SINF', () => {
  it('should detect SINF files by extension', () => {
    ParserRegistry.resetInstance();
    const registry = ParserRegistry.getInstance();
    registry.register(new SinfAdapter());

    const text = readFixture('sample.sinf');
    const adapter = registry.detect('test.sinf', text);

    expect(adapter).toBeDefined();
    expect(adapter!.descriptor.id).toBe('sinf');
  });
});
