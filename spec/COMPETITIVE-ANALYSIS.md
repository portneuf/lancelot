# Competitive Analysis: Semiconductor Defect Viewer Market

## Analysierte Loesungen

| Produkt | Hersteller | Typ | Preis |
|---------|-----------|-----|-------|
| KLA Klarity | KLA Corporation | Enterprise-Suite | $$$$ |
| Discover Review | Onto Innovation | Enterprise-Software | $$$$ |
| Exensio Platform | PDF Solutions | Cloud/Enterprise | $$$ |
| yieldWerx | yieldWerx | Cloud-SaaS | $$ |
| DR YIELD | DR YIELD GmbH | Cloud-SaaS | $$ |
| SiGlaz IDA | SiGlaz | Desktop-Software | $$ |
| KlarfView | Stuart Riley | Freeware | Kostenlos |
| klarfkit | Open Source | Python-Bibliothek | Kostenlos |
| defect-map-draw | Open Source | Python-Script | Kostenlos |
| **Lancelot** | **Open Source** | **Web/Desktop/PWA** | **Kostenlos** |

---

## Feature-Matrix: Markt vs. Lancelot

### 1. Datei-Management

| Feature | KLA | Onto | Exensio | yieldWerx | DR YIELD | SiGlaz | KlarfView | klarfkit | Lancelot | Status |
|---------|-----|------|---------|-----------|----------|--------|-----------|----------|----------|--------|
| KLARF v1.2 Import | x | x | x | x | x | x | x | x | x | DONE |
| KLARF v1.8 Import | x | x | x | x | - | x | x | - | x | DONE |
| SINF Import | x | x | x | x | - | - | - | - | - | MISSING |
| STDF Import | x | x | x | x | x | - | - | - | - | MISSING |
| SEMI E142 (XML) | x | x | x | - | - | - | - | - | - | MISSING |
| CSV/Excel Export | x | x | x | x | x | - | - | x | - | MISSING |
| PDF Report Export | x | x | x | x | x | - | - | - | - | MISSING |
| PNG/SVG Image Export | x | x | x | x | x | - | x | x | - | MISSING |
| Multi-Datei oeffnen | x | x | x | x | x | x | - | x | x | DONE |
| Drag & Drop | - | - | - | - | - | - | - | - | x | DONE |
| Letzte Dateien | x | x | x | x | x | - | - | - | (basic) | PARTIAL |

### 2. Wafer Map Visualisierung

| Feature | KLA | Onto | Exensio | yieldWerx | DR YIELD | SiGlaz | KlarfView | klarfkit | Lancelot | Status |
|---------|-----|------|---------|-----------|----------|--------|-----------|----------|----------|--------|
| Wafer-Umriss + Notch | x | x | x | x | x | x | x | x | x | DONE |
| Die-Grid farbig | x | x | x | x | x | x | x | x | x | DONE |
| Defekt-Punkte | x | x | x | x | x | x | x | x | x | DONE |
| Pan/Zoom | x | x | x | x | x | - | - | - | x | DONE |
| Farbe nach Klasse | x | x | x | x | x | x | x | x | - | MISSING |
| Farbe nach Groesse | x | x | x | x | x | - | x | x | - | MISSING |
| Farbe nach Zeit/Reihenfolge | x | - | x | x | x | - | - | - | - | MISSING |
| Die-Heatmap (Dichte) | x | x | x | x | x | x | - | - | x | DONE |
| Zonen-Editor | x | x | x | x | - | - | - | - | - | MISSING |
| Wafer-Overlay (2+ Dateien) | x | x | x | x | x | x | x | x | - | MISSING |
| Wafer-Stacking (Lot-Level) | x | x | x | x | x | - | - | - | - | MISSING |
| Defekt-Bilder (SEM/Optisch) | x | x | x | x | - | - | - | - | - | MISSING |
| Retikel-Grid-Overlay | x | x | x | x | - | - | - | - | - | MISSING |
| Notch-Rotation | x | x | x | x | x | - | x | - | - | MISSING |
| Front/Edge/Back-Ansicht | - | x | - | - | - | - | - | - | - | MISSING |

### 3. Defekt-Analyse

