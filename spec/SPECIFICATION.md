# Lancelot - Semiconductor Inspection File Viewer

## Specification v1.0

---

## 1. Overview

Lancelot is a cross-platform application for viewing, analyzing, and visualizing semiconductor wafer inspection data. The initial focus is on the KLARF (KLA Results File) format, with an extensible architecture designed to support additional industry formats (SINF, STDF, SEMI E142) without modifying existing code.

The application runs as a Web App, Progressive Web App (PWA), and Desktop App (via Tauri v2), deployed to Railway for the web version and distributed as native installers for the desktop version.

---

## 2. Target Users

- **Process Engineers** in semiconductor fabs analyzing defect data
- **Yield Engineers** tracking defect trends and die yield
- **Equipment Engineers** reviewing inspection tool output
- **Quality Engineers** in cleanroom environments (high-contrast display needs)

---

## 3. Supported File Formats

### 3.1 KLARF (KLA Results File)

| Version | Status | Description |
|---------|--------|-------------|
| v1.2 | Supported | Flat keyword/value format, semicolon-delimited |
| v1.8 | Planned | Hierarchical Record/Field/List format with brace nesting |

**KLARF v1.2 Structure:**

```
FileVersion 1 2;
FileTimestamp MM-DD-YYYY HH:MM:SS;
InspectionStationID "vendor" "model" "equipmentId";
SampleType WAFER;
ResultTimestamp MM-DD-YYYY HH:MM:SS;
LotID "lot-identifier";
SampleSize units diameter;
DeviceID "device-name";
SetupID "recipe-name";
StepID "process-step";
WaferID "wafer-identifier";
Slot slot-number;
SampleOrientationMarkType NOTCH|FLAT|NONE;
OrientationMarkLocation UP|DOWN|LEFT|RIGHT;
DiePitch x-pitch y-pitch;
DieOrigin x-origin y-origin;
SampleCenterLocation x-center y-center;
AreaPerTest area-value;
SampleTestPlan count;
  xIndex yIndex;
  ...
DefectRecordSpec column-count COL1 COL2 ...;
DefectList
  val1 val2 val3 ...;
  ...
SummarySpec column-count COL1 COL2 ...;
SummaryList
  val1 val2 val3 ...;
  ...
ClassLookup count;
  classNumber "className";
  ...
EndOfFile;
```

**Well-known Defect Columns:** DEFECTID, XREL, YREL, XINDEX, YINDEX, XSIZE, YSIZE, DEFECTAREA, DSIZE, CLASSNUMBER, TEST, CLUSTERNUMBER, IMAGECOUNT, ROUGHBINNUMBER, FINEBINNUMBER, DEFECTSIZE.

**KLARF v1.8 Structure:**

```
Record FileRecord {
  Field FileVersion 1.8;
  Field FileTimestamp "...";
  Record LotRecord {
    Field LotID "...";
    Record WaferRecord {
      Field WaferID "...";
      List DefectList {
        Columns { DEFECTID XREL YREL ... }
        Data {
          1 1523 2210 ...
          ...
        }
      }
    }
  }
}
```

### 3.2 Future Formats

| Format | Description | Priority |
|--------|-------------|----------|
| SINF | SEMI standard wafer map format | Medium |
| STDF | Standard Test Data Format (ATE) | Medium |
| SEMI E142 | XML-based inspection data | Low |

All formats are integrated via the `FileFormatAdapter` plugin interface without changes to existing code.

---

## 4. Architecture

### 4.1 Layer Model

```
+-------------------------------------------------------------------+
|                          UI LAYER                                  |
|  React 19 components, Radix UI primitives, Recharts, Tailwind v4  |
|  features/ + components/ + routes/ + theme/ + i18n/                |
+-------------------------------------------------------------------+
|                      STATE LAYER (Zustand)                         |
|  file-store | inspection-store | ui-store | settings-store         |
+-------------------------------------------------------------------+
|                     PLATFORM LAYER                                 |
|  platform/web | platform/tauri | platform/pwa                     |
|  File I/O, dialogs, persistence abstraction                       |
+-------------------------------------------------------------------+
|                      DOMAIN LAYER (core/)                          |
|  models/ + parsers/ + services/ + utils/                           |
|  Pure TypeScript, zero UI dependencies                             |
+-------------------------------------------------------------------+
```

### 4.2 Design Patterns

