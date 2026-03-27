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

const DEFAULT_CONFIG: GeneratorConfig = {
  defectCount: 100, distribution: 'random', waferDiameter: 300000,
  diePitch: [10000, 12000], dieOrigin: [500, 600],
  lotId: 'GEN-LOT-001', waferId: 'W01', deviceId: 'TEST-DEVICE',
  stepId: 'ETCH1', slot: 1, seed: 42,
};

const CLASS_NAMES = ['Particle','Scratch','Pit','Stain','Pattern Defect','COP','Residue','Micro-scratch'] as const;

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function gaussianRandom(rand: () => number): number {
  let u: number; do { u = rand(); } while (u === 0);
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * rand());
}

function logNormalRandom(rand: () => number, median: number, sigma: number): number {
  return Math.exp(Math.log(median) + sigma * gaussianRandom(rand));
}

interface DieInfo { xIndex: number; yIndex: number }
interface Placement { xIndex: number; yIndex: number; xRel: number; yRel: number }

function computeDieGrid(config: GeneratorConfig): DieInfo[] {
  const radius = config.waferDiameter / 2;
  const [dpx, dpy] = config.diePitch;
  const [ox, oy] = config.dieOrigin;
  const dies: DieInfo[] = [];
  for (let yi = Math.floor(-oy / dpy); yi <= Math.ceil((config.waferDiameter - oy) / dpy); yi++) {
    for (let xi = Math.floor(-ox / dpx); xi <= Math.ceil((config.waferDiameter - ox) / dpx); xi++) {
      const dx = ox + xi * dpx + dpx / 2 - radius, dy = oy + yi * dpy + dpy / 2 - radius;
      if (dx * dx + dy * dy <= radius * radius) dies.push({ xIndex: xi, yIndex: yi });
    }
  }
  return dies;
}

function randomPlacement(rand: () => number, dies: DieInfo[], config: GeneratorConfig): Placement {
  const die = dies[Math.floor(rand() * dies.length)];
  return { xIndex: die.xIndex, yIndex: die.yIndex, xRel: Math.floor(rand() * (config.diePitch[0] - 1)) + 1, yRel: Math.floor(rand() * (config.diePitch[1] - 1)) + 1 };
}

function edgeHeavyPlacement(rand: () => number, dies: DieInfo[], config: GeneratorConfig): Placement {
  const radius = config.waferDiameter / 2;
  const [dpx, dpy] = config.diePitch;
  const [ox, oy] = config.dieOrigin;
  const weights: number[] = []; let total = 0;
  for (const die of dies) { const dx = ox + die.xIndex * dpx + dpx / 2 - radius, dy = oy + die.yIndex * dpy + dpy / 2 - radius; const w = (dx * dx + dy * dy) / (radius * radius) + 0.01; weights.push(w); total += w; }
  let r = rand() * total, idx = 0;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { idx = i; break; } }
  const die = dies[idx];
  return { xIndex: die.xIndex, yIndex: die.yIndex, xRel: Math.floor(rand() * (config.diePitch[0] - 1)) + 1, yRel: Math.floor(rand() * (config.diePitch[1] - 1)) + 1 };
}

function createClusteredPlacer(rand: () => number, dies: DieInfo[], config: GeneratorConfig) {
  const numClusters = Math.floor(rand() * 11) + 5;
  const radius = config.waferDiameter / 2;
  const [dpx, dpy] = config.diePitch;
  const [ox, oy] = config.dieOrigin;
  const centers: { x: number; y: number; sigma: number }[] = [];
  for (let c = 0; c < numClusters; c++) {
    let px: number, py: number;
    do { px = rand() * config.waferDiameter; py = rand() * config.waferDiameter; }
    while ((px - radius) ** 2 + (py - radius) ** 2 > radius * radius);
    centers.push({ x: px, y: py, sigma: (rand() * 2 + 1) * Math.max(dpx, dpy) });
  }
  return (rng: () => number): Placement => {
    const c = centers[Math.floor(rng() * numClusters)];
    const px = c.x + gaussianRandom(rng) * c.sigma, py = c.y + gaussianRandom(rng) * c.sigma;
    const xi = Math.floor((px - ox) / dpx), yi = Math.floor((py - oy) / dpy);
    let best = dies[0], bestD = Infinity;
    for (const d of dies) { const dsq = (d.xIndex - xi) ** 2 + (d.yIndex - yi) ** 2; if (dsq < bestD) { bestD = dsq; best = d; } }
    return { xIndex: best.xIndex, yIndex: best.yIndex, xRel: Math.floor(rng() * (config.diePitch[0] - 1)) + 1, yRel: Math.floor(rng() * (config.diePitch[1] - 1)) + 1 };
  };
}

