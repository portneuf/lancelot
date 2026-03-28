# Marktanalyse: Semiconductor Defect Inspection Software

Stand: Maerz 2026

---

## 1. Marktueberblick

Der Markt fuer Halbleiter-Yield-Management-Software und Inspektions-Tools waechst deutlich und wird durch zunehmende Fertigungskomplexitaet, neue Fab-Kapazitaeten und den Einsatz von KI/ML getrieben.

### Marktsegmente

| Segment | Marktgroesse 2025 | Prognose 2031-2034 | CAGR |
|---------|-------------------|-------------------|------|
| Yield Management Software | ~$1.4 Mrd. | $3.3 Mrd. (2033) | 9.7% |
| Yield Management Solutions (SW + Services) | ~$1.5 Mrd. | $2.3 Mrd. (2031) | 8.5% |
| Defect Inspection Equipment (HW + SW) | ~$9.4 Mrd. | $18.7 Mrd. (2034) | 10.6% |
| Metrology & Inspection gesamt | ~$14.9 Mrd. | $27.6 Mrd. (2034) | 7.2% |

**Kernaussage: Der Gesamtmarkt fuer Yield-Software waechst mit ~10% CAGR - deutlich ueber dem allgemeinen Software-Markt.**

---

## 2. Industrie-Markt (Semiconductor Fabs)

### Marktgroesse und Wachstum

- **Yield Management Software:** $1.42 Mrd. (2024) → $3.27 Mrd. (2033), CAGR 9.7%
- **Software-Anteil:** 62% des Yield-Management-Marktes (vs. 38% Services)
- **Regionale Fuehrung:** Asien-Pazifik dominiert mit 35% Marktanteil (TSMC, Samsung, SK Hynix)

### Wachstumstreiber (Industrie)

| Treiber | Impact | Trend |
|---------|--------|-------|
| **Neue Fab-Kapazitaeten** | Sehr hoch | 18 neue Fabs starten Bau in 2025, operativ 2026-2027 |
| **Fab-Kapazitaet +6-7% p.a.** | Hoch | Globale installierte Kapazitaet steigt kontinuierlich |
| **Advanced Nodes (2nm GAA)** | Sehr hoch | TSMC, Samsung, Intel starten 2nm Massenproduktion 2025-2026 |
| **CHIPS Act Investitionen** | Hoch | $52 Mrd. US-Foerderung treibt Neubau (Intel, TSMC AZ, Samsung TX) |
| **KI/ML in Inspektion** | Hoch | >99% Defekt-Erkennungsgenauigkeit mit Deep Learning |
| **Steigende Wafer-Komplexitaet** | Hoch | Mehr Schichten, kleinere Strukturen = mehr Inspektionsbedarf |

### Kundensegmente (Industrie)

| Segment | Typische Loesungen | Budget/Lizenz | Lancelot-Relevanz |
|---------|-------------------|---------------|-------------------|
| **Tier 1 Fabs** (TSMC, Samsung, Intel) | KLA Klarity, PDF Solutions Exensio | $1-10M+/Jahr | Gering - nutzen integrierte Enterprise-Suiten |
| **Tier 2 Foundries** (GlobalFoundries, UMC, SMIC) | yieldWerx, DR YIELD, Synopsys | $100K-1M/Jahr | Mittel - koennten Lancelot als Ergaenzung nutzen |
| **OSAT/Packaging** | Onto Innovation, Camtek | $50K-500K/Jahr | Mittel |
| **IDM mittelgross** | Diverse, oft Eigenentwicklung | Budget-sensibel | Hoch - kostenlose Alternative attraktiv |
| **Startup-Fabs / Small Volume** | Oft kein dediziertes Tool | <$50K verfuegbar | **Sehr hoch** - Lancelot als Einstiegsloesung |

### Prognose Industrie

```
Bedarf: ████████████████████████████ STARK STEIGEND (+10% p.a.)
```

**Begruendung:**
- 18 neue Fabs in 2025 = 18 neue Kunden fuer Yield-Software
- Jede Fab braucht Defekt-Analyse ab Tag 1 der Prozessentwicklung
- Advanced Nodes (2nm, 3nm) haben ~3x mehr Inspektionsschritte als 7nm
- CHIPS Act und EU Chips Act pumpen $100+ Mrd. in neue Kapazitaeten

