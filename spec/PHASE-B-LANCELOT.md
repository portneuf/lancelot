# Phase 2: Rename @portneuf, npm-Publish, Lancelot-Integration

## Context

Phase 0+1 sind abgeschlossen: 6 Packages + Portal-App deployed auf Railway. Jetzt steht der Uebergang zu einer Multi-Repo-Architektur an, damit Tools (eigene und von Dritten) in separaten Repos entwickelt werden koennen. Das erfordert:
1. Rename `@avalon/*` → `@portneuf/*` (verfuegbar auf npm)
2. Publish der Framework-Packages auf npm
3. Migration des bestehenden Lancelot-Repos (13.5k LoC) als erstes echtes Portal-Tool

## Architektur-Entscheidungen

- **npm-Scope:** `@portneuf/*` (Portal + neuf = 9)
- **Repo-Strategie:** Separate Repos pro Tool, Framework auf npm publiziert
- **Dual-Mode:** Lancelot laeuft standalone UND als Portal-Tool
- **Tool-Loading:** Tools publizieren npm-Package mit ToolRegistration-Export

---

## Phase A: Rename + Publish (Avalon-Repo)

### A.1 — npm-Organisation erstellen
- `@portneuf` auf npmjs.com registrieren

### A.2 — Package-Namen umbenennen
**7 package.json + Dockerfile + changeset config:**
- `@avalon/theme` → `@portneuf/theme` (+ alle 5 weiteren Packages)
- Alle `@avalon/*` Dependency-Referenzen aktualisieren
- `Dockerfile`: `--filter=@avalon/portal` → `--filter=@portneuf/portal`
- `.changeset/config.json`: ignore-Liste

### A.3 — Import-Statements umbenennen
**~15 Source-Dateien in apps/portal/src/:**
- `from '@avalon/...'` → `from '@portneuf/...'`
- CSS-Imports: `@avalon/theme/themes/...` → `@portneuf/theme/themes/...`

### A.4 — Framework-Identifiers umbenennen
**Framework (domain-agnostisch):**
- `AvalonLayout` → `PortalLayout` (6 Dateien)
- localStorage Keys: `avalon-theme` → `portneuf-theme`, `avalon-locale` → `portneuf-locale`, `avalon-layout-` → `portneuf-layout-`

**NICHT umbenennen (Avalon-Branding, Schicht 4):**
- `AvalonAppearanceProvider.tsx`, `AvalonLogo.tsx`, `avalon-config.ts`
- `appName: 'Avalon'` in Branding-Config

### A.5 — Verify Build
- `rm -rf node_modules package-lock.json && npm install`
- `npm run typecheck && npm run test:run && npm run build`

### A.6 — Publish-Pipeline einrichten
- `"publishConfig": { "access": "public" }` in alle 6 Package-JSONs
- Manuelles Publishing erstmal (CI spaeter)

### A.7 — Publish 0.1.0
Reihenfolge (Dependency-Chain):
1. `@portneuf/theme`, `@portneuf/i18n`, `@portneuf/platform`, `@portneuf/plugin-system`
2. `@portneuf/ui` (peerDep: theme)
3. `@portneuf/portal-framework` (peerDep: ui)

**Exit-Gate A:** Alle 6 Packages auf npmjs.com, Portal baut + deployed weiterhin.

---

## Phase B: Lancelot-Migration (Lancelot-Repo)

