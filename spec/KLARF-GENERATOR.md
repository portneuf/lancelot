# KLARF Test File Generator

## Overview

CLI script that generates realistic KLARF v1.2 files with configurable defect counts and spatial distributions for performance testing and demos.

## Usage

```bash
# Default: 1000 defects, mixed distribution
npx tsx scripts/generate-klarf.ts

# Large file with edge-heavy distribution
npx tsx scripts/generate-klarf.ts --defects 50000 --distribution edge-heavy

# Custom output path
npx tsx scripts/generate-klarf.ts --defects 100000 --output tests/fixtures/large.klarf

# Reproducible with seed
npx tsx scripts/generate-klarf.ts --defects 10000 --seed 42
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--defects` | 1000 | Number of defects to generate |
| `--diameter` | 300000 | Wafer diameter in um (300mm) |
| `--pitch-x` | 10000 | Die pitch X in um |
| `--pitch-y` | 12000 | Die pitch Y in um |
| `--classes` | 8 | Number of defect classes |
| `--distribution` | mixed | random, edge-heavy, clustered, mixed |
| `--output` | tests/fixtures/generated-{count}.klarf | Output file path |
| `--seed` | (random) | PRNG seed for reproducibility |

## Spatial Distributions

- **random**: Uniform across all dies and within each die
- **edge-heavy**: `weight = (distance/radius)^2` - realistic for semiconductor fabs
- **clustered**: 5-15 Gaussian clusters randomly placed on wafer
- **mixed**: 40% edge-heavy + 30% clustered + 30% random

## Generated Data

- 300mm wafer with realistic die grid (~500-800 dies depending on pitch)
- 8 defect classes: Particle, Scratch, Pit, Stain, Pattern Defect, COP, Residue, Micro-scratch
- Pareto-like class distribution (class 1 ~40%, class 2 ~25%, etc.)
- Log-normal defect sizes centered at 50um (range 5-500um)
- Full KLARF v1.2 with DefectRecordSpec, DefectList, SummaryList, ClassLookup, TestPlan
- Seeded PRNG (mulberry32) for reproducible output

## Validation

Generated files must pass round-trip through `KlarfAdapter.parse()` with correct defect count, class lookup, and geometry.
