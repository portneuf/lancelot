#!/usr/bin/env python3
"""
WM-811K to KLARF/SINF Converter

Converts wafer maps from the WM-811K (LSWMD.pkl) dataset into
KLARF or SINF files that can be loaded in Lancelot.

The WM-811K dataset contains 811,457 wafer maps with die-level
bin data. Each wafer map is a 2D numpy array where:
  0 = no die
  1 = normal/pass die
  2 = defect/fail die

Usage:
  python scripts/wm811k-to-klarf.py                    # Convert first 10 as KLARF
  python scripts/wm811k-to-klarf.py --count 100        # Convert 100 wafers
  python scripts/wm811k-to-klarf.py --format sinf      # Output as SINF
  python scripts/wm811k-to-klarf.py --labeled-only      # Only labeled wafers
  python scripts/wm811k-to-klarf.py --index 42          # Convert specific wafer
"""

import pickle
import sys
import os
import argparse
import numpy as np
from datetime import datetime

# Failure pattern labels in WM-811K
FAILURE_LABELS = {
    0: 'None',
    1: 'Center',
    2: 'Donut',
    3: 'Edge-Loc',
    4: 'Edge-Ring',
    5: 'Loc',
    6: 'Random',
    7: 'Scratch',
    8: 'Near-full',
}

DIE_PITCH_UM = 8000  # Assumed die pitch in micrometers
WAFER_DIAMETER_UM = 300000  # 300mm wafer


def load_dataset(path: str):
    """Load the WM-811K pickle file."""
    print(f"Loading {path} (this may take a moment for 2GB)...")
    import pandas as pd
    # Handle pandas version compatibility (dataset was pickled with older pandas)
    try:
        # Try pandas read_pickle which handles version compat
        data = pd.read_pickle(path)
    except Exception:
        # Fallback: add compat shim for older pandas pickle format
        import pandas.core.indexes
        sys.modules['pandas.indexes'] = pandas.core.indexes
        sys.modules['pandas.indexes.base'] = pandas.core.indexes.base
        sys.modules['pandas.indexes.numeric'] = pandas.core.indexes.numeric if hasattr(pandas.core.indexes, 'numeric') else pandas.core.indexes.base
        sys.modules['pandas.indexes.range_'] = pandas.core.indexes.range_ if hasattr(pandas.core.indexes, 'range_') else pandas.core.indexes.base
        with open(path, 'rb') as f:
            data = pickle.load(f)
    print(f"Loaded {len(data)} wafer records.")
    return data


def wafer_map_to_defects(wafer_map: np.ndarray, die_pitch: int = DIE_PITCH_UM):
    """
    Convert a 2D wafer map array to defect records.

    In WM-811K: 0=no die, 1=pass, 2=fail
    We treat each fail die (value=2) as a defect.
    """
    rows, cols = wafer_map.shape
    center_row = rows // 2
    center_col = cols // 2

    defects = []
    defect_id = 1

    for r in range(rows):
        for c in range(cols):
            val = wafer_map[r, c]
            if val == 2:  # Fail die
                x_index = c - center_col
                y_index = r - center_row
                # Place defect at die center
                x_rel = die_pitch // 2
                y_rel = die_pitch // 2
                # Random-ish size based on position
                size = 50 + ((defect_id * 7) % 150)

                defects.append({
                    'id': defect_id,
                    'x_rel': x_rel,
                    'y_rel': y_rel,
                    'x_index': x_index,
                    'y_index': y_index,
                    'size': size,
                    'class': 1,  # Will be set based on pattern
                })
                defect_id += 1

    return defects