### B.1 — Package-Struktur scaffolden
- `package.json` mit name `@portneuf/tool-lancelot`
- peerDependencies: react, react-dom, alle @portneuf/* Packages
- dependencies: zustand (Store-intern, kein Peer noetig)

### B.2 — Dual-Mode Entry-Points
**`src/standalone-entry.tsx`** (npm run dev):
- Importiert @portneuf/theme ThemeProvider + CSS
- Importiert @portneuf/i18n I18nProvider + Lancelot-Translations
- Eigenes React-Router Setup, eigene AppShell

**`src/portal-entry.ts`** (npm-Export):
- Exportiert `lancelotRegistration: ToolRegistration`
- Exportiert `lancelotTranslations` fuer Portal-I18n
- Exportiert `lancelotFormatAdapters` fuer FormatRegistry
- KEINE eigenen Provider (Portal liefert die)

### B.3 — I18n-Bridge (LinguiJS → @portneuf/i18n)
- 166 Keys aus LinguiJS-Katalogen als `Record<SupportedLocale, TranslationKeys>` extrahieren
- Keys mit `lancelot.`-Prefix versehen
- `useLancelotTranslation()` Hook: standalone → LinguiJS, portal → @portneuf/i18n
- Mode-Detection via `LancelotModeContext`

### B.4 — Theme-Bridge
- Lancelot-CSS auf `var(--color-*)` Tokens von @portneuf/theme mappen
- Domain-spezifische Tokens (Wafer-Heatmap-Farben) bleiben Lancelot-eigen
- In Portal-Mode: CSS-Variablen kommen vom document root (ThemeProvider)

### B.5 — FormatAdapter-Bridge
- KLARF v1.2, KLARF v1.8, SINF Adapter auf `@portneuf/plugin-system FormatAdapter<T>` mappen
- `probe()`: Confidence-Score basierend auf Header-Analyse
- `parse()`: Synchron fuer Registry-Detection
- Worker-basiertes Parsing bleibt intern in Lancelot (nicht ueber FormatAdapter)

### B.6 — 13 Views als ViewDefinition[] mappen
| View | path | NavItem group |
|------|------|--------------|
| File Manager | `files` | files |
| Wafer Map | `wafer-map` | views |
| Defect Table | `defect-table` | views |
| Pareto | `pareto` | views |
| Yield | `yield` | views |
| Spatial | `spatial` | views |
| Correlation | `correlation` | views |
| Trend | `trend` | views |
| Cluster | `cluster` | views |
| Scratch | `scratch` | views |
| SPC | `spc` | views |
| Classifier | `classifier` | views |
| Classes | `classes` | views |

Jeder View: `React.lazy(() => import('./features/...'))` + optionale Sidebar-Komponente

### B.7 — FileTree fuer Portal Zone A
- `LancelotFileTree.tsx` implementiert `TreePanelProps` Interface
- Zeigt geladene Dateien, Lots, Wafer als Baum
- Liest aus file-store (Zustand)

### B.8 — Zustand-Stores fuer Dual-Mode anpassen
- `file-store` + `inspection-store`: Unveraendert (reine Domain-Stores)
- `ui-store`: Theme/Locale-State ueberspringen in Portal-Mode
- `settings-store`: Platform-Info von Portal uebernehmen in Portal-Mode
- Factory-Funktion `createStore(mode: 'standalone' | 'portal')`

### B.9 — portal-registration.ts zusammenbauen
- Assembliert ToolRegistration aus B.3-B.8
- navItems, views, treeComponent, globalFilters, statusBarSlots, lifecycle

### B.10 — StatusBar-Slots + GlobalFilters
- `FileInfoSlot`: Dateiname, Format, Groesse
- `DefectCountSlot`: Defekt-Zaehler
- `LancelotFilters`: Wrapper um bestehende FilterSidebar

### B.11 — Build + Publish @portneuf/tool-lancelot
- Vite Library-Mode: externalize peerDeps, preserve dynamic imports
- `npm publish --access public`

**Exit-Gate B:** Package auf npm, standalone `npm run dev` funktioniert, Export valid.

---

## Phase C: Portal-Integration (Avalon-Repo)

### C.1 — @portneuf/tool-lancelot installieren
```
npm install @portneuf/tool-lancelot
```

### C.2 — StaticToolLoader aktualisieren
```typescript
this.registrations.set('lancelot', async () => {
  const { lancelotRegistration } = await import('@portneuf/tool-lancelot');
  return lancelotRegistration;
});
```
Lazy-Import: Lancelot-Code nur geladen wenn User das Tool waehlt.

### C.3 — Lancelot-Translations injizieren
```typescript
import { lancelotTranslations } from '@portneuf/tool-lancelot';
// In AvalonAppearanceProvider: extraTranslations={lancelotTranslations}
```

### C.4 — FormatAdapter registrieren
```typescript
import { lancelotFormatAdapters } from '@portneuf/tool-lancelot';
lancelotFormatAdapters.forEach(a => formatRegistry.register(a));
```

### C.5 — Vite Code-Splitting
```typescript
manualChunks: { 'tool-lancelot': ['@portneuf/tool-lancelot'] }
```

### C.6 — Deploy + E2E Verify
- Portal startet, Lancelot im Tool-Switcher waehlbar
- 9-Zonen-Shell zeigt Lancelot: NavRail, FileTree, WaferMap, FilterSidebar, StatusBar
- KLARF/SINF Datei laden → Wafer Map rendert
- Theme-Wechsel funktioniert
- Tool-Switch hin und zurueck ohne Datenverlust
- Performance: Tool-Switch < 500ms

**Exit-Gate C:** Lancelot laeuft als erstes echtes Tool im Portal. 13 Views, Parser, Filter, alle 9 Zonen aktiv.

---

## Reihenfolge und Abhaengigkeiten

```
A.1 → A.2 → A.3 → A.4 → A.5 → A.6 → A.7
                                         ↓
B.1 → B.2 → B.3 ─┐
            B.4 ─┤→ B.9 → B.10 → B.11
       B.5 ─────┤                    ↓
       B.6 ─────┤         C.1 → C.2 → C.3 → C.6
       B.7 ─────┤              C.4 ─┘
       B.8 ─────┘              C.5 ─┘
```

## Aufwand-Schaetzung

| Phase | Schritte | Aufwand |
|-------|----------|---------|
| A | Rename + Publish | 4-6h |
| B | Lancelot-Migration | 20-28h |
| C | Portal-Integration | 4-6h |
| **Gesamt** | | **28-40h** |

## Kritische Dateien

**Avalon-Repo:**
- `packages/portal-framework/src/contracts/tool-registration.ts` — ToolRegistration Interface
- `apps/portal/src/adapters/StaticToolLoader.ts` — Tool-Loading
- `packages/i18n/src/I18nProvider.tsx` — extraTranslations Prop (Zeile 31)
- `packages/plugin-system/src/types.ts` — FormatAdapter Interface

**Lancelot-Repo:**
- `src/portal-registration.ts` — Neuer ToolRegistration Export
- `src/portal-entry.ts` / `src/standalone-entry.tsx` — Dual-Mode
- `src/core/parsers/` — FormatAdapter-Bridge
- `src/stores/` — Dual-Mode Store-Anpassung

## Naechster Schritt

Phase A beginnt im Avalon-Repo: `@avalon/*` → `@portneuf/*` umbenennen und auf npm publizieren. Danach Wechsel zum Lancelot-Repo fuer Phase B.
