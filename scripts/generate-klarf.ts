/**
 * KLARF v1.2 test file generator.
 *
 * Generates syntactically valid KLARF files with configurable defect counts,
 * spatial distributions, and wafer geometries. Output is designed to round-trip
 * through the KlarfAdapter parser without errors.
 *
 * Can be used as a CLI tool or imported as a library.
 *
 *   CLI:  npx tsx scripts/generate-klarf.ts --defects 500 --distribution edge-heavy
 *   Lib:  import { generateKlarf } from './scripts/generate-klarf';
 */

// ---------------------------------------------------------------------------
// Seeded PRNG -- mulberry32
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type DistributionMode = 'random' | 'edge-heavy' | 'clustered' | 'mixed';

export interface GeneratorConfig {
  /** Number of defects to generate. */
  defectCount: number;
  /** Spatial distribution mode. */
  distribution: DistributionMode;
  /** Wafer diameter in micrometers. */
  waferDiameter: number;
  /** Die pitch [x, y] in micrometers. */
  diePitch: [number, number];
  /** Die origin offset [x, y] in micrometers. */
  dieOrigin: [number, number];
  /** Lot identifier string. */
  lotId: string;
  /** Wafer identifier string. */
  waferId: string;
  /** Device identifier string. */
  deviceId: string;
  /** Step identifier string. */
  stepId: string;
  /** Slot number (1-25). */
  slot: number;
  /** PRNG seed for deterministic output. */
  seed: number;
  /** Output file path (CLI only). When empty, writes to stdout. */
  outputPath: string;
}

const DEFAULT_CONFIG: GeneratorConfig = {
  defectCount: 100,
  distribution: 'random',
  waferDiameter: 300000,
  diePitch: [10000, 12000],
  dieOrigin: [500, 600],
  lotId: 'GEN-LOT-001',
  waferId: 'W01',
  deviceId: 'TEST-DEVICE',
  stepId: 'ETCH1',
  slot: 1,
  seed: 42,
  outputPath: '',
};

// ---------------------------------------------------------------------------
// Defect class definitions
// ---------------------------------------------------------------------------

const CLASS_NAMES = [
  'Particle',
  'Scratch',
  'Pit',
  'Stain',
  'Pattern Defect',
  'COP',
  'Residue',
  'Micro-scratch',
] as const;

// ---------------------------------------------------------------------------
// Helper math using the seeded PRNG
// ---------------------------------------------------------------------------

/** Box-Muller transform -- returns a standard-normal variate. */
function gaussianRandom(rand: () => number): number {
  let u: number;
  let v: number;
  // Avoid log(0)
  do {
    u = rand();
  } while (u === 0);
  v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Log-normal variate centred on `median` with the given sigma of the underlying normal. */
function logNormalRandom(rand: () => number, median: number, sigma: number): number {
  const mu = Math.log(median);
  return Math.exp(mu + sigma * gaussianRandom(rand));
}

// ---------------------------------------------------------------------------
// Die grid computation
// ---------------------------------------------------------------------------

interface DieInfo {
  xIndex: number;
  yIndex: number;
}

function computeDieGrid(config: GeneratorConfig): DieInfo[] {
  const radius = config.waferDiameter / 2;
  const cx = radius; // wafer center in um
  const cy = radius;
  const [dpx, dpy] = config.diePitch;
  const [ox, oy] = config.dieOrigin;

  // Compute the range of indices that could possibly fit
  const maxXIndex = Math.ceil((config.waferDiameter - ox) / dpx);
  const maxYIndex = Math.ceil((config.waferDiameter - oy) / dpy);
  const minXIndex = Math.floor(-ox / dpx);
  const minYIndex = Math.floor(-oy / dpy);

  const dies: DieInfo[] = [];

  for (let yi = minYIndex; yi <= maxYIndex; yi++) {
    for (let xi = minXIndex; xi <= maxXIndex; xi++) {
      // Die center in wafer coordinates
      const dieCenterX = ox + xi * dpx + dpx / 2;
      const dieCenterY = oy + yi * dpy + dpy / 2;

      const dx = dieCenterX - cx;
      const dy = dieCenterY - cy;

      if (dx * dx + dy * dy <= radius * radius) {
        dies.push({ xIndex: xi, yIndex: yi });
      }
    }
  }

  return dies;
}

// ---------------------------------------------------------------------------
// Distribution generators
// ---------------------------------------------------------------------------

interface DefectPlacement {
  xIndex: number;
  yIndex: number;
  xRel: number;
  yRel: number;
}

/**
 * Pick a die uniformly at random, then pick a random position within that die.
 */
function randomPlacement(
  rand: () => number,
  dies: DieInfo[],
  config: GeneratorConfig,
): DefectPlacement {
  const die = dies[Math.floor(rand() * dies.length)];
  return {
    xIndex: die.xIndex,
    yIndex: die.yIndex,
    xRel: Math.floor(rand() * (config.diePitch[0] - 1)) + 1,
    yRel: Math.floor(rand() * (config.diePitch[1] - 1)) + 1,
  };
}

/**
 * Edge-heavy: weight die selection by (distance from center)^2.
 */
function edgeHeavyPlacement(
  rand: () => number,
  dies: DieInfo[],
  config: GeneratorConfig,
): DefectPlacement {
  const radius = config.waferDiameter / 2;
  const cx = radius;
  const cy = radius;
  const [dpx, dpy] = config.diePitch;
  const [ox, oy] = config.dieOrigin;

  // Pre-compute weights
  const weights: number[] = [];
  let totalWeight = 0;
  for (const die of dies) {
    const dieCenterX = ox + die.xIndex * dpx + dpx / 2;
    const dieCenterY = oy + die.yIndex * dpy + dpy / 2;
    const dx = dieCenterX - cx;
    const dy = dieCenterY - cy;
    const distSq = dx * dx + dy * dy;
    // Weight proportional to distance squared (edge-heavy)
    const w = distSq / (radius * radius) + 0.01; // small floor to allow some center defects
    weights.push(w);
    totalWeight += w;
  }

  // Weighted selection
  let r = rand() * totalWeight;
  let selectedIdx = 0;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      selectedIdx = i;
      break;
    }
  }
  const die = dies[selectedIdx];

  return {
    xIndex: die.xIndex,
    yIndex: die.yIndex,
    xRel: Math.floor(rand() * (config.diePitch[0] - 1)) + 1,
    yRel: Math.floor(rand() * (config.diePitch[1] - 1)) + 1,
  };
}

