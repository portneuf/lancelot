# Lancelot - Projekt-Ueberblick

Stand: 28. Maerz 2026 | Version: 0.4.0 | Repository: github.com/RogerWilloughby/lancelot

---

## Was ist Lancelot?

Lancelot ist ein kostenloser, quelloffener Semiconductor Inspection File Viewer. Die Anwendung ermoeglicht das Laden, Visualisieren und Analysieren von Wafer-Inspektionsdaten aus der Halbleiterfertigung. Sie laeuft als Web-App, Progressive Web App (PWA) und Desktop-Anwendung (Tauri v2).

Lancelot ist das **einzige kostenlose, interaktive, web-basierte Tool** in diesem Marktsegment und schliesst eine Luecke zwischen teuren Enterprise-Loesungen (KLA Klarity, Exensio, yieldWerx) und minimalen Python-Bibliotheken (klarfkit, wafer-map).

---

## Projekt-Statistik

| Kennzahl | Wert |
|----------|------|
| Dateien im Repository | 159 |
| Zeilen Code (TS/TSX/CSS/PY) | 15.742 |
| Unit Tests | 51 (bestanden) |
| E2E Tests | 6 (Playwright) |
| Git Commits | 25 |
| Unterstuetzte Dateiformate | 2 (KLARF v1.2/v1.8, SINF) |
| Analyse-Views | 11 |
| Sprachen (i18n) | 5 (en, de, ja, ko, zh) |
| UI Themes | 4 (Light, Dark, High-Contrast, Cleanroom) |
| Uebersetzungs-Keys | 166 pro Sprache |

---

## Tech Stack

| Schicht | Technologie | Version |
|---------|------------|---------|
| Framework | React | 19 |
| Sprache | TypeScript | 5.9 (strict mode) |
| Build | Vite | 8 |
| Styling | Tailwind CSS | v4 (OKLCH, @theme) |
| State | Zustand | 5 |
| Routing | React Router | v7 (lazy loading) |
| UI Primitives | Radix UI | Latest |
| Icons | Lucide React | Latest |
| Charts | Recharts | 3 |
| i18n | LinguiJS | v5 |
| Virtualisierung | @tanstack/react-virtual | 3 |
| Desktop | Tauri | v2 |
| PWA | vite-plugin-pwa | 1.2 |
| Tests | Vitest + Playwright | Latest |
| CI/CD | GitHub Actions | Node 22 |
| Deployment | Railway | Dockerfile + nginx |

---

## Architektur

```
+-------------------------------------------------------------------+
|                        UI LAYER                                    |
|  15 Feature-Pages (lazy loaded), Radix UI, Recharts, Tailwind v4  |
+-------------------------------------------------------------------+
|                      STATE LAYER (Zustand)                         |
|  file-store | inspection-store | ui-store | settings-store         |
+-------------------------------------------------------------------+
|                     PLATFORM LAYER                                 |
|  Web (File API) | Tauri (native fs) | PWA (ServiceWorker)         |
+-------------------------------------------------------------------+
|                      DOMAIN LAYER (core/)                          |
|  Parser-Plugins (KLARF, SINF) | Services | Models | Utils         |
+-------------------------------------------------------------------+
```

**Architektur-Prinzipien:**
- Clean Architecture: Domain-Schicht hat null Abhaengigkeiten zu UI/React
- Plugin-Adapter Pattern: Neue Dateiformate durch Implementierung von `FileFormatAdapter`
- 4 unabhaengige Zustand-Stores (kein God-Store)
- Web Worker fuer Off-Thread-Parsing
- Canvas-basiertes Wafer-Map-Rendering mit Batch-Optimierung

---

## Features

### Datei-Management
- Drag & Drop / File Picker fuer KLARF und SINF Dateien
- In-App KLARF-Generator mit 4 Verteilungs-Modi (Random, Edge-Heavy, Clustered, Mixed)
- WM-811K Dataset Konverter (Python, 811.457 Wafer Maps)
- Inspektions-Historie (IndexedDB)
- Automatische Format-Erkennung (Extension + Content-Probing)
- Web Worker Parsing mit Fortschrittsbalken