function generatePlacements(rand: () => number, dies: DieInfo[], config: GeneratorConfig): Placement[] {
  const p: Placement[] = [], n = config.defectCount;
  if (config.distribution === 'random') { for (let i = 0; i < n; i++) p.push(randomPlacement(rand, dies, config)); }
  else if (config.distribution === 'edge-heavy') { for (let i = 0; i < n; i++) p.push(edgeHeavyPlacement(rand, dies, config)); }
  else if (config.distribution === 'clustered') { const cp = createClusteredPlacer(rand, dies, config); for (let i = 0; i < n; i++) p.push(cp(rand)); }
  else { const nR = Math.round(n * 0.4), nE = Math.round(n * 0.3), nC = n - nR - nE; for (let i = 0; i < nR; i++) p.push(randomPlacement(rand, dies, config)); for (let i = 0; i < nE; i++) p.push(edgeHeavyPlacement(rand, dies, config)); const cp = createClusteredPlacer(rand, dies, config); for (let i = 0; i < nC; i++) p.push(cp(rand)); }
  return p;
}

function pickClassNumber(rand: () => number, classCount: number): number {
  const weights: number[] = []; let total = 0;
  for (let i = 1; i <= classCount; i++) { const w = 1 / Math.pow(i, 1.2); weights.push(w); total += w; }
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i + 1; }
  return classCount;
}

function generateDefectSize(rand: () => number) {
  const dSize = Math.max(1, Math.round(logNormalRandom(rand, 50, 0.8)));
  const aspect = 0.6 + rand() * 0.8;
  return { xSize: Math.max(1, Math.round(dSize * aspect)), ySize: Math.max(1, Math.round(dSize / aspect)), defectArea: Math.max(1, Math.round(Math.max(1, Math.round(dSize * aspect)) * Math.max(1, Math.round(dSize / aspect)) * (0.6 + rand() * 0.4))), dSize };
}

function formatTimestamp(d: Date): string {
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

export function generateKlarf(partial: Partial<GeneratorConfig> = {}): string {
  const config: GeneratorConfig = { ...DEFAULT_CONFIG, ...partial };
  const rand = mulberry32(config.seed);
  const dies = computeDieGrid(config);
  if (dies.length === 0) throw new Error('No dies fit within the wafer radius.');
  const placements = generatePlacements(rand, dies, config);
  const classCount = CLASS_NAMES.length;
  const rows: number[][] = [];
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i]; const { xSize, ySize, defectArea, dSize } = generateDefectSize(rand);
    rows.push([i+1, p.xRel, p.yRel, p.xIndex, p.yIndex, xSize, ySize, defectArea, dSize, pickClassNumber(rand, classCount), 1]);
  }
  const tpSet = new Set<string>(); for (const row of rows) tpSet.add(`${row[3]},${row[4]}`);
  const tp = Array.from(tpSet).map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
  const apt = parseFloat(((config.diePitch[0] * config.diePitch[1] * tp.length) / 1e6).toFixed(1));
  const dens = apt > 0 ? parseFloat((config.defectCount / apt).toFixed(3)) : 0;
  const now = new Date(); const r = config.waferDiameter / 2;
  const L: string[] = [];
  L.push(`FileVersion 1 2;`); L.push(`FileTimestamp ${formatTimestamp(now)};`);
  L.push(`InspectionStationID "KLA" "2830" "EQ001";`); L.push(`SampleType WAFER;`);
  L.push(`ResultTimestamp ${formatTimestamp(new Date(now.getTime()-300000))};`);
  L.push(`LotID "${config.lotId}";`); L.push(`SampleSize 1 ${config.waferDiameter};`);
  L.push(`DeviceID "${config.deviceId}";`); L.push(`SetupID "RECIPE_BRIGHTFIELD_01";`);
  L.push(`StepID "${config.stepId}";`); L.push(`WaferID "${config.waferId}";`);
  L.push(`Slot ${config.slot};`); L.push(`SampleOrientationMarkType NOTCH;`);
  L.push(`OrientationMarkLocation DOWN;`);
  L.push(`DiePitch ${config.diePitch[0]} ${config.diePitch[1]};`);
  L.push(`DieOrigin ${config.dieOrigin[0]} ${config.dieOrigin[1]};`);
  L.push(`SampleCenterLocation ${r} ${r};`); L.push(`AreaPerTest ${apt};`);
  L.push(`SampleTestPlan ${tp.length};`); for (const t of tp) L.push(`${t.x} ${t.y};`);
  L.push(`DefectRecordSpec 11 DEFECTID XREL YREL XINDEX YINDEX XSIZE YSIZE DEFECTAREA DSIZE CLASSNUMBER TEST;`);
  L.push(`DefectList`); for (const row of rows) L.push(`${row.join(' ')};`);
  L.push(`SummarySpec 3 TESTNO NDEFECT DEFDENSITY;`); L.push(`SummaryList`);
  L.push(`1 ${config.defectCount} ${dens};`);
  L.push(`ClassLookup ${classCount};`); for (let i = 0; i < classCount; i++) L.push(`${i+1} "${CLASS_NAMES[i]}";`);
  L.push(`EndOfFile;`);
  return L.join('\n') + '\n';
}
