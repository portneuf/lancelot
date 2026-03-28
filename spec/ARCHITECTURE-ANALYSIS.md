# Lancelot - Software Architecture Analysis

Stand: 2026-03-28

---

## Executive Summary

Lancelot ist architektonisch solide aufgebaut: Die Clean-Architecture-Schichtung wird konsequent eingehalten, der Parser-Plugin-Mechanismus ist gut durchdacht, und die Performance-Optimierungen (Canvas Batching, Virtualisierung, Web Worker) sind fuer den Anwendungsfall angemessen. Die groessten Luecken liegen bei **fehlenden Component Tests**, **fehlenden CSP-Headern**, und **Skalierungsproblemen bei grossen Dateien (100k+ Defekte)**.

### Gesamtbewertung

| Dimension | Note | Kritische Probleme | Staerken |
|-----------|------|-------------------|----------|
| Layer-Architektur | A- | Worker ohne SINF-Adapter | Keine zirkulaeren Abhaengigkeiten, saubere Domain-Isolation |
| State Management | B+ | Skalierbarkeit bei grossen Dateien | Gut segmentiert, keine God-Stores |
| Parser-Plugin-System | A- | SINF ohne withMeta, Worker-Luecke | Exzellenter probe/parse-Vertrag |
| Komponenten-Architektur | B+ | WaferMapPage zu gross (556 Zeilen) | Effektives Code-Splitting, saubere Hooks |
| Performance | B | bySize bricht Batching, linearer Hit-Test | Frustum Culling, Batch-Draws, Worker-Parsing |
| Querschnittsaspekte | B | Doppelte Theme-Quelle, ErrorBoundary nicht i18n | Umfassendes Theming, 5-Sprachen i18n |
| Build & Deployment | B- | Kein CSP, CI unvollstaendig | Sauberer Docker Multi-Stage, gute nginx-Config |
| Testing | C+ | **Keine Component Tests** | Exzellente Parser-Testabdeckung |
| Sicherheit | B | Kein CSP nirgends | Keine XSS-Vektoren, keine Secrets |
| Code-Qualitaet | A- | Minimaler Dead State | Strikte TS-Config, konsistente Konventionen |

---

## 1. Layer-Architektur & Abhaengigkeitsrichtung

### Staerken
- Saubere 4-Schichten-Architektur: `core/` (Domain) → `stores/` (State) → `features/` (Feature-Module) → `components/` (Shared UI)
- **Die Domain-Schicht (`src/core/`) hat null Imports aus UI, Stores, Hooks, Features oder Routes** - verifiziert per Grep
- Domain Models sind reine TypeScript-Interfaces mit `export type` - vollstaendig compile-time-erasable
- Composition Root (`App.tsx`) ist minimal und ordnet Provider korrekt: I18n > Theme > Platform > Router

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| Web Worker registriert nur KlarfAdapter, nicht SinfAdapter | Mittel | SINF-Dateien fallen auf Main-Thread-Fallback zurueck |
| Stiller Catch bei Adapter-Registrierung | Niedrig | Koennte echte Fehler maskieren |

### Empfehlung
SinfAdapter im Web Worker registrieren. Shared `initializeRegistry()` Funktion fuer beide Kontexte nutzen.

---

## 2. State Management

### Staerken
- 4 fokussierte Stores: FileState, InspectionState, UIState, SettingsState (je <80 Zeilen)
- Keine God-Stores, klare Verantwortlichkeitsgrenzen
- `persist` Middleware korrekt mit `partialize` fuer selektive Persistierung
- Filter-State nutzt `Set<number>` fuer O(1) Lookups bei grossen Defektmengen

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| Skalierbarkeit bei grossen Dateien | Mittel | Vollstaendige InspectionFile-Objekte in Map gespeichert, keine Pagination |
| Doppelter `useFilteredDefects`-Aufruf | Niedrig | AppShell und FilterSidebar rufen beide den Hook auf |
| Potentielle Race Condition | Niedrig | Asynchroner useEffect-Sync von filteredDefectIds |

### Empfehlung
`useFilteredDefects` Deduplizierung durch Zustand-Middleware oder Single-Provider statt mehrfachem Hook-Aufruf.

---

## 3. Parser-Plugin-System

### Staerken
- Wohldefinierter Plugin-Vertrag: `probe()` → Konfidenz 0-1, `parse()` → Discriminated Union `ParseResult`
- Robuste Dual-Heuristik: Extension-Matching + Content-Probing
- Format-agnostisch: KLARF (v1.2 + v1.8) und SINF produzieren identische `InspectionFile`-Struktur
- Sauberes Web Worker Protokoll (progress/complete/error)

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| SinfAdapter hat kein `.withMeta()` | Mittel | Dateiname immer 'unknown.sinf' |
| Extension-Match Fallthrough | Niedrig | Bei Probe-Score 0 wird auf alle Adapter zurueckgefallen |
| Kein dynamisches Plugin-Loading | Niedrig | Neue Adapter erfordern Code-Aenderung |