### Wafer Map Visualisierung
- HTML5 Canvas fuer 100k+ Defekte
- Die-Grid mit Dichte-Farbcodierung (gruen-rot Gradient)
- 4 Defekt-Farbmodi: Uniform, By Class, By Size, By Cluster
- Pan/Zoom (Mausrad + Drag + Touch Pinch)
- Notch-Rotation (0/90/180/270°)
- Shift+Drag Rechteck-Selektion
- Filter-Dimming (nicht-passende Defekte bei 10% Opacity)
- Wafer-Overlay Panel (Multi-File Layer)
- Floating Toolbar + Legende + Die-Info Panel

### Defekt-Analyse
- Virtualisierte Defekt-Tabelle (100k+ Zeilen, sortierbar)
- Dynamische Spalten aus defectSchema
- Defekt-Detail-Panel (Slide-In, Prev/Next Navigation)
- Klassen-Lookup Tabelle mit Defekt-Zaehlung

### Globale Filter
- Rechte Seitenleiste (FilterSidebar), von jeder Seite zugaenglich
- Klassen-Chip-Toggles
- Range-Slider fuer alle numerischen Spalten mit Histogram-Vorschau
- Text-Suche
- Debounced Store-Updates (150ms)
- Alle Views reagieren auf Filter (WaferMap, Tabelle, Charts)

### Analyse-Views (11 Seiten)

| View | Beschreibung |
|------|-------------|
| **Pareto** | Bar + kumulative %-Linie nach Defektklasse |
| **Spatial** | Scatter-Plot (xAbs/yAbs) mit Downsampling >10k |
| **Yield** | 4 KPI-Karten + Size-Histogram + Defects-per-Die |
| **Correlation** | X/Y-Achsen-Dropdown, Pearson R, Regressionslinie |
| **Trend** | Lot-Level oder Per-Die Trend mit UCL/LCL |
| **Cluster (DBSCAN)** | Dichtbasierte Cluster-Erkennung, epsilon/minPoints Slider |
| **Scratch (RANSAC)** | Lineare Pattern-Erkennung mit SVG-Overlay |
| **SPC** | Control Charts mit 3-sigma UCL/LCL, OOC-Markierung |
| **Classifier** | Regelbasierte Klassifikation, 6 Regeln, Pie-Chart |
| **File Info** | Vollstaendige Metadaten in 6 Sektionen |
| **Class Lookup** | Klassen-Tabelle mit Defekt-Zaehlung |

### Export
- CSV (Defekt-Tabelle mit Klassen-Aufloesung)
- PNG (WaferMap Canvas mit weissem Hintergrund)
- PDF (1-Seiten-Report mit Metadaten + WaferMap + Statistiken)

### Platform & UX
- Web-App (Railway Deployment)
- Desktop (Tauri v2 mit nativen File-Dialogen)
- PWA (Service Worker, Offline-faehig)
- 4 OKLCH-Themes (Light, Dark, High-Contrast, Cleanroom)
- 5 Sprachen (en, de, ja, ko, zh) mit 166 Keys
- Responsive NavRail → Bottom-Tab-Bar auf Mobile
- Keyboard Shortcuts (Ctrl+O, Escape, Ctrl+1-5, F11)
- Skip-to-Content Link, ARIA Labels, Focus Management
- Toast-Notifications, Error Boundaries mit i18n

---

## Datei-Formate

### KLARF (KLA Results File)
- **v1.2:** Flat keyword/value Format, semicolon-delimited
- **v1.8:** Hierarchisches Record/Field/List Format mit Brace-Nesting
- Unterstuetzte Sektionen: FileVersion, InspectionStationID, LotID, WaferID, DiePitch, DieOrigin, SampleCenterLocation, DefectRecordSpec, DefectList, SummaryList, ClassLookup, SampleTestPlan, EndOfFile
- Dynamische Spalten (jede KLARF-Rezeptur hat andere DefectRecordSpec-Spalten)

