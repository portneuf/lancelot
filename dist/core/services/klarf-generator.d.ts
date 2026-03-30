/**
 * Browser-friendly KLARF generator.
 *
 * Self-contained copy of the generation logic without Node/CLI dependencies.
 * Used by the in-app generator dialog.
 */
export type DistributionMode = 'random' | 'edge-heavy' | 'clustered' | 'mixed';
export interface GeneratorConfig {
    defectCount: number;
    distribution: DistributionMode;
    waferDiameter: number;
    diePitch: [number, number];
    dieOrigin: [number, number];
    lotId: string;
    waferId: string;
    deviceId: string;
    stepId: string;
    slot: number;
    seed: number;
}
export declare function generateKlarf(partial?: Partial<GeneratorConfig>): string;