| Feature | KLA | Onto | Exensio | yieldWerx | DR YIELD | SiGlaz | KlarfView | klarfkit | Lancelot | Status |
|---------|-----|------|---------|-----------|----------|--------|-----------|----------|----------|--------|
| Defekt-Tabelle (sortierbar) | x | x | x | x | x | x | - | x | x | DONE |
| Virtualisiert (100k+) | - | - | x | x | x | - | - | - | x | DONE |
| Spalten-Filter | x | x | x | x | x | - | - | - | x | DONE |
| Range-Slider-Filter | - | - | x | x | x | - | - | - | x | DONE |
| Klassen-Lookup | x | x | x | x | x | x | - | - | x | DONE |
| Defekt-Detail-Ansicht | x | x | x | x | x | - | - | - | - | MISSING |
| Scratch-Erkennung | x | x | x | x | - | x | - | - | - | MISSING |
| Cluster-Erkennung | x | x | x | x | - | x | - | - | - | MISSING |
| Signatur-Erkennung | x | - | x | x | - | x | - | - | - | MISSING |
| ADC (Auto Classification) | x | x | x | x | - | x | - | - | - | MISSING |
| Kill-Ratio Berechnung | x | x | x | x | - | - | - | - | - | MISSING |

### 4. Statistische Analyse

| Feature | KLA | Onto | Exensio | yieldWerx | DR YIELD | SiGlaz | KlarfView | klarfkit | Lancelot | Status |
|---------|-----|------|---------|-----------|----------|--------|-----------|----------|----------|--------|
| Pareto Chart | x | x | x | x | x | x | - | - | x | DONE |
| Spatial Scatter | x | x | x | x | x | x | - | x | x | DONE |
| Yield Summary | x | x | x | x | x | - | - | - | x | DONE |
| Size Distribution | x | x | x | x | x | - | - | x | x | DONE |
| Defects per Die | x | x | x | x | x | - | - | - | x | DONE |
| Trend-Analyse (zeitlich) | x | x | x | x | x | - | - | - | - | MISSING |
| Lot-Vergleich | x | x | x | x | x | - | - | - | - | MISSING |
| SPC Control Charts | x | x | x | x | x | - | - | - | - | MISSING |
| Korrelations-Analyse | x | x | x | x | x | - | - | - | - | MISSING |
| Box Plots | x | x | x | x | x | - | - | - | - | MISSING |
| Wafer-Zonen-Statistik | x | x | x | x | - | - | - | - | - | MISSING |

### 5. Linked Views / Interaktion

| Feature | KLA | Onto | Exensio | yieldWerx | DR YIELD | SiGlaz | KlarfView | klarfkit | Lancelot | Status |
|---------|-----|------|---------|-----------|----------|--------|-----------|----------|----------|--------|
| Click-to-Highlight sync | x | x | x | x | x | - | - | - | x | DONE |
| WaferMap-Filter-Dimming | x | x | x | x | x | - | - | - | x | DONE |
| Brush-Select (Lasso) | x | x | x | - | - | - | - | - | - | MISSING |
| Tooltip auf Defekten | x | x | x | x | x | - | - | - | x | DONE |
| Kontext-Menu (Rechtsklick) | x | x | x | - | - | - | - | - | - | MISSING |
| Keyboard Shortcuts | x | x | x | - | - | - | - | - | x | DONE |

### 6. Platform / UX

| Feature | KLA | Onto | Exensio | yieldWerx | DR YIELD | SiGlaz | KlarfView | klarfkit | Lancelot | Status |
|---------|-----|------|---------|-----------|----------|--------|-----------|----------|----------|--------|
| Web-basiert | - | - | x | x | x | - | - | - | x | DONE |
| Desktop-App | x | x | x | - | - | x | x | - | x | DONE (Tauri) |
| PWA / Mobile | - | - | - | - | x | - | - | - | x | DONE |
| Multi-Theme | - | - | x | - | - | - | - | - | x | DONE |
| i18n (Mehrsprachig) | x | x | x | - | x | - | - | - | x | DONE |
| Offline-faehig | x | x | - | - | - | x | x | - | x | DONE (PWA) |
| Datenbank-Backend | x | x | x | x | x | - | - | - | - | MISSING |

---

## Gap-Analyse: Lancelot vs. Markt