- **Clean Architecture**: Domain logic has zero dependency on React, Zustand, or Tailwind
- **Plugin-Adapter Pattern**: Each file format implements `FileFormatAdapter` and registers with `ParserRegistry`
- **Platform Abstraction**: `PlatformAdapter` interface with Web/Tauri/PWA implementations, auto-detected at startup

### 4.3 Parser Plugin Contract

```typescript
interface FileFormatAdapter {
  readonly descriptor: FileFormatDescriptor;
  probe(header: string): number;       // 0..1 confidence
  parse(text: string, onProgress?: (p: ParseProgress) => void): ParseResult;
}

interface ParserRegistry {
  register(adapter: FileFormatAdapter): void;
  detect(fileName: string, content: string): FileFormatAdapter | undefined;
  getAdapter(id: string): FileFormatAdapter | undefined;
  getSupportedFormats(): FileFormatDescriptor[];
}
```

### 4.4 Normalized Data Model

All parsers produce the same format-agnostic `InspectionFile`:

```typescript
interface InspectionFile {
  source: SourceInfo;               // format, version, filename, parse timestamp
  identity: InspectionIdentity;     // lotId, waferId, deviceId, slot, stepId
  waferGeometry: WaferGeometry;     // diameter, diePitch, dieOrigin, orientation
  inspectionSetup: InspectionSetup; // stationId (vendor/model/equipment), recipe
  defects: DefectRecord[];          // core fields + extra dynamic columns
  defectSchema: DefectColumnSchema[];
  dieMap: DieMapEntry[];            // die grid with status and defect counts
  classLookup: ClassLookupEntry[];
  summaries: SummaryRecord[];
  summarySchema: SummaryColumnSchema[];
  testPlan: TestPlanEntry[];
}

interface DefectRecord {
  defectId: number;
  xRel: number; yRel: number;      // relative within die (um)
  xIndex: number; yIndex: number;  // die grid position
  size?: number;                    // DSIZE (um)
  classNumber?: number;
  test?: number;
  extra: Record<string, number | string>;  // format-specific columns
  xAbs: number; yAbs: number;      // absolute wafer coordinates (precomputed)
}
```

---

## 5. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19 |
| Language | TypeScript | 5.9 |
| Build | Vite | 8 |
| Styling | Tailwind CSS | v4 (CSS custom properties, `@theme`) |
| State | Zustand | 5 |
| Routing | React Router | v7 (`createBrowserRouter`, lazy loading) |
| UI Primitives | Radix UI | Latest (shadcn/ui pattern: copied, not imported) |
| Icons | Lucide React | Latest |
| Charts | Recharts | 3 |
| i18n | LinguiJS | v5 (SWC plugin, ICU MessageFormat) |
| Desktop | Tauri | v2 |
| PWA | vite-plugin-pwa | 1.2 |
| Virtualization | @tanstack/react-virtual | 3 |
| Panel Layout | react-resizable-panels | 4 |
| Deployment | Railway | Dockerfile + nginx |
| CI | GitHub Actions | Node 22 |

---

## 6. Features

### 6.1 File Management

- **File Open**: Drag & drop zone, file picker button, keyboard shortcut (Ctrl+O)
- **Format Detection**: Extension matching + content-sniffing via `probe()`
- **Parsing**: Web Worker with progress bar, main-thread fallback
- **Auto-Navigation**: Redirect to Wafer Map after successful parse
- **Recent Files**: Stored in settings-store (persisted to localStorage)

### 6.2 Wafer Map Visualization

- **Rendering**: HTML5 Canvas (not SVG) for 100k+ defect performance
- **Wafer Outline**: Circle from waferDiameter, V-shaped notch at orientationMarkLocation
- **Die Grid**: Rectangles colored by defect density (green-to-red gradient)
- **Defect Dots**: Batch-rendered in single beginPath()/fill() call
- **Pan/Zoom**: Mouse wheel zoom (around cursor), drag pan, touch pinch-to-zoom
- **Hit Testing**: Click defect to highlight, hover die for info panel
- **Frustum Culling**: Off-screen dies and defects skipped
- **Theme-Aware**: Colors read from CSS custom properties at render time
- **Toolbar**: Zoom In/Out, percentage display, Fit-to-Window
- **Legend**: Die pass/fail/untested + defect color swatches

### 6.3 Defect Table