---

## 3. Forschungs-Markt (Universitaeten, Forschungsinstitute)

### Marktsituation

Der Forschungsmarkt fuer Halbleiter-Defektanalyse ist erheblich kleiner als der Industriemarkt, aber waechst ueberdurchschnittlich durch den globalen Halbleiter-Forschungsboom.

| Merkmal | Detail |
|---------|--------|
| **Marktgroesse** | Nicht separat ausgewiesen, geschaetzt $50-150M/Jahr global |
| **Typische Budgets** | $0-50K fuer Software pro Lehrstuhl/Forschungsgruppe |
| **Entscheidungstraeger** | Professoren, PhD-Studenten, Postdocs |
| **Kaufverhalten** | Open-Source bevorzugt, dann Freeware, dann guenstige Lizenzen |
| **Hauptbedarf** | Datenvisualisierung, Paper-Abbildungen, Algorithmen-Entwicklung |

### Wachstumstreiber (Forschung)

| Treiber | Impact | Trend |
|---------|--------|-------|
| **ML/DL fuer Wafer-Defekte** | Sehr hoch | Explosives Wachstum an Publikationen (WM-811K Dataset, CNN-basierte Klassifikation) |
| **Neue Halbleiter-Studiengaenge** | Hoch | CHIPS Act finanziert akademische Programme |
| **Open-Source Datasets** | Hoch | WM-811K (811K Wafer Maps), Dataset TT (SEM Bilder) frei verfuegbar |
| **Interdisziplinaere Forschung** | Mittel | Materialwissenschaft + ML + EE Konvergenz |
| **Fehlende freie Tools** | Hoch | Kein ausgereifter kostenloser Wafer Map Viewer = Luecke |

### Verfuegbare Open-Source-Tools fuer Forschung

| Tool | Typ | Limitierungen |
|------|-----|--------------|
| klarfkit (Python) | Bibliothek | Kein GUI, nur Plotting |
| wafer-map (Python) | Bibliothek | Nur Wafer-Map-Darstellung, keine Analyse |
| WaferDC (Python) | ML-Framework | Nur Klassifikation, kein allgemeiner Viewer |
| defect-map-draw (Python) | Script | Minimal, keine Interaktivitaet |
| **Lancelot** | **Web-App** | **Einzige interaktive Open-Source-Loesung** |

### Prognose Forschung

```
Bedarf: ██████████████████████████████ STARK STEIGEND (+15-20% p.a.)
```

**Begruendung:**
- Akademische Publikationen zu Wafer-Defekt-ML haben sich 2023-2025 verdreifacht
- CHIPS Act foerdert >50 neue universitaere Halbleiter-Programme allein in den USA
- PhD-Studenten brauchen Visualisierungstools fuer Paper und Praesentationen
- Kein ausgereiftes kostenloses Tool am Markt = offene Nische
- Python-Bibliotheken decken nur Teilbedarf (keine GUI, keine interaktive Analyse)

---

## 4. Lancelot-Positionierung

### Einzigartige Marktposition

Lancelot ist das **einzige kostenlose, web-basierte, interaktive Tool** fuer Halbleiter-Defektdaten. Es positioniert sich in einer Luecke zwischen:

```
Enterprise ($100K+)          Free/Open Source
┌──────────────┐            ┌──────────────┐
│ KLA Klarity  │            │ klarfkit     │ (Python, kein GUI)
│ Exensio      │            │ wafer-map    │ (Python, minimal)
│ yieldWerx    │  ← GAP →  │ KlarfView    │ (Desktop, nur PNG)
│ DR YIELD     │            │              │
│ Onto Discover│            │ LANCELOT     │ ← HIER
└──────────────┘            └──────────────┘
```

### Zielgruppen (priorisiert)