### SINF (Simplified INF)
- Die-Level Wafer Map Format (keine Defekt-Level-Daten)
- Header (DEVICE, LOT, WAFER, FNLOC, ROWCT, COLCT, BCEQU, XDIES, YDIES)
- Bin-Code Grid (00-0A pass, 0B-F0 fail, __ no die, @@ untested, FF reference)

### WM-811K Dataset
- Python-Konverter: `scripts/wm811k-to-klarf.py`
- 811.457 Wafer Maps aus realer Halbleiterfertigung
- 8 Defekt-Muster: Center, Donut, Edge-Loc, Edge-Ring, Loc, Near-full, Random, Scratch

---

## Projekt-Struktur

```
lancelot/
  src/
    core/                         # Domain Layer (kein UI-Dependency)
      models/                     # InspectionFile, DefectRecord, WaferGeometry (7 Dateien)
      parsers/
        klarf/                    # KLARF v1.2 + v1.8 (6 Dateien)
        sinf/                     # SINF Wafer Map (4 Dateien)
        worker/                   # Web Worker Parsing (2 Dateien)
      services/                   # DBSCAN, Scratch, Classifier, IndexedDB (4 Dateien)
      utils/                      # Koordinaten, Units, Farbskalen (3 Dateien)
    stores/                       # 4 Zustand Stores + Index (5 Dateien)
    platform/                     # Web/Tauri/PWA Abstraction (6 Dateien)
    features/
      file-manager/               # Drop Zone, Generator Dialog, History (5 Dateien)
      inspection/                 # DefectTable, Classes, Filter, Detail (8 Dateien)
      wafer-map/                  # Canvas Renderer, Zoom/Pan, Overlay (6 Dateien)
      analysis/                   # 9 Analyse-Seiten (9 Dateien)
      export/                     # CSV, PNG, PDF Export (4 Dateien)
      settings/                   # Theme, Sprache, About (1 Datei)
    components/
      layout/                     # AppShell, NavRail, StatusBar, FilterSidebar (9 Dateien)
      shared/                     # ErrorBoundary, EmptyState, Toast, RangeSlider (4 Dateien)
    hooks/                        # useMediaQuery, useFilteredDefects, etc. (5 Dateien)
    i18n/                         # Lingui Config, useTranslation Hook (2 Dateien)
    locales/                      # 5 Sprachen x 166 Keys (5 Dateien)
    theme/                        # 4 OKLCH Themes, ThemeProvider (2 Dateien)
    routes/                       # React Router Config, Guards (2 Dateien)
  src-tauri/                      # Tauri v2 Rust Backend (5 Dateien)
  scripts/                        # KLARF Generator + WM-811K Konverter (2 Dateien)
  tests/
    unit/                         # Parser, Store, Component Tests (7 Dateien)
    e2e/                          # Playwright E2E Tests (1 Datei)
    fixtures/                     # KLARF + SINF Test-Dateien (4 Dateien)
  spec/                           # Dokumentation (9 Dateien)
  .github/workflows/              # CI, Deploy, Tauri Build (3 Dateien)
```

---

## Test-Abdeckung

| Kategorie | Tests | Dateien |
|-----------|-------|---------|
| KLARF Tokenizer | 12 | klarf-tokenizer.test.ts |
| KLARF Parser (v1.2 + v1.8) | 7 | klarf-parser.test.ts |
| SINF Parser | 3 | sinf-parser.test.ts |
| KLARF Generator (Round-Trip) | 12 | klarf-generator.test.ts |
| NavRail Component | 4 | NavRail.test.tsx |
| Inspection Store | 13 | inspection-store.test.ts |
| **Unit Tests gesamt** | **51** | **7 Dateien** |
| E2E (Playwright) | 6 | app.spec.ts |
| **Gesamt** | **57** | **8 Dateien** |

---

## CI/CD Pipeline