/**
 * Clustered: create 5-15 Gaussian clusters and draw defects from them.
 */
function createClusteredPlacer(
  rand: () => number,
  dies: DieInfo[],
  config: GeneratorConfig,
): (rand: () => number) => DefectPlacement {
  const numClusters = Math.floor(rand() * 11) + 5; // 5-15 clusters
  const radius = config.waferDiameter / 2;
  const [dpx, dpy] = config.diePitch;
  const [ox, oy] = config.dieOrigin;

  // Generate cluster centers in wafer coordinates
  const clusterCenters: { x: number; y: number; sigma: number }[] = [];
  for (let c = 0; c < numClusters; c++) {
    // Pick a random point inside the wafer
    let px: number;
    let py: number;
    do {
      px = rand() * config.waferDiameter;
      py = rand() * config.waferDiameter;
    } while (
      (px - radius) * (px - radius) + (py - radius) * (py - radius) >
      radius * radius
    );
    // Cluster spread: 1-3 die pitches
    const sigma = (rand() * 2 + 1) * Math.max(dpx, dpy);
    clusterCenters.push({ x: px, y: py, sigma });
  }

  return (rng: () => number): DefectPlacement => {
    // Pick a cluster
    const cluster = clusterCenters[Math.floor(rng() * numClusters)];
    // Draw from Gaussian around cluster center
    const px = cluster.x + gaussianRandom(rng) * cluster.sigma;
    const py = cluster.y + gaussianRandom(rng) * cluster.sigma;

    // Convert to die index
    const xi = Math.floor((px - ox) / dpx);
    const yi = Math.floor((py - oy) / dpy);

    // Find the closest valid die
    let bestDie = dies[0];
    let bestDistSq = Infinity;
    for (const die of dies) {
      const ddx = die.xIndex - xi;
      const ddy = die.yIndex - yi;
      const dsq = ddx * ddx + ddy * ddy;
      if (dsq < bestDistSq) {
        bestDistSq = dsq;
        bestDie = die;
      }
    }

    return {
      xIndex: bestDie.xIndex,
      yIndex: bestDie.yIndex,
      xRel: Math.floor(rng() * (config.diePitch[0] - 1)) + 1,
      yRel: Math.floor(rng() * (config.diePitch[1] - 1)) + 1,
    };
  };
}