- **Virtualized**: @tanstack/react-virtual, handles 100k+ rows at 32px row height
- **Dynamic Columns**: Generated from defectSchema, core columns first
- **Sorting**: Tri-state column sort (asc/desc/none) with arrow indicators
- **Selection**: Row click selects, Ctrl+click multi-select, synced with inspection-store
- **Class Resolution**: classNumber resolved to className via lookup map
- **Formatting**: Locale-aware number formatting, zebra striping

### 6.4 Class Lookup

- Table of classNumber, className, classCode
- Computed defect count per class
- Sortable by defect count

### 6.5 File Info Panel

- Sections: Source, Identification, Wafer Geometry, Equipment, Statistics, Parse Warnings
- All metadata from InspectionFile displayed
- File size formatting, defect column listing

### 6.6 Analysis Views

#### Pareto Chart
- Recharts ComposedChart: bars (defect count per class, sorted descending) + cumulative % line
- Custom tooltip with count and percentage

#### Spatial Distribution
- Recharts ScatterChart: xAbs vs yAbs, colored by defect class
- Downsampling for >10k defects: spatial grid bucketing with log-scaled point sizes
- Reversed Y axis matching wafer coordinates

#### Yield Summary Dashboard
- 4 KPI cards: Total Defects, Defect Density (defects/cm²), Die Yield (%), Class Count
- Defect Size Distribution histogram (10 bins)
- Top 20 Defects per Die bar chart

### 6.7 Settings

- Theme selector: Light, Dark, High-Contrast, Cleanroom, System
- Language selector: English, Deutsch (+ planned: Japanese, Korean, Chinese)
- Persisted to localStorage via Zustand persist middleware

---

## 7. Theming

4 themes using CSS custom properties with OKLCH color values:

| Theme | Use Case | Key Properties |
|-------|----------|---------------|
| Light | Default | White bg, blue primary (oklch 0.55 0.19 260) |
| Dark | Low-light | Slate bg (oklch 0.17), brighter blue primary |
| High-Contrast | Accessibility | Pure white/black, maximum chroma accents |
| Cleanroom | Fab environments | Warm white bg (oklch 0.99 0.015 95), navy primary |

Semantic wafer map tokens: `--color-defect-particle`, `--color-die-pass`, `--color-die-fail`, `--color-die-untested`, `--color-wafer-bg`, `--color-wafer-edge`, `--color-wafer-notch`.

OKLCH chosen for perceptual uniformity - defect category colors remain distinguishable across all themes.

---

## 8. Internationalization

- LinguiJS v5 with SWC plugin and Vite integration
- Compile-time safety via `@lingui/vite-plugin`
- ICU MessageFormat for pluralization and CJK support
- Supported locales: en, de, ja, ko, zh
- Detection: localStorage > navigator.language > fallback to 'en'
- Number formatting: `Intl.NumberFormat` with locale, SI units locale-independent

---

## 9. Multi-Platform Strategy

### 9.1 Web
- Standard Vite build, served as SPA
- File System Access API (with `<input type="file">` fallback)
- Deployed to Railway via Dockerfile + nginx

### 9.2 PWA
- vite-plugin-pwa with Workbox service worker
- Precaches app shell and i18n catalogs
- Prompt-based update strategy
- Standalone display mode detection

### 9.3 Desktop (Tauri v2)
- Rust backend with plugins: dialog, fs, opener
- Native file open dialog and direct filesystem access
- Window management (title, min/max size)
- Runtime-only imports prevent Tauri packages from bundling in web builds

---

## 10. Layout

### 10.1 App Shell

```
+--------+----------------------------------------------+
| NavRail|              Content Area                     |
|  Logo  |                                               |
| -------|   Feature page rendered via React Router      |
|  File  |   lazy-loaded Outlet                          |
|  Insp. |                                               |
|  Wafer |                                               |
|  Anal. |                                               |
| -------|                                               |
| Settin.|                                               |
| Collap.|                                               |
+--------+----------------------------------------------+
|              Status Bar                                |
+--------------------------------------------------------+
```

### 10.2 Responsive Behavior

| Breakpoint | NavRail | Content |
|------------|---------|---------|
| Desktop (>=1024px) | Full rail with icons + labels, collapsible | Multi-panel |
| Tablet (768-1023px) | Icon-only rail (48px) | Single panel |
| Mobile (<768px) | Bottom tab bar (56px) | Full-screen views |

### 10.3 Route Structure

