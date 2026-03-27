# Lancelot Roadmap: Features aus Marktanalyse

Basierend auf der Competitive Analysis (spec/COMPETITIVE-ANALYSIS.md) werden die kritischen und mittleren Luecken in 3 Releases strukturiert.

---

## Release 0.2: Core Parity (Hoechste Prioritaet)

Ziel: Lancelot auf das Niveau der besten kostenlosen Tools (KlarfView, klarfkit) plus die wichtigsten Enterprise-Features bringen.

### F1: Export-System (CSV, PNG, PDF)

**Scope:**
- CSV-Export der Defekt-Tabelle (gefiltert oder ungefiltert)
- PNG-Export der WaferMap (Canvas -> Blob -> Download)
- PDF-Report mit WaferMap, Statistiken, Metadaten (1-Seiter)
- SVG-Export der Recharts-Diagramme

**Implementierung:**
- `src/features/export/` Feature-Modul
- `ExportMenu` Dropdown in Toolbar (Lucide: Download icon)
- CSV: `Papa Parse` oder manuell aus DefectRecord[]
- PNG: `canvas.toBlob()` -> `URL.createObjectURL()` -> Download
- PDF: `@react-pdf/renderer` oder `jsPDF` + html2canvas
- SVG: Recharts-interner SVG-Zugriff via ref

**Dateien:**
- `src/features/export/export-csv.ts`
- `src/features/export/export-png.ts`
- `src/features/export/export-pdf.ts`
- `src/features/export/components/ExportMenu.tsx`
- Integration in AppShell Toolbar oder StatusBar

---

### F2: Defekt-Farbe nach Eigenschaft auf WaferMap

**Scope:**
- WaferMap-Defekte faerben nach: Klasse, Groesse, clusterNumber, benutzerdefiniert
- Farbmodus-Umschalter in WaferMap-Toolbar
- Farbskala/Legende passt sich dynamisch an
- Kategorisch (Klasse) vs. sequentiell (Groesse) Farbschema

**Implementierung:**
- `WaferMapColorMode` Type: `'uniform' | 'byClass' | 'bySize' | 'byCluster'`
- In `useWaferMapRenderer.ts`: statt einheitlicher `defectParticle`-Farbe die Farbe pro Defekt aus einem Farbschema ableiten
- Fuer `byClass`: Map<classNumber, color> aus 8-Farben-Palette
- Fuer `bySize`: sequentielle Skala (blau -> rot) normalisiert auf min/max
- Batch-Rendering muss pro Farbe aufgeteilt werden (ein `beginPath/fill` pro Farbe)
- `ColorModeSelector` Dropdown in WaferMap-Toolbar

**Dateien:**
- `src/features/wafer-map/components/ColorModeSelector.tsx`
- `src/features/wafer-map/hooks/useWaferMapRenderer.ts` (erweitern)
- `src/core/utils/color-scales.ts` (sequentielle + kategorische Skalen)

---

### F3: Defekt-Detail-Ansicht

**Scope:**
- Klick auf Defekt in Tabelle oder WaferMap oeffnet Detail-Panel
- Zeigt alle Spalten des Defekts als Key-Value-Liste
- Position auf Mini-WaferMap hervorgehoben
- Navigation: Vorheriger/Naechster Defekt

**Implementierung:**
- `DefectDetailPanel` als Slide-Over oder Bottom-Sheet
- Liest `highlightedDefectId` aus inspection-store
- Mini-WaferMap: kleine Canvas-Vorschau mit Markierung
- Prev/Next Buttons navigieren durch filteredDefects

**Dateien:**
- `src/features/inspection/components/DefectDetailPanel.tsx`
- Integration in `defects.tsx` als konditionaler Seitenbereich

---

### F4: Wafer-Overlay (2+ Dateien ueberlagern)

**Scope:**
- Zweite KLARF-Datei laden und ueber dieselbe WaferMap legen
- Defekte aus Datei A und B in verschiedenen Farben
- Toggle: nur A, nur B, beide, Differenz (nur in A, nur in B)
- Overlay-Controls: Opacity pro Layer

**Implementierung:**
- `file-store` kann bereits mehrere Dateien halten (`files: Map`)
- Neuer `OverlayPanel` mit Datei-Auswahl (Checkboxen)
- WaferMap-Renderer erhaelt Array von `{ defects, color, opacity }`
- Defekt-Matching (optional): gleiche Position = gemeinsamer Defekt

**Dateien:**
- `src/features/wafer-map/components/OverlayPanel.tsx`
- `src/features/wafer-map/hooks/useWaferMapRenderer.ts` (Multi-Layer)
- `src/stores/overlay-store.ts` (aktive Layer, Farben, Opacity)

---

### F5: Notch-Rotation

**Scope:**
- Wafer um 0/90/180/270 Grad drehen (Notch-Position aendern)
- Dropdown in WaferMap-Toolbar: "Notch Down" / "Notch Left" / etc.
- Koordinaten-Transform in Renderer

**Implementierung:**
- `notchRotation` State (0, 90, 180, 270) in WaferMap
- Vor dem Rendering: Koordinaten rotieren um Wafer-Zentrum
- Notch-Indikator zeichnet sich an korrekter Position

**Dateien:**
- WaferMap Toolbar erweitern
- `useWaferMapRenderer.ts` Rotation-Transform

---

## Release 0.3: Advanced Analytics

### F6: Cluster-Erkennung (DBSCAN)

**Scope:**
- Automatische Erkennung von Defekt-Clustern auf dem Wafer
- DBSCAN-Algorithmus (dichtbasiert, kein k vorgeben)
- Cluster auf WaferMap farblich markieren + Cluster-Statistik
- Cluster-Filter im DynamicFilterPanel