| Prioritaet | Zielgruppe | Warum Lancelot? |
|------------|-----------|-----------------|
| **1** | **Universitaeten & Forschung** | Kostenlos, Web-basiert (kein Install), Paper-taugliche Exports |
| **2** | **Startup-Fabs / Small Volume** | Keine Lizenzkosten, sofort einsetzbar |
| **3** | **Ingenieure in grossen Fabs** | Schneller Viewer fuer Ad-hoc-Analyse ohne Enterprise-Login |
| **4** | **Ausbildung / Training** | Interaktiver KLARF-Generator fuer Schulungen |
| **5** | **Equipment-Hersteller** | Einbettbar (Open Source) in eigene Produkte |

### Wettbewerbsvorteile

| Vorteil | vs. Enterprise | vs. Python-Tools |
|---------|---------------|-----------------|
| Kostenlos | ✅ | = |
| Interaktiv (GUI) | = | ✅ |
| Web-basiert (kein Install) | ✅ | ✅ |
| PWA / Offline | ✅ | - |
| Desktop-App (Tauri) | = | ✅ |
| Multi-Format (KLARF + SINF) | = | ✅ (meist nur KLARF) |
| 100k+ Defekte performant | = | ✅ |
| 5 Sprachen | ✅ | ✅ |
| Einbettbar / Self-Hosted | ✅ | - |
| Testdaten-Generator | ✅ | - |

---

## 5. Gesamtfazit

### Bedarf steigt - in beiden Segmenten

| Segment | Wachstum | Trend | Lancelot-Chancen |
|---------|----------|-------|------------------|
| **Industrie** | +10% p.a. | Steigend | Mittel - Einstiegslosung fuer kleinere Fabs, Ergaenzung fuer grosse |
| **Forschung** | +15-20% p.a. | Stark steigend | **Sehr hoch** - offene Nische, kein Wettbewerb |

### Markttrends die Lancelot beguenstigen

1. **Web-First:** Trend weg von Desktop-Installation hin zu Browser-Tools
2. **Open Source in Semicon:** Wachsende Akzeptanz von OSS in der Halbleiterindustrie
3. **KI-Forschungsboom:** Explodierende Nachfrage nach Wafer-Defekt-Visualisierung
4. **Neue Fabs:** 18+ neue Fabs brauchen guenstige Einstiegstools
5. **CHIPS Act Akademie:** Hunderte neue Studenten brauchen Analyse-Tools

### Risiken

1. KLA/Onto koennten kostenlose Community-Editionen anbieten
2. Python-Oekosystem koennte Web-faehige Tools entwickeln (Streamlit/Gradio)
3. Ohne Community-Wachstum bleibt Lancelot ein Einzelprojekt

---

## Quellen

- [Semiconductor Yield Management Solutions Market $2.3B by 2031](https://www.openpr.com/news/4405938/semiconductor-yield-management-solutions-market-to-reach-us)
- [Yield Management Software Market $3.27B by 2033](https://researchintelo.com/report/yield-management-software-for-semiconductors-market)
- [Semiconductor Defect Inspection Equipment Market](https://www.grandviewresearch.com/industry-analysis/semiconductor-defect-inspection-equipment-market-report)
- [Semiconductor Metrology and Inspection $27.56B by 2034](https://www.fortunebusinessinsights.com/semiconductor-metrology-and-inspection-equipment-market-113987)
- [Global Fab Capacity +6% 2024, +7% 2025 (SEMI)](https://www.semi.org/en/news-media-press-releases/semi-press-releases/global-semiconductor-fab-capacity-projected-to-expand-6%25-in-2024-and-7%25-in-2025-semi-reports)
- [18 New Fabs Starting Construction in 2025](https://anysilicon.com/chipmakers-rush-to-build-new-fabrication-plants-in-2025/)
- [Chip Equipment Sales to Reach $156B by 2027](https://www.tomshardware.com/tech-industry/semiconductors/sales-of-chip-production-equipment-to-reach-usd156-billion-by-2027-china-taiwan-and-korea-lead-intense-demand)
- [Semiconductor Wafer Inspection Equipment $9.67B](https://www.globenewswire.com/news-release/2026/01/27/3226150/28124/en/Semiconductor-Wafer-Inspection-Equipment-Market-Report-2026-9-67-Bn-Opportunities-Trends-Competitive-Landscape-Strategies-and-Forecasts-2020-2025-2025-2030F-2035F.html)