function generatePlacements(
  rand: () => number,
  dies: DieInfo[],
  config: GeneratorConfig,
): DefectPlacement[] {
  const placements: DefectPlacement[] = [];
  const n = config.defectCount;

  if (config.distribution === 'random') {
    for (let i = 0; i < n; i++) {
      placements.push(randomPlacement(rand, dies, config));
    }
  } else if (config.distribution === 'edge-heavy') {
    for (let i = 0; i < n; i++) {
      placements.push(edgeHeavyPlacement(rand, dies, config));
    }
  } else if (config.distribution === 'clustered') {
    const clusteredPlacer = createClusteredPlacer(rand, dies, config);
    for (let i = 0; i < n; i++) {
      placements.push(clusteredPlacer(rand));
    }
  } else {
    // mixed: 40% random, 30% edge-heavy, 30% clustered
    const nRandom = Math.round(n * 0.4);
    const nEdge = Math.round(n * 0.3);
    const nCluster = n - nRandom - nEdge;

    for (let i = 0; i < nRandom; i++) {
      placements.push(randomPlacement(rand, dies, config));
    }
    for (let i = 0; i < nEdge; i++) {
      placements.push(edgeHeavyPlacement(rand, dies, config));
    }
    const clusteredPlacer = createClusteredPlacer(rand, dies, config);
    for (let i = 0; i < nCluster; i++) {
      placements.push(clusteredPlacer(rand));
    }
  }

  return placements;
}

// ---------------------------------------------------------------------------
// Defect class assignment (Pareto-like)
// ---------------------------------------------------------------------------

/**
 * Build a Pareto-like cumulative distribution over the 8 class indices.
 * Class 1 (Particle) is the most common.
 */
function pickClassNumber(rand: () => number, classCount: number): number {
  // Pareto weights: w_i = 1 / i^alpha, alpha ~1.2
  const alpha = 1.2;
  const weights: number[] = [];
  let total = 0;
  for (let i = 1; i <= classCount; i++) {
    const w = 1 / Math.pow(i, alpha);
    weights.push(w);
    total += w;
  }

  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1;
  }
  return classCount;
}

// ---------------------------------------------------------------------------
// Defect size generation (log-normal centred at 50um)
// ---------------------------------------------------------------------------

function generateDefectSize(rand: () => number): { xSize: number; ySize: number; defectArea: number; dSize: number } {
  const baseSize = logNormalRandom(rand, 50, 0.8);
  const dSize = Math.max(1, Math.round(baseSize));
  // Aspect ratio jitter
  const aspect = 0.6 + rand() * 0.8; // 0.6 - 1.4
  const xSize = Math.max(1, Math.round(dSize * aspect));
  const ySize = Math.max(1, Math.round(dSize / aspect));
  const defectArea = Math.max(1, Math.round(xSize * ySize * (0.6 + rand() * 0.4)));
  return { xSize, ySize, defectArea, dSize };
}

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

