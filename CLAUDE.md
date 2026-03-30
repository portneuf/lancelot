# Lancelot — Portneuf Portal Tool Migration

## Kontext

Lancelot ist ein Halbleiter-Inspektions-Tool (KLARF/SINF Viewer) das als **erstes echtes Tool** in das Portneuf Portal-Framework integriert wird.

### Portneuf Framework

Das Portal-Framework ist ein generisches, domain-agnostisches 9-Zonen-Layout-Framework. Es ist als 6 npm-Packages publiziert:

```
npm install @portneuf/portal-framework  # 22 Interfaces, 9-Zonen-Shell, Providers, Hooks
npm install @portneuf/ui                # Button, Dialog, NavRail, AppShell, etc.
npm install @portneuf/theme             # 4 OKLCH-Themes (light/dark/high-contrast/cleanroom)
npm install @portneuf/i18n              # I18n mit extraTranslations-Support
npm install @portneuf/platform          # Web/Tauri/PWA Detection
npm install @portneuf/plugin-system     # FormatAdapter<T> + FormatRegistry
```

**Framework-Repo:** https://github.com/portneuf/portneuf
**Avalon-Repo:** https://github.com/portneuf/avalon
**Portal live:** https://avalon-production-74c6.up.railway.app/
**npm Packages:** https://www.npmjs.com/org/portneuf

### Was Lancelot werden soll

Lancelot wird als `@portneuf/tool-lancelot` auf npm publiziert und exportiert ein `ToolRegistration`-Objekt das das Portal laedt. Gleichzeitig bleibt Lancelot standalone lauffaehig (Dual-Mode).

## Aufgabe: Phase B — Lancelot-Migration

Detaillierter Plan: `spec/PHASE-B-LANCELOT.md`

### Zusammenfassung der Schritte

1. **B.1** Package als `@portneuf/tool-lancelot` umstrukturieren (package.json, Exports)
2. **B.2** Dual-Mode Entry-Points: `src/standalone-entry.tsx` + `src/portal-entry.ts`
3. **B.3** I18n-Bridge: LinguiJS-Kataloge → `@portneuf/i18n` TranslationKeys extrahieren
4. **B.4** Theme-Bridge: CSS auf `var(--color-*)` Tokens mappen
5. **B.5** FormatAdapter-Bridge: KLARF/SINF Parser → `@portneuf/plugin-system` Interface
6. **B.6** 13 Views als `ViewDefinition[]` mappen
7. **B.7** FileTree-Komponente fuer Portal Zone A erstellen
8. **B.8** Zustand-Stores fuer Dual-Mode anpassen
9. **B.9** `portal-registration.ts` zusammenbauen (ToolRegistration)
10. **B.10** StatusBar-Slots + GlobalFilters Wrapper
11. **B.11** Vite Library-Mode Build + npm publish

### Kernregeln

- **Domain-Code (core/) bleibt unveraendert** — Parser, Models, Services sind framework-agnostisch
- **Dual-Mode** — Standalone via `npm run dev` (eigene AppShell) UND Portal-Export via `@portneuf/tool-lancelot`
- **Keine eigenen Provider im Portal-Mode** — Theme, I18n, Platform kommen vom Portal
- **PortalIcon Type** — `React.ComponentType<{ size?: number; className?: string }>` (kein `style` Prop!)
- **Alle Texte Englisch** (Code), **Deutsch** (UI-Labels)
- **Solo-Entwickler, TypeScript strict mode**

### Das ToolRegistration Interface

```typescript
interface ToolRegistration {
  id: string;                    // 'lancelot'
  name: string;                  // 'Lancelot'
  subtitle: string;              // 'Semiconductor Inspection'
  version: string;               // '0.1.0'
  icon: PortalIcon;              // Hexagon from lucide-react
  basePath: string;              // '/lancelot'
  navItems: NavItem[];           // Left NavRail items
  views: ViewDefinition[];       // Lazy-loaded view components
  defaultViewPath: string;       // 'wafer-map'
  treeComponent?: LazyComponent<TreePanelProps>;  // File tree
  globalFilters?: LazyComponent; // Filter sidebar
  statusBarSlots: StatusBarSlot[];
  panelConstraints?: PanelConstraints;
  lifecycle: ToolLifecycle;      // onActivate, onDeactivate
}
```