```
Push/PR to main
    │
    ├── CI Job (ubuntu-latest)
    │   ├── npm ci
    │   ├── ESLint
    │   ├── TypeScript Check (tsc -b)
    │   ├── Unit Tests (vitest run)
    │   ├── Production Build (vite build)
    │   └── npm audit
    │
    ├── E2E Job (nach CI)
    │   ├── Playwright Install
    │   ├── E2E Tests
    │   └── Report Upload bei Fehler
    │
    ├── Deploy Job (nur main push)
    │   └── Railway Auto-Deploy via Dockerfile
    │
    └── Tauri Build (nur Tags v*)
        ├── Windows (x86_64-pc-windows-msvc)
        ├── macOS (aarch64-apple-darwin)
        └── Linux (x86_64-unknown-linux-gnu)
```

---

## Deployment

| Plattform | URL / Methode | Status |
|-----------|--------------|--------|
| Web | Railway (Dockerfile + nginx) | Deployed |
| Desktop | Tauri v2 (GitHub Releases) | Build-Pipeline vorhanden |
| PWA | Automatisch via vite-plugin-pwa | Aktiv |

**Security:**
- CSP-Header in nginx.conf und tauri.conf.json
- X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Kein `dangerouslySetInnerHTML`, kein `eval()`
- .env* in .gitignore

---

## Dokumentation (spec/)

| Dokument | Inhalt |
|----------|--------|
| SPECIFICATION.md | Vollstaendige App-Spezifikation (17 Sektionen) |
| COMPETITIVE-ANALYSIS.md | 9 Marktloesungen, 60+ Features verglichen |
| ROADMAP-FEATURES.md | Release 0.2-0.4 Feature-Plan (15 Features) |
| ARCHITECTURE-ANALYSIS.md | 10-Dimensionen Architektur-Analyse |
| MARKET-ANALYSIS.md | Marktgroesse, Wachstum, Positionierung |
| REMAINING-ITEMS.md | Verbleibende offene Punkte (priorisiert) |
| SLIDER-FILTERS.md | Spec fuer dynamische Range-Slider |
| KLARF-GENERATOR.md | Spec fuer KLARF Test-Datei-Generator |
| TODO.md | Erledigte und offene Items |
| PROJECT-OVERVIEW.md | Dieses Dokument |

---

## Release-Historie

| Release | Datum | Features |
|---------|-------|----------|
| **0.1** (Phase 1-6) | 28.03.2026 | Foundation, KLARF Parser, WaferMap, DefectTable, Charts, PWA, Tauri, Error Handling, Accessibility, CI |
| **0.2** | 28.03.2026 | Export CSV/PNG/PDF, Defekt-Farbe nach Klasse/Groesse, Detail-Panel, Overlay, Notch-Rotation |
| **0.3** | 28.03.2026 | DBSCAN Clustering, Scratch Detection, Trend, SPC, Lasso-Select, Korrelation |
| **0.4** | 28.03.2026 | SINF Parser, IndexedDB History, Image Viewer, Rule-Based Classifier |
| **Post-Release** | 28.03.2026 | Globale Filter-Sidebar, i18n Integration (166 Keys x 5 Sprachen), WM-811K Konverter, Architektur-Fixes |

---

## Verbleibende Offene Punkte

| Prioritaet | Item | Aufwand |
|------------|------|---------|
| 1 | Component Tests erweitern | 4-8h |
| 2 | Parser Edge-Case Tests | 3-5h |
| 3 | Mobile Layout Tuning | 4-8h |
| 4 | Streaming Parser >100MB | 6-10h |
| 5 | STDF Parser (Binaer-Format) | 20-40h |
| 6 | PostgreSQL Backend | 40-80h |
| 7 | ML-basierte ADC (TensorFlow.js) | 60-100h |

---

## Markt-Positionierung

- **Yield Management Software Markt:** $1.4 Mrd. (2024), CAGR 9.7%
- **Zielgruppe 1:** Universitaeten/Forschung (keine Konkurrenz, Wachstum +15-20% p.a.)
- **Zielgruppe 2:** Startup-Fabs / Small Volume (Budget-sensibel)
- **Alleinstellung:** Einziges kostenloses, interaktives, web-basiertes Tool mit vollem Feature-Set