def generate_klarf(wafer_map: np.ndarray, lot_id: str, wafer_id: str,
                   label: int = 0, wafer_idx: int = 0) -> str:
    """Generate a KLARF v1.2 file from a wafer map."""
    rows, cols = wafer_map.shape
    center_row = rows // 2
    center_col = cols // 2

    # Compute die pitch so that the entire grid fits within the wafer radius
    # with ~10% margin. Max index extent determines the pitch.
    wafer_radius = WAFER_DIAMETER_UM // 2
    max_extent = max(center_row, rows - center_row, center_col, cols - center_col)
    # Die pitch = 90% of wafer radius / max_extent (so dies stay inside circle)
    die_pitch = int(wafer_radius * 0.9 / max(max_extent, 1))

    defects = wafer_map_to_defects(wafer_map, die_pitch)
    pattern_name = FAILURE_LABELS.get(label, 'Unknown')

    # Assign class based on pattern label
    class_names = ['Pass', pattern_name, 'Edge', 'Center', 'Random']
    for d in defects:
        d['class'] = min(label + 1, len(class_names))

    now = datetime.now()
    ts = now.strftime('%m-%d-%Y %H:%M:%S')

    lines = []
    lines.append(f'FileVersion 1 2;')
    lines.append(f'FileTimestamp {ts};')
    lines.append(f'InspectionStationID "WM811K" "Converter" "DS-{wafer_idx:06d}";')
    lines.append(f'SampleType WAFER;')
    lines.append(f'ResultTimestamp {ts};')
    lines.append(f'LotID "{lot_id}";')
    lines.append(f'SampleSize 1 {WAFER_DIAMETER_UM};')
    lines.append(f'DeviceID "WM811K-{pattern_name}";')
    lines.append(f'SetupID "WM811K_IMPORT";')
    lines.append(f'StepID "CONVERT";')
    lines.append(f'WaferID "{wafer_id}";')
    lines.append(f'Slot 1;')
    lines.append(f'SampleOrientationMarkType NOTCH;')
    lines.append(f'OrientationMarkLocation DOWN;')
    lines.append(f'DiePitch {die_pitch} {die_pitch};')
    lines.append(f'DieOrigin {wafer_radius} {wafer_radius};')
    lines.append(f'SampleCenterLocation {wafer_radius} {wafer_radius};')
    lines.append(f'AreaPerTest 64.0;')

    # Test plan (all dies that exist)
    test_plan = []
    for r in range(rows):
        for c in range(cols):
            if wafer_map[r, c] > 0:
                test_plan.append((c - center_col, r - center_row))

    lines.append(f'SampleTestPlan {len(test_plan)};')
    for x, y in test_plan:
        lines.append(f'{x} {y};')

    # Defect record
    lines.append(f'DefectRecordSpec 7 DEFECTID XREL YREL XINDEX YINDEX DSIZE CLASSNUMBER;')
    lines.append(f'DefectList')
    for d in defects:
        lines.append(f'{d["id"]} {d["x_rel"]} {d["y_rel"]} {d["x_index"]} {d["y_index"]} {d["size"]} {d["class"]};')

    # Summary
    lines.append(f'SummarySpec 3 TESTNO NDEFECT DEFDENSITY;')
    lines.append(f'SummaryList')
    density = len(defects) / 64.0 if defects else 0
    lines.append(f'1 {len(defects)} {density:.3f};')

    # Class lookup
    used_classes = sorted(set(d['class'] for d in defects)) if defects else [1]
    lines.append(f'ClassLookup {len(used_classes)};')
    for cls in used_classes:
        name = class_names[cls - 1] if cls <= len(class_names) else f'Class-{cls}'
        lines.append(f'{cls} "{name}";')

    lines.append(f'EndOfFile;')

    return '\n'.join(lines) + '\n'