### Lancelot's 13 Views → ViewDefinition Mapping

| View | path | NavItem group | Icon |
|------|------|--------------|------|
| File Manager | `files` | files | FolderOpen |
| Wafer Map | `wafer-map` | views | Hexagon |
| Defect Table | `defect-table` | views | Table |
| Pareto | `pareto` | views | BarChart3 |
| Yield | `yield` | views | TrendingUp |
| Spatial | `spatial` | views | ScatterChart |
| Correlation | `correlation` | views | GitCompare |
| Trend | `trend` | views | LineChart |
| Cluster | `cluster` | views | CircleDot |
| Scratch | `scratch` | views | Slash |
| SPC | `spc` | views | Activity |
| Classifier | `classifier` | views | Brain |
| Classes | `classes` | views | Tags |

### Portal-Entry Export Shape

```typescript
// src/portal-entry.ts — was das Portal importiert
export { lancelotRegistration } from './portal-registration.js';
export { lancelotTranslations } from './i18n/portneuf-catalog.js';
export { lancelotFormatAdapters } from './core/parsers/portneuf-adapters.js';
```

## Status: Phase B abgeschlossen, Integration getestet

Phase B ist umgesetzt. Lancelot laeuft als Tool im Avalon-Portal (https://avalon-production-74c6.up.railway.app/). NavRail zeigt 14 Views korrekt uebersetzt.

### Offene Punkte (in dieser Session umsetzen!)

1. **useLancelotTranslation Bridge fixen** — Im Portal-Modus zeigen Lancelot-interne Views ihre i18n-Keys als rohen Text (z.B. `lancelot.waferMap.openFileToView` statt uebersetzter Text). Der `useLancelotTranslation()` Hook muss im Portal-Modus den `@portneuf/i18n` `useTranslation()` Hook nutzen statt LinguiJS. Die NavRail-Labels funktionieren bereits (die laufen ueber das Framework), aber alle `t()`-Aufrufe innerhalb der Lancelot-Views muessen ebenfalls aufgeloest werden.

2. **Visuelles Feintuning** — Lancelot-Views im Portal-Kontext visuell pruefen. CSS Custom Properties (`var(--color-*)`) muessen korrekt angewendet werden. Die Domain-Tokens (`lancelot-domain-tokens.css`) muessen geladen sein.

3. **File-Upload testen** — Drag & Drop / File Open fuer KLARF/SINF Dateien muss im Portal-Modus funktionieren. Der FileTree (Zone A) und die Filter-Sidebar (Zone C) muessen sich korrekt fuellen.

### Workflow nach Aenderungen

Nach jeder Aenderung in diesem Repo:
```bash
npm run build:lib          # dist/ neu bauen
git add dist/ && git commit && git push   # dist/ committen
```
Dann im Avalon-Repo (separate Session):
```bash
npm install                # holt neuesten main von GitHub
npm run build && git push  # Railway deployed automatisch
```

### Wichtige Dateien im Portneuf-Framework

Falls du Interfaces nachschlagen musst:
- `ToolRegistration`: https://www.npmjs.com/package/@portneuf/portal-framework → contracts/tool-registration
- `FormatAdapter<T>`: https://www.npmjs.com/package/@portneuf/plugin-system → types
- `NavItem`, `ViewDefinition`, `StatusBarSlot`: in @portneuf/portal-framework contracts
- `ThemeProvider`, `useTheme`: @portneuf/theme
- `I18nProvider`, `useTranslation`, `extraTranslations` Prop: @portneuf/i18n