### Empfehlung
`.withMeta()` fuer SinfAdapter nachruestens. Extension-Match-Verhalten ueberdenken.

---

## 4. Komponenten-Architektur

### Staerken
- Saubere Composition: AppShell orchestriert NavRail, ContentArea, FilterSidebar, StatusBar
- Effektives Code-Splitting via React Router `lazy` mit `lazyPage()` Helper
- Route Guards (`RequireFile`) verhindern leere Zustaende
- Responsive NavRail → Bottom-Tab-Bar auf Mobile
- Feature-Module sind selbstenthalten mit eigenen components/, hooks/, utils/

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| WaferMapPage zu gross (556 Zeilen) | Mittel | Mischt Selection-Rectangle, Zoom, Legend, Canvas-Interaktion |
| Linearer Die-Lookup bei Hover | Niedrig | `.find()` auf allen Dies bei jedem Render |

### Empfehlung
Selection-Rectangle-Logik in eigenen `useRectangleSelection` Hook extrahieren. Dies per `(xIndex, yIndex)` Map indexieren.

---

## 5. Performance-Architektur

### Staerken
- Canvas: Frustum Culling, Batch-Rendering (single beginPath/fill), RAF-Throttling
- Farbschema gecacht in useRef, aktualisiert via MutationObserver
- Tabelle: @tanstack/react-virtual mit 32px Zeilenhoehe, 20 Row Overscan
- Debouncing: 150ms auf Filter-Slidern mit sofortigem Local-State-Feedback
- Web Worker fuer Parsing

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| `bySize` Farbmodus: Individuelles beginPath/fill pro Defekt | Mittel | Bricht Batch-Optimierung, langsam bei 100k+ |
| `hitTestDefect()`: O(n) linearer Scan | Mittel | Langsam bei 100k+ Defekten |
| DBSCAN: O(n²) Region Queries | Mittel | Problematisch bei 10k+ Defekten |
| DynamicFilterPanel: Histogramm-Neuberechnung | Niedrig | useMemo mildert ab |

### Empfehlung
`bySize`: Groessen in Buckets quantisieren, pro Bucket batch-rendern. Spatial Index (Grid-Hash) fuer Hit-Testing. DBSCAN in Web Worker auslagern.

---

## 6. Querschnittsaspekte

### Staerken
- 4 OKLCH-Themes mit semantischen Wafer-Map-Tokens
- System-Theme-Erkennung via `useSyncExternalStore` + `matchMedia`
- 5 Locales (en/de/ja/ko/zh) mit 166 Keys, dynamisches Catalog-Loading
- Route-Level Error Boundaries mit Kontext-Labels
- Zustand-basiertes Toast-System mit Auto-Dismiss

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| Doppelte Theme-Quelle | Mittel | ThemeProvider (localStorage) und SettingsStore (Zustand persist) verwalten Theme unabhaengig |
| ErrorBoundary nicht internationalisiert | Mittel | "Something went wrong", "Try again" sind hardcoded English |
| Kein globaler Promise-Rejection-Handler | Niedrig | Async-Fehler ausserhalb React-Render bleiben ungemeldet |

### Empfehlung
Theme-State auf eine einzige Quelle konsolidieren. ErrorBoundary-Texte mit t() wrappen.

---

## 7. Build & Deployment

### Staerken
- Vite mit SWC React, Tailwind v4, Lingui Integration
- Tauri-Detection via TAURI_ENV_PLATFORM
- Multi-Stage Dockerfile (Node 22 Alpine Build + Nginx Alpine Serve)
- Nginx: SPA Fallback, aggressive Caching, Security Headers, Gzip
- CI: TypeScript Check, Unit Tests, Production Build

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| Kein CSP-Header in nginx.conf | Mittel | Keine Script-Source-Restriktion |
| CSP deaktiviert in Tauri (`"csp": null`) | Mittel | Kein Schutz im Desktop-Build |
| CI fuehrt keine E2E-Tests aus | Mittel | Playwright-Tests existieren aber werden nicht ausgefuehrt |
| CI fuehrt kein Linting aus | Niedrig | `npm run lint` fehlt im Workflow |
| Keine Sourcemaps in Produktion | Niedrig | Debugging erschwert |

### Empfehlung
CSP-Header in nginx.conf und tauri.conf.json hinzufuegen. E2E-Tests und Linting in CI aufnehmen.

---

## 8. Testing-Strategie

### Staerken
- Parser-Tests exzellent: Probe-Scoring, Full-Parse, Coordinate-Computation, Error-Handling, Progress
- Generator Round-Trip-Tests: Generate → Parse verifiziert Konsistenz
- E2E-Tests: Startup, Navigation, Theme-Switching, Drag-and-Drop, Daten-Anzeige

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| **Keine React Component Tests** | **Kritisch** | Kein einziger @testing-library/react Test trotz installierter Dependency |
| Keine Store-Tests | Mittel | Filter-Logik und File-Management ungetestet |
| Keine Hook-Tests | Mittel | useFilteredDefects, useFileOpen ungetestet |
| Keine Integration-Tests | Mittel | File-Open-Pipeline (Read → Parse → Store → Navigate) ungetestet |
| E2E nur Chromium | Niedrig | Firefox/Safari nicht abgedeckt |