**Implementierung:**
- `src/core/services/cluster-detection.service.ts`
- DBSCAN mit epsilon (Nachbarschaftsradius) und minPoints
- Ergebnis: `clusterNumber` pro Defekt (in inspection-store)
- WaferMap: Cluster-Farben, konvexe Huelle optional
- ClusterStatistics Panel: Anzahl Cluster, Groesse, Position

**Dateien:**
- `src/core/services/cluster-detection.service.ts`
- `src/features/analysis/cluster.tsx` (Cluster-Ansicht)
- Integration in WaferMap + inspection-store

---

### F7: Scratch-Erkennung

**Scope:**
- Automatische Erkennung linearer Defekt-Muster (Scratches)
- Hough-Transform oder RANSAC-basierter Linien-Fit
- Scratches als Linien auf WaferMap einzeichnen
- Scratch-Statistik: Laenge, Richtung, betroffene Dies

**Implementierung:**
- `src/core/services/scratch-detection.service.ts`
- Hough-Transform auf Defekt-Positionen
- Ergebnis: Array von erkannten Linien (Start, Ende, Score)
- WaferMap: Linien-Overlay

---

### F8: Trend-Analyse (Lot-Level)

**Scope:**
- Mehrere KLARF-Dateien (Lot) laden
- Zeitlicher Verlauf: Defektanzahl, Yield, Dichte pro Wafer/Lot
- Recharts LineChart mit Zeitachse
- Anomalie-Erkennung (Ausreisser markieren)

**Implementierung:**
- `src/features/analysis/trend.tsx`
- Daten aus `file-store.files` (alle geladenen Dateien)
- Sortierung nach Timestamp
- LineChart: X=Wafer/Lot, Y=Defects/Yield/Density
- Route: `/analysis/trend`

---

### F9: SPC Control Charts

**Scope:**
- Statistische Prozesskontrolle: UCL/LCL/CL Linien
- X-bar, R-Chart, p-Chart
- Automatische Control-Limit-Berechnung (3-Sigma)
- Out-of-Control Markierungen (Western Electric Rules)

**Implementierung:**
- `src/features/analysis/spc.tsx`
- `src/core/services/spc.service.ts` (Limit-Berechnung, OOC-Regeln)
- Recharts LineChart mit Referenzlinien

---

### F10: Brush/Lasso-Select auf WaferMap

**Scope:**
- Freihand-Lasso oder Rechteck-Selektion auf WaferMap
- Selektierte Defekte in Tabelle hervorheben
- Filter auf Selektion anwenden

**Implementierung:**
- Lasso: Canvas-Overlay mit Freihand-Pfad
- Punkt-in-Polygon-Test fuer Defekte
- Rechteck: Einfacher Box-Select via Drag
- Ergebnis -> `selectedDefectIds` in inspection-store

---

### F11: Korrelations-Analyse

**Scope:**
- Scatter-Plot zweier beliebiger numerischer Spalten
- X/Y-Achsen-Auswahl per Dropdown
- Regressionslinie optional
- Pearson-Korrelationskoeffizient anzeigen

**Implementierung:**
- `src/features/analysis/correlation.tsx`
- Dropdown fuer X- und Y-Achsen-Spalte
- Recharts ScatterChart
- Lineare Regression berechnen + als Linie einzeichnen

---

## Release 0.4: Enterprise Features (Langfristig)

### F12: SINF + STDF Parser
- Neue Adapter unter `core/parsers/sinf/` und `core/parsers/stdf/`
- SINF: Wafer-Map-Format (Die-Level, kein Defekt-Level)
- STDF: Binaer-Format, ATE-Testdaten

### F13: Datenbank-Backend
- PostgreSQL oder SQLite via Railway
- Historische Daten speichern
- Multi-User Zugriff
- API Layer (REST oder tRPC)

### F14: Defekt-Bilder (SEM/Optisch)
- KLARF IMAGELIST Pfade auswerten
- Bild-Galerie pro Defekt
- Thumbnail-Vorschau in Defekt-Tabelle

### F15: ADC (Automatische Defekt-Klassifikation)
- ML-Modell fuer Defekt-Klassifikation aus Bildern
- TensorFlow.js oder ONNX Runtime im Browser
- Trainings-Pipeline (Server-seitig)

---

## Implementierungs-Reihenfolge (Empfehlung)

### Sofort umsetzbar (Release 0.2)

```
1. F2: Defekt-Farbe nach Klasse/Groesse     [2-3h] - Hoechster Impact/Aufwand-Ratio
2. F5: Notch-Rotation                        [1-2h] - Einfach, oft angefragt
3. F3: Defekt-Detail-Ansicht                 [2-3h] - Verbessert UX deutlich
4. F1: Export (CSV + PNG)                    [3-4h] - Grundfunktion die alle brauchen
5. F1: Export (PDF Report)                   [3-4h] - Professionelle Nutzung
6. F4: Wafer-Overlay                         [4-6h] - Kernfunktion fuer Vergleiche
```

### Naechste Iteration (Release 0.3)

```
7. F6: Cluster-Erkennung (DBSCAN)           [4-6h]
8. F10: Brush/Lasso-Select                   [3-4h]
9. F11: Korrelations-Analyse                 [2-3h]
10. F7: Scratch-Erkennung                    [4-6h]
11. F8: Trend-Analyse                        [4-6h]
12. F9: SPC Control Charts                   [3-4h]
```

### Langfristig (Release 0.4)

```
13. F12: SINF + STDF Parser
14. F13: Datenbank-Backend
15. F14: Defekt-Bilder
16. F15: ADC
```
