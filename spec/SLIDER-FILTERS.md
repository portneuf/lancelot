# Dynamic Range Slider Filters

## Overview

Replace static text inputs with interactive range sliders for all numeric defect properties. Each slider shows a histogram preview of the data distribution and updates the DefectTable and WaferMap in real-time.

## User Flow

1. User opens a KLARF file -> navigates to Defects view
2. Compact filter bar shows class chips + search input + **"Filters" toggle button**
3. User clicks toggle -> **DynamicFilterPanel** slides open below the bar
4. Panel shows a grid of range sliders, one per numeric column:
   - Size, XSIZE, YSIZE, DEFECTAREA, DSIZE
   - xAbs, yAbs (with mini wafer region indicator)
   - classNumber, clusterNumber, test, imageCount
   - Any extra numeric columns from the KLARF file
5. Each slider has:
   - Column name label (left) and current min-max values (right)
   - Dual-handle range slider (Radix UI)
   - Semi-transparent histogram bars behind the slider track
6. Dragging a slider handle immediately moves the thumb (local state)
7. After 150ms debounce, the filter applies to the store
8. DefectTable updates to show only matching defects
9. WaferMap dims non-matching defects (alpha 0.1) instead of hiding them
10. Live counter shows "X of Y defects match"
11. "Clear All" button resets all sliders to full range

## Technical Design

### State: `numericRanges` in inspection-store

```typescript
// New field in DefectFilterCriteria
numericRanges: Record<string, [number | null, number | null]>

// New field in InspectionState
filteredDefectIds: Set<number> | null  // null = no filter active
```

### Components

- **RangeSlider**: Reusable Radix UI wrapper with histogram background
- **DynamicFilterPanel**: Reads defectSchema, computes ranges/histograms, renders slider grid
- **DefectFilterBar**: Updated with toggle button, size inputs removed

### Data Flow

```
DynamicFilterPanel
  -> local slider state (immediate feedback)
  -> useDebounce(150ms)
  -> updateFilters({ numericRanges: {...} })
  -> defects.tsx useMemo filters pipeline
  -> filteredDefects
  -> DefectTable (shows filtered)
  -> useEffect -> setFilteredDefectIds
  -> WaferMap renderer (dims non-matching at alpha 0.1)
```
