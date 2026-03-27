import { describe, it, expect, beforeEach } from 'vitest';
import { KlarfAdapter } from '@/core/parsers/klarf';
import type { GeneratorConfig } from '../../../scripts/generate-klarf';
import { generateKlarf } from '../../../scripts/generate-klarf';

describe('KLARF Generator', () => {
  let adapter: KlarfAdapter;

  beforeEach(() => {
    adapter = new KlarfAdapter();
  });

  describe('round-trip: generate then parse', () => {
    it('should generate 100 defects and parse them correctly', () => {
      const klarf = generateKlarf({ defectCount: 100, seed: 123 });
      const result = adapter
        .withMeta({ fileName: 'generated.klarf', fileSize: klarf.length })
        .parse(klarf);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const file = result.data;

      // Defect count
      expect(file.defects).toHaveLength(100);

      // Class lookup should have all 8 classes
      expect(file.classLookup).toHaveLength(8);
      expect(file.classLookup[0].className).toBe('Particle');
      expect(file.classLookup[7].className).toBe('Micro-scratch');

      // Every class number on defects should be in the lookup
      const validClasses = new Set(file.classLookup.map((c) => c.classNumber));
      for (const defect of file.defects) {
        expect(validClasses.has(defect.classNumber!)).toBe(true);
      }

      // Geometry should be correct defaults
      expect(file.waferGeometry.waferDiameter).toBe(300000);
      expect(file.waferGeometry.diePitch).toEqual([10000, 12000]);
      expect(file.waferGeometry.dieOrigin).toEqual([500, 600]);

      // DefectRecordSpec should have 11 columns
      expect(file.defectSchema).toHaveLength(11);
      expect(file.defectSchema.map((s) => s.name)).toEqual([
        'DEFECTID', 'XREL', 'YREL', 'XINDEX', 'YINDEX',
        'XSIZE', 'YSIZE', 'DEFECTAREA', 'DSIZE', 'CLASSNUMBER', 'TEST',
      ]);

      // Identity
      expect(file.identity.lotId).toBe('GEN-LOT-001');
      expect(file.identity.waferId).toBe('W01');

      // Summaries
      expect(file.summaries).toHaveLength(1);

      // Test plan should have entries
      expect(file.testPlan.length).toBeGreaterThan(0);

      // Source format
      expect(file.source.formatVersion).toBe('1.2');

      // Die map should exist
      expect(file.dieMap.length).toBeGreaterThan(0);
    });

    it('should generate and parse with custom identity', () => {
      const klarf = generateKlarf({
        defectCount: 10,
        seed: 77,
        lotId: 'CUSTOM-LOT',
        waferId: 'W25',
        deviceId: 'CUSTOM-DEV',
        stepId: 'LITHO2',
        slot: 12,
      });

      const result = adapter
        .withMeta({ fileName: 'custom.klarf', fileSize: klarf.length })
        .parse(klarf);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.identity.lotId).toBe('CUSTOM-LOT');
      expect(result.data.identity.waferId).toBe('W25');
      expect(result.data.identity.deviceId).toBe('CUSTOM-DEV');
      expect(result.data.identity.stepId).toBe('LITHO2');
      expect(result.data.identity.slot).toBe(12);
    });
  });

  describe('edge-heavy distribution: wafer bounds validation', () => {
    it('should place all 1000 defects within wafer bounds', () => {
      const config: Partial<GeneratorConfig> = {
        defectCount: 1000,
        distribution: 'edge-heavy',
        seed: 999,
        waferDiameter: 300000,
        diePitch: [10000, 12000],
        dieOrigin: [500, 600],
      };

      const klarf = generateKlarf(config);
      const result = adapter
        .withMeta({ fileName: 'edge-heavy.klarf', fileSize: klarf.length })
        .parse(klarf);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const file = result.data;
      expect(file.defects).toHaveLength(1000);

      const radius = config.waferDiameter! / 2;
      const cx = radius;
      const cy = radius;

      for (const defect of file.defects) {
        // Absolute position should be within the wafer circle.
        // The defect is placed within a die that fits inside the wafer,
        // so the die center is within the radius. The defect can be at
        // the edge of the die, so allow a margin of one die diagonal.
        const dx = defect.xAbs - cx;
        const dy = defect.yAbs - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Max distance: radius + half-die diagonal (defect within a die whose center is on the wafer)
        const halfDiag = Math.sqrt(
          (config.diePitch![0] / 2) ** 2 + (config.diePitch![1] / 2) ** 2,
        );
        expect(dist).toBeLessThanOrEqual(radius + halfDiag);
      }

      // Edge-heavy should have more defects near the edge than center.
      // Check that at least 60% of defects are in the outer 50% of the radius.
      const outerThreshold = radius * 0.707; // sqrt(0.5) of radius => 50% of area
      let outerCount = 0;
      for (const defect of file.defects) {
        const dx = defect.xAbs - cx;
        const dy = defect.yAbs - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > outerThreshold) outerCount++;
      }
      // Edge-heavy should push more than half to the outer ring
      expect(outerCount / file.defects.length).toBeGreaterThan(0.5);
    });
  });

  describe('deterministic output with seed', () => {
    it('should produce identical output for the same seed', () => {
      const config: Partial<GeneratorConfig> = {
        defectCount: 50,
        distribution: 'random',
        seed: 12345,
      };

      const klarf1 = generateKlarf(config);
      const klarf2 = generateKlarf(config);

      expect(klarf1).toBe(klarf2);
    });

    it('should produce different output for different seeds', () => {
      const klarf1 = generateKlarf({ defectCount: 50, seed: 111 });
      const klarf2 = generateKlarf({ defectCount: 50, seed: 222 });

      expect(klarf1).not.toBe(klarf2);
    });

    it('should produce deterministic output across all distribution modes', () => {
      const modes = ['random', 'edge-heavy', 'clustered', 'mixed'] as const;

      for (const distribution of modes) {
        const a = generateKlarf({ defectCount: 30, seed: 7, distribution });
        const b = generateKlarf({ defectCount: 30, seed: 7, distribution });
        expect(a).toBe(b);
      }
    });
  });

  describe('all distribution modes parse successfully', () => {
    it.each(['random', 'edge-heavy', 'clustered', 'mixed'] as const)(
      'should generate and parse %s distribution',
      (distribution) => {
        const klarf = generateKlarf({
          defectCount: 200,
          distribution,
          seed: 42,
        });

        const result = adapter
          .withMeta({ fileName: `${distribution}.klarf`, fileSize: klarf.length })
          .parse(klarf);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.defects).toHaveLength(200);
        expect(result.data.classLookup).toHaveLength(8);
        expect(result.data.source.formatVersion).toBe('1.2');
      },
    );
  });

  describe('defect data integrity', () => {
    it('should generate positive defect sizes', () => {
      const klarf = generateKlarf({ defectCount: 500, seed: 303 });
      const result = adapter
        .withMeta({ fileName: 'sizes.klarf', fileSize: klarf.length })
        .parse(klarf);

      expect(result.success).toBe(true);
      if (!result.success) return;

      for (const defect of result.data.defects) {
        // XSIZE, YSIZE, DEFECTAREA, DSIZE are in extra since they are not core columns
        const xSize = defect.extra['XSIZE'] as number;
        const ySize = defect.extra['YSIZE'] as number;
        const defectArea = defect.extra['DEFECTAREA'] as number;
        const dSize = defect.size;

        expect(xSize).toBeGreaterThan(0);
        expect(ySize).toBeGreaterThan(0);
        expect(defectArea).toBeGreaterThan(0);
        expect(dSize).toBeGreaterThan(0);
      }
    });

    it('should assign sequential defect IDs starting at 1', () => {
      const klarf = generateKlarf({ defectCount: 50, seed: 808 });
      const result = adapter
        .withMeta({ fileName: 'ids.klarf', fileSize: klarf.length })
        .parse(klarf);

      expect(result.success).toBe(true);
      if (!result.success) return;

      for (let i = 0; i < result.data.defects.length; i++) {
        expect(result.data.defects[i].defectId).toBe(i + 1);
      }
    });
  });
});