```
/                       -> Redirect to /file/open
/file/open              -> FileDropZone
/file/info              -> FileInfoPanel
/inspection/defects     -> DefectTable
/inspection/classes     -> ClassLookupTable
/wafer/map              -> WaferMapCanvas
/analysis/pareto        -> ParetoChart
/analysis/spatial       -> SpatialDistribution
/analysis/yield         -> YieldSummary
/settings               -> SettingsPage
```

---

## 11. State Management

4 independent Zustand stores:

| Store | Responsibility | Persisted |
|-------|---------------|-----------|
| file-store | Parsed files, active file, loading state, parse errors | No |
| inspection-store | Active wafer, defect selection, filters, highlighting | No |
| ui-store | NavRail state, panel sizes, status message | No |
| settings-store | Theme, locale, preferences | Yes (localStorage) |

**Linked Views**: WaferMap, DefectTable, and ScatterPlot share selection state via inspection-store. Clicking a defect in one view highlights it in all others.

---

## 12. Accessibility

- Skip-to-content link at top of AppShell
- ARIA roles and labels on NavRail (`role="navigation"`, `aria-label`)
- `aria-expanded` on collapse/expand button
- `aria-label` on icon-only navigation items
- Keyboard shortcuts: Ctrl+O (open), Escape (clear selection), Ctrl+1-5 (navigate sections), F11 (fullscreen)
- High-contrast theme with maximum chroma and thick borders

---

## 13. Error Handling

- Route-level ErrorBoundary with context labels and retry/home actions
- Toast notification system (Zustand-powered, typed: success/error/warning/info)
- Parse errors displayed in FileDropZone with error details
- Parse warnings displayed in FileInfo panel
- Graceful empty states on all feature pages when no file is loaded

---

## 14. Performance Requirements

- **Parse**: KLARF files up to 100MB with progress reporting via Web Worker
- **Render**: 100k+ defects on Canvas at interactive frame rates (batch rendering)
- **Table**: 100k+ rows via row virtualization (@tanstack/react-virtual)
- **Charts**: Automatic downsampling above 10k defects (spatial bucketing)
- **Build**: Production build under 1 second
- **Bundle**: Lazy-loaded routes, code-split per feature

---

## 15. Deployment

### Railway (Web)
- Multi-stage Dockerfile: Node 22 build + nginx serve
- SPA fallback via `try_files $uri $uri/ /index.html`
- Aggressive caching on `/assets/` (1 year, immutable)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Gzip compression on text assets

### GitHub Actions (CI)
- Triggers on push/PR to main/master
- Steps: npm ci, tsc -b, vitest run, vite build

### Tauri (Desktop)
- GitHub Actions matrix build: Windows, macOS, Linux
- Artifacts uploaded to GitHub Releases
- Auto-update via Tauri updater plugin (planned)

---

## 16. Testing Strategy

| Level | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Parsers, tokenizer, normalizer, registry |
| Component | Vitest + Testing Library | React components (planned) |
| E2E | Playwright | Full user flows (planned) |
| Visual | Manual | Theme verification, responsive layout |

---

## 17. Project Structure

```
lancelot/
  spec/                         # Specification documents
  src/
    core/                       # Domain layer (no UI deps)
      models/                   # InspectionFile, DefectRecord, WaferGeometry, etc.
      parsers/                  # FileFormatAdapter, ParserRegistry
        klarf/                  # KLARF v1.2 + v1.8 parsers
        worker/                 # Web Worker for off-thread parsing
      services/                 # Business logic (planned)
      utils/                    # Coordinate transforms, units, color scales
    stores/                     # Zustand stores
    platform/                   # Platform abstraction (Web/Tauri/PWA)
    features/                   # Feature modules
      file-manager/             # File open, info, recent files
      inspection/               # Defect table, class lookup
      wafer-map/                # Canvas wafer visualization
      analysis/                 # Pareto, spatial, yield charts
      settings/                 # Theme, language, about
    components/
      layout/                   # AppShell, NavRail, StatusBar
      shared/                   # ErrorBoundary, EmptyState, Toast
      ui/                       # Radix UI wrappers (planned)
    hooks/                      # Shared hooks
    i18n/                       # Lingui configuration
    locales/                    # Translation catalogs
    theme/                      # CSS themes + ThemeProvider
    routes/                     # React Router configuration
    lib/                        # Utilities (cn, etc.)
  src-tauri/                    # Tauri v2 Rust backend
  tests/                        # Test files and fixtures
  .github/workflows/            # CI/CD pipelines
  Dockerfile                    # Railway deployment
  nginx.conf                    # Production web server config
  railway.toml                  # Railway configuration
```