function formatTimestamp(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${mm}-${dd}-${yyyy} ${hh}:${min}:${ss}`;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateKlarf(partial: Partial<GeneratorConfig> = {}): string {
  const config: GeneratorConfig = { ...DEFAULT_CONFIG, ...partial };
  const rand = mulberry32(config.seed);

  // Compute die grid
  const dies = computeDieGrid(config);
  if (dies.length === 0) {
    throw new Error('No dies fit within the wafer radius with the given pitch and origin.');
  }

  // Generate placements
  const placements = generatePlacements(rand, dies, config);

  // Build defect rows: [DEFECTID XREL YREL XINDEX YINDEX XSIZE YSIZE DEFECTAREA DSIZE CLASSNUMBER TEST]
  const defectRows: number[][] = [];
  const classCount = CLASS_NAMES.length;

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const { xSize, ySize, defectArea, dSize } = generateDefectSize(rand);
    const classNumber = pickClassNumber(rand, classCount);
    defectRows.push([
      i + 1,        // DEFECTID
      p.xRel,       // XREL
      p.yRel,       // YREL
      p.xIndex,     // XINDEX
      p.yIndex,     // YINDEX
      xSize,        // XSIZE
      ySize,        // YSIZE
      defectArea,   // DEFECTAREA
      dSize,        // DSIZE
      classNumber,  // CLASSNUMBER
      1,            // TEST
    ]);
  }

  // Build test plan: all unique dies that contain defects
  const testPlanSet = new Set<string>();
  for (const row of defectRows) {
    testPlanSet.add(`${row[3]},${row[4]}`);
  }
  const testPlanEntries = Array.from(testPlanSet).map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });

  // Compute area per test (approximate: die area * numDies tested / 1e6 to get mm^2 roughly)
  const dieAreaUm2 = config.diePitch[0] * config.diePitch[1];
  const areaPerTest = parseFloat(((dieAreaUm2 * testPlanEntries.length) / 1e6).toFixed(1));

  // Compute defect density
  const defectDensity = areaPerTest > 0
    ? parseFloat((config.defectCount / areaPerTest).toFixed(3))
    : 0;

  // Timestamps
  const now = new Date();
  const fileTimestamp = formatTimestamp(now);
  const resultTimestamp = formatTimestamp(new Date(now.getTime() - 300000)); // 5 min before

  // Wafer center
  const waferRadius = config.waferDiameter / 2;

  // Build KLARF text
  const lines: string[] = [];

  lines.push(`FileVersion 1 2;`);
  lines.push(`FileTimestamp ${fileTimestamp};`);
  lines.push(`InspectionStationID "KLA" "2830" "EQ001";`);
  lines.push(`SampleType WAFER;`);
  lines.push(`ResultTimestamp ${resultTimestamp};`);
  lines.push(`LotID "${config.lotId}";`);
  lines.push(`SampleSize 1 ${config.waferDiameter};`);
  lines.push(`DeviceID "${config.deviceId}";`);
  lines.push(`SetupID "RECIPE_BRIGHTFIELD_01";`);
  lines.push(`StepID "${config.stepId}";`);
  lines.push(`WaferID "${config.waferId}";`);
  lines.push(`Slot ${config.slot};`);
  lines.push(`SampleOrientationMarkType NOTCH;`);
  lines.push(`OrientationMarkLocation DOWN;`);
  lines.push(`DiePitch ${config.diePitch[0]} ${config.diePitch[1]};`);
  lines.push(`DieOrigin ${config.dieOrigin[0]} ${config.dieOrigin[1]};`);
  lines.push(`SampleCenterLocation ${waferRadius} ${waferRadius};`);
  lines.push(`AreaPerTest ${areaPerTest};`);

  // SampleTestPlan
  lines.push(`SampleTestPlan ${testPlanEntries.length};`);
  for (const tp of testPlanEntries) {
    lines.push(`${tp.x} ${tp.y};`);
  }

  // DefectRecordSpec -- 11 columns
  lines.push(`DefectRecordSpec 11 DEFECTID XREL YREL XINDEX YINDEX XSIZE YSIZE DEFECTAREA DSIZE CLASSNUMBER TEST;`);

  // DefectList
  lines.push(`DefectList`);
  for (const row of defectRows) {
    lines.push(`${row.join(' ')};`);
  }

  // SummarySpec
  lines.push(`SummarySpec 3 TESTNO NDEFECT DEFDENSITY;`);
  lines.push(`SummaryList`);
  lines.push(`1 ${config.defectCount} ${defectDensity};`);

  // ClassLookup
  lines.push(`ClassLookup ${classCount};`);
  for (let i = 0; i < classCount; i++) {
    lines.push(`${i + 1} "${CLASS_NAMES[i]}";`);
  }

  lines.push(`EndOfFile;`);

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`Usage: npx tsx scripts/generate-klarf.ts [options]

Options:
  --defects <n>          Number of defects (default: 100)
  --distribution <mode>  Distribution: random|edge-heavy|clustered|mixed (default: random)
  --seed <n>             PRNG seed for reproducible output (default: 42)
  --diameter <n>         Wafer diameter in um (default: 300000)
  --lot <id>             Lot ID (default: GEN-LOT-001)
  --wafer <id>           Wafer ID (default: W01)
  --device <id>          Device ID (default: TEST-DEVICE)
  --step <id>            Step ID (default: ETCH1)
  --slot <n>             Slot number (default: 1)
  --output <path>        Output file path (default: stdout)
  --help                 Show this help
`);
}

function parseCLIArgs(argv: string[]): Partial<GeneratorConfig> {
  const config: Partial<GeneratorConfig> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--defects':
        config.defectCount = parseInt(next, 10);
        i++;
        break;
      case '--distribution':
        config.distribution = next as DistributionMode;
        i++;
        break;
      case '--seed':
        config.seed = parseInt(next, 10);
        i++;
        break;
      case '--diameter':
        config.waferDiameter = parseInt(next, 10);
        i++;
        break;
      case '--lot':
        config.lotId = next;
        i++;
        break;
      case '--wafer':
        config.waferId = next;
        i++;
        break;
      case '--device':
        config.deviceId = next;
        i++;
        break;
      case '--step':
        config.stepId = next;
        i++;
        break;
      case '--slot':
        config.slot = parseInt(next, 10);
        i++;
        break;
      case '--output':
        config.outputPath = next;
        i++;
        break;
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          printUsage();
          process.exit(1);
        }
        break;
    }
  }

  return config;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('generate-klarf');
if (isDirectRun) {
  const args = process.argv.slice(2);
  const config = parseCLIArgs(args);
  const output = generateKlarf(config);

  if (config.outputPath) {
    const fs = await import('fs');
    fs.writeFileSync(config.outputPath, output, 'utf-8');
    console.log(`KLARF file written to ${config.outputPath}`);
    console.log(`  Defects: ${config.defectCount ?? DEFAULT_CONFIG.defectCount}`);
    console.log(`  Distribution: ${config.distribution ?? DEFAULT_CONFIG.distribution}`);
    console.log(`  Seed: ${config.seed ?? DEFAULT_CONFIG.seed}`);
  } else {
    process.stdout.write(output);
  }
}