### Empfehlung
**Hoechste Prioritaet:** Component Tests fuer DefectTable, FilterSidebar, NavRail. Store-Tests fuer Filter-Logik. Hook-Tests fuer useFilteredDefects.

---

## 9. Sicherheit

### Staerken
- Kein `dangerouslySetInnerHTML` im gesamten Codebase
- Kein `eval()`, `new Function()` oder `innerHTML` in Quellcode
- Keine .env-Dateien oder hardcoded Secrets
- File-Parsing rein textbasiert, keine Code-Execution aus Datei-Inhalten
- File API: Dateien werden nur als Text gelesen

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| Kein CSP in Tauri | Mittel | XSS im Webview haette volle Ausfuehrungsrechte |
| Kein CSP in nginx | Mittel | Keine Script-Source-Restriktion |
| .env nicht in .gitignore | Niedrig | Praeventive Massnahme fehlt |
| Kein npm audit in CI | Niedrig | Vulnerability-Check fehlt |

### Empfehlung
CSP-Header ueberall hinzufuegen. `.env*` in .gitignore aufnehmen. `npm audit` in CI.

---

## 10. Code-Qualitaet

### Staerken
- **TypeScript Strict Mode** komplett: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`
- Konsistente Namenskonventionen: camelCase (Dateien/Variablen), PascalCase (Komponenten/Types), kebab-case (CSS)
- `@/` Pfad-Alias durchgaengig
- `import type` korrekt verwendet (enforced via `verbatimModuleSyntax`)
- JSDoc-Dokumentation auf Domain-Interfaces
- Konsistentes Error-Handling: ParseResult Discriminated Unions

### Probleme

| Problem | Schwere | Detail |
|---------|---------|--------|
| `rotation` State im WaferMapPage nicht im Renderer genutzt | Niedrig | Dead State oder unvollstaendiges Feature |
| `readColorScheme()` ausserhalb von Hook/Effect | Niedrig | Inkonsistentes Pattern |
| `useFileOpen` zu komplex (183 Zeilen) | Niedrig | Mischt Worker und Main-Thread Logik |

### Empfehlung
Worker-Parsing-Logik aus useFileOpen in eigenen Hook extrahieren. Ungenutzten State entfernen oder Feature vervollstaendigen.

---

## Top 5 Handlungsempfehlungen (priorisiert)

| # | Aktion | Schwere | Aufwand |
|---|--------|---------|---------|
| 1 | **React Component Tests hinzufuegen** (DefectTable, FilterSidebar, NavRail) | Kritisch | 6-8h |
| 2 | **CSP-Header hinzufuegen** (nginx.conf + tauri.conf.json) | Mittel | 1h |
| 3 | **Web Worker SINF-Registrierung fixen** + SinfAdapter.withMeta() | Mittel | 1h |
| 4 | **bySize Rendering optimieren** (Bucket-Batching statt per-Defekt) | Mittel | 2-3h |
| 5 | **CI erweitern** (E2E Tests, Linting, npm audit) | Mittel | 1-2h |

---

## Architektur-Diagramm (Ist-Zustand)

```
                    ┌─────────────────────────────────┐
                    │         App.tsx                  │
                    │  I18nProvider > ThemeProvider     │
                    │  > PlatformProvider > Router      │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐
        │  NavRail   │  │ ContentArea │  │ FilterSidebar│
        │  (Layout)  │  │  (Router)   │  │  (Global)    │
        └────────────┘  └──────┬──────┘  └──────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
     ┌─────▼─────┐     ┌──────▼──────┐    ┌──────▼──────┐
     │ FileManager│     │  WaferMap   │    │  Analysis   │
     │ Inspection │     │  (Canvas)   │    │  (Recharts) │
     └─────┬─────┘     └──────┬──────┘    └──────┬──────┘
           │                   │                   │
     ┌─────▼───────────────────▼───────────────────▼─────┐
     │              Zustand Stores                        │
     │  file-store | inspection-store | settings-store    │
     └─────────────────────┬─────────────────────────────┘
                           │
     ┌─────────────────────▼─────────────────────────────┐
     │              Domain Layer (core/)                   │
     │  models/ | parsers/ | services/ | utils/           │
     │  ┌─────────────┐  ┌───────────────┐               │
     │  │ KlarfAdapter │  │ SinfAdapter   │               │
     │  │ (v1.2+v1.8) │  │ (Wafer Map)   │               │
     │  └──────┬──────┘  └───────────────┘               │
     │         │                                          │
     │  ┌──────▼──────┐                                   │
     │  │ Web Worker   │  (Off-Thread Parsing)            │
     │  └─────────────┘                                   │
     └────────────────────────────────────────────────────┘
```