def generate_sinf(wafer_map: np.ndarray, lot_id: str, wafer_id: str,
                  label: int = 0) -> str:
    """Generate a SINF file from a wafer map."""
    rows, cols = wafer_map.shape

    lines = []
    lines.append(f'DEVICE:WM811K-{FAILURE_LABELS.get(label, "Unknown")}')
    lines.append(f'LOT:{lot_id}')
    lines.append(f'WAFER:{wafer_id}')
    lines.append(f'FNLOC:D')
    lines.append(f'ROWCT:{rows}')
    lines.append(f'COLCT:{cols}')
    lines.append(f'BCEQU:01')
    lines.append(f'REFPX:{cols // 2}')
    lines.append(f'REFPY:{rows // 2}')
    lines.append(f'DUTMS:um')
    lines.append(f'XDIES:{DIE_PITCH_UM}')
    lines.append(f'YDIES:{DIE_PITCH_UM}')

    # Map values: 0=no die (__ ), 1=pass (01), 2=fail (03)
    for r in range(rows):
        row_codes = []
        for c in range(cols):
            val = wafer_map[r, c]
            if val == 0:
                row_codes.append('__')
            elif val == 1:
                row_codes.append('01')
            else:
                row_codes.append('03')
        lines.append(' '.join(row_codes))

    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description='Convert WM-811K dataset to KLARF/SINF files')
    parser.add_argument('--input', default='assets/LSWMD.pkl', help='Path to LSWMD.pkl')
    parser.add_argument('--output', default='assets/wm811k-output', help='Output directory')
    parser.add_argument('--format', choices=['klarf', 'sinf'], default='klarf', help='Output format')
    parser.add_argument('--count', type=int, default=10, help='Number of wafers to convert')
    parser.add_argument('--labeled-only', action='store_true', help='Only convert labeled wafers')
    parser.add_argument('--index', type=int, default=None, help='Convert specific wafer index')
    args = parser.parse_args()

    # Load dataset
    data = load_dataset(args.input)

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    # Extract wafer maps and labels
    wafer_maps = data['waferMap']

    # Get failure labels if available
    has_labels = 'failureType' in data.columns if hasattr(data, 'columns') else False

    # Filter indices
    indices = list(range(len(wafer_maps)))

    if args.index is not None:
        indices = [args.index]
    elif args.labeled_only and has_labels:
        failure_types = data['failureType']
        indices = [i for i in indices
                   if i < len(failure_types)
                   and isinstance(failure_types.iloc[i], list)
                   and len(failure_types.iloc[i]) > 0
                   and failure_types.iloc[i][0] != ['none']]
        print(f"Found {len(indices)} labeled wafers")

    indices = indices[:args.count]

    print(f"Converting {len(indices)} wafers to {args.format.upper()}...")

    converted = 0
    for idx in indices:
        try:
            wm = wafer_maps.iloc[idx] if hasattr(wafer_maps, 'iloc') else wafer_maps[idx]

            if not isinstance(wm, np.ndarray) or wm.size == 0:
                continue

            # Get label - WM-811K stores labels as numpy arrays like [['Center']]
            label = 0
            if has_labels:
                ft = data['failureType'].iloc[idx]
                if isinstance(ft, np.ndarray) and ft.size > 0:
                    label_name = str(ft.flat[0])
                    if label_name != 'none' and label_name != '':
                        for k, v in FAILURE_LABELS.items():
                            if v.lower() == label_name.lower():
                                label = k
                                break

            lot_id = f'WM811K-LOT-{idx // 100:04d}'
            wafer_id = f'W{idx:06d}'

            ext = 'klarf' if args.format == 'klarf' else 'sinf'
            filename = f'{wafer_id}.{ext}'
            filepath = os.path.join(args.output, filename)

            if args.format == 'klarf':
                content = generate_klarf(wm, lot_id, wafer_id, label, idx)
            else:
                content = generate_sinf(wm, lot_id, wafer_id, label)

            with open(filepath, 'w') as f:
                f.write(content)

            pattern = FAILURE_LABELS.get(label, '?')
            defect_count = int(np.sum(wm == 2))
            print(f"  [{converted+1}/{len(indices)}] {filename} - {wm.shape[0]}x{wm.shape[1]} - {defect_count} defects - Pattern: {pattern}")
            converted += 1

        except Exception as e:
            print(f"  Skipping index {idx}: {e}")

    print(f"\nDone! Converted {converted} wafers to {args.output}/")
    print(f"Open them in Lancelot via drag-and-drop or File > Browse.")


if __name__ == '__main__':
    main()