### Lancelot's Staerken (Alleinstellungsmerkmale)
1. **Kostenlos + Open Source** - einzige kostenlose Loesung mit vollem Feature-Set
2. **Cross-Platform** (Web + Desktop + PWA) - keine andere Loesung deckt alle 3 ab
3. **4 Themes inkl. Cleanroom** - unueblich im Markt
4. **5 Sprachen** (en/de/ja/ko/zh) - breite Industrie-Abdeckung
5. **100k+ Defekte performant** (Canvas + Virtualisierung) - auf Open-Source-Niveau einmalig
6. **Plugin-Architektur** fuer neue Formate - zukunftssicher

### Kritische Luecken (High Priority)

| # | Feature | Verbreitung | Aufwand | Impact |
|---|---------|-------------|---------|--------|
| 1 | **Export (CSV/PNG/PDF)** | Alle Produkte | Mittel | Sehr hoch |
| 2 | **Defekt-Farbe nach Klasse** auf WaferMap | Fast alle | Gering | Hoch |
| 3 | **Wafer-Overlay** (2+ Dateien ueberlagern) | Fast alle | Mittel | Sehr hoch |
| 4 | **Trend-Analyse** (zeitlich ueber Lots) | Enterprise | Hoch | Hoch |
| 5 | **Defekt-Detail-Ansicht** (Einzeldefekt-Panel) | Fast alle | Gering | Mittel |
| 6 | **Notch-Rotation** | Viele | Gering | Mittel |

### Mittlere Luecken (Medium Priority)

| # | Feature | Verbreitung | Aufwand | Impact |
|---|---------|-------------|---------|--------|
| 7 | **Cluster-Erkennung** (DBSCAN o.ae.) | Enterprise + SiGlaz | Mittel | Hoch |
| 8 | **Scratch-Erkennung** | Enterprise + SiGlaz | Mittel | Hoch |
| 9 | **Wafer-Stacking** (Lot-Level Aggregation) | Enterprise | Hoch | Hoch |
| 10 | **SPC Control Charts** | Enterprise + DR YIELD | Mittel | Mittel |
| 11 | **Korrelations-Analyse** | Enterprise | Mittel | Mittel |
| 12 | **Brush/Lasso-Select** auf WaferMap | Enterprise | Mittel | Mittel |
| 13 | **SINF/STDF Import** | Enterprise | Mittel | Mittel |

### Langfrist-Luecken (Low Priority / Enterprise-Only)

| # | Feature | Aufwand | Bemerkung |
|---|---------|---------|-----------|
| 14 | ADC (Auto Classification) | Sehr hoch | Erfordert ML-Modelle |
| 15 | Defekt-Bilder (SEM) | Hoch | KLARF-Bildpfade vorhanden aber selten eingebettet |
| 16 | Signatur-Erkennung | Sehr hoch | SiGlaz-Kernkompetenz |
| 17 | Kill-Ratio | Mittel | Erfordert Yield-Daten |
| 18 | Datenbank-Backend | Sehr hoch | Architektur-Erweiterung |
| 19 | Retikel-Grid-Overlay | Mittel | Nischenfunktion |

---

## Quellen

- [KLA Semiconductor Software Solutions](https://www.kla.com/products/software-solutions/semiconductor)
- [Onto Innovation Discover Review Software](https://ontoinnovation.com/products/discover-review-software)
- [PDF Solutions Exensio Foundry](https://www.pdf.com/products/exensio-analytics-platform/products/exensio-foundry/)
- [yieldWerx Products](https://yieldwerx.com/products/)
- [yieldWerx KLARF Integration](https://yieldwerx.com/blog/klarf-file-format/)
- [DR YIELD Data Visualization](https://dryield.com/semiconductor-test-and-yield-data-visualization/)
- [DR YIELD Data Monitoring](https://dryield.com/semiconductor-data-monitoring/)
- [SiGlaz IDA White Paper](https://www.siglaz.com/newsroom/whitepapers/pdf/white-paper_software.PDF)
- [KlarfView Overview](https://slriley.com/software/klarfview-overview-2/)
- [klarfkit GitHub](https://github.com/MichaelHotaling/klarfkit)
- [PDF Solutions Wafer Map Visualization](https://www.pdf.com/understanding-semiconductor-data-visualization-with-wafer-maps-an-introduction/)
- [Onto Innovation Discover Defect](https://ontoinnovation.com/products/discover-review/)
