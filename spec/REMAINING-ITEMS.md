# Lancelot - Verbleibende offene Punkte

Stand: 2026-03-28

Alle 15 Features der Roadmap (Release 0.1-0.4) sind umgesetzt.
Die folgenden Punkte sind verbleibende Luecken aus dem urspruenglichen Plan.

---

## Kategorie 1: Nicht umgesetzte Format-Parser

### STDF Parser (Standard Test Data Format)
- **Was:** Binaeres Format fuer ATE-Testdaten (Automatic Test Equipment)
- **Warum offen:** Komplexe binaere Spezifikation mit >30 Record-Typen, erfordert ByteBuffer-Parsing
- **Aufwand:** Hoch (20-40h)
- **Ansatz:** Neuer Adapter unter `core/parsers/stdf/`, binaerer Reader mit DataView, Mapping auf InspectionFile (parametrische Testdaten -> Defect-Analogie oder eigenes Datenmodell)
- **Referenz:** SEMI E10-Standard, STDF V4 Specification

---

## Kategorie 2: Server-Backend

### PostgreSQL/SQLite Backend mit API Layer
- **Was:** Serverseitige Datenbank fuer historische Inspektionsdaten, Multi-User-Zugriff
- **Warum offen:** Erfordert Server-Architektur-Erweiterung, aktuell nur IndexedDB lokal
- **Aufwand:** Sehr hoch (40-80h)
- **Ansatz:**
  - Railway PostgreSQL Add-on
  - API Layer mit tRPC oder REST (Express/Hono)
  - Prisma oder Drizzle ORM
  - Auth via Clerk oder NextAuth
  - Separate `server/` Verzeichnisstruktur
- **Bereits vorhanden:** IndexedDB-basierte lokale Historie (`src/core/services/inspection-db.ts`)

---

## Kategorie 3: Machine Learning

### ML-basierte Automatische Defekt-Klassifikation (ADC)
- **Was:** CNN/DNN-Modell zur Klassifikation von Defekt-Bildern im Browser
- **Warum offen:** Erfordert trainierte Modelle, Trainingsdaten, Server-Pipeline
- **Aufwand:** Sehr hoch (60-100h)
- **Ansatz:**
  - TensorFlow.js oder ONNX Runtime Web fuer Browser-Inferenz
  - Vortrainiertes MobileNet/EfficientNet als Basis (Transfer Learning)
  - Trainings-Pipeline serverseitig (Python + PyTorch/TF)
  - Modell als statisches Asset deployen (~5-20MB)
- **Bereits vorhanden:** Regelbasierter Classifier mit 6 Regeln (`src/core/services/defect-classifier.service.ts`)

---

## Kategorie 4: Testing

### Component Tests (Vitest + Testing Library)
- **Was:** Unit Tests fuer React-Komponenten: NavRail, DefectTable, WaferMap, FilterSidebar
- **Aufwand:** Mittel (4-8h)
- **Ansatz:**
  - `@testing-library/react` ist bereits installiert
  - Tests unter `tests/unit/components/`
  - Render-Tests, User-Interaction-Tests, Store-Integration

### Parser Edge-Case Tests
- **Was:** Tests fuer fehlerhafte/unvollstaendige KLARF-Dateien
- **Aufwand:** Mittel (3-5h)
- **Testfaelle:**
  - Fehlende Pflichtfelder (kein LotID, kein DefectRecordSpec)
  - Abgeschnittene Dateien (DefectList ohne EndOfFile)
  - Leere DefectList
  - Ungueltige Zahlen in Defekt-Zeilen
  - Sehr lange Zeilen (>10.000 Zeichen)
  - Gemischte v1.2/v1.8 Elemente

---

## Kategorie 5: Performance

### Streaming Parser fuer Dateien >100MB
- **Was:** Chunked Parsing mit inkrementellem Fortschritt fuer sehr grosse KLARF-Dateien
- **Aufwand:** Mittel (6-10h)
- **Ansatz:**
  - `ReadableStream` API im Web Worker
  - Tokenizer arbeitet auf Chunks statt auf komplettem String
  - DefectList wird zeilenweise geparst und sofort in den Store geschrieben
  - Fortschrittsbalken basiert auf gelesenen Bytes
- **Bereits vorhanden:** Web Worker mit Fortschrittsmeldung (aber liest gesamte Datei auf einmal)

---

## Kategorie 6: Polish / UX

### Mobile Layout Tuning
- **Was:** Dedizierte mobile Layouts fuer WaferMap, DefectTable und Charts
- **Aufwand:** Mittel (4-8h)
- **Details:**
  - WaferMap: Touch-Gesten (Pinch-to-Zoom vorhanden), Vollbild-Modus
  - DefectTable: Karten-Ansicht statt Tabelle auf schmalen Bildschirmen
  - Charts: Vereinfachte Darstellung, Swipe-Navigation zwischen Charts
  - FilterSidebar: Bottom-Sheet statt rechte Seitenleiste auf Mobile
- **Bereits vorhanden:** NavRail wird zu Bottom-Tab-Bar, ResponsiveContainer auf Charts

### Tauri file_commands.rs
- **Was:** Rust IPC Commands fuer native Datei-Operationen im Desktop-Build
- **Aufwand:** Gering (2-3h)
- **Status:** Platform Layer deckt dies bereits ueber JavaScript Tauri-Plugin-API ab; Rust-Commands waeren eine Performance-Optimierung, kein Feature-Gap

---

## Priorisierungs-Empfehlung

| Prioritaet | Item | Begruendung |
|------------|------|-------------|
| 1 | Component Tests | Qualitaetssicherung, geringer Aufwand |
| 2 | Parser Edge-Case Tests | Robustheit, geringer Aufwand |
| 3 | Mobile Layout Tuning | UX-Verbesserung, mittlerer Aufwand |
| 4 | Streaming Parser | Performance fuer Produktionsdaten |
| 5 | STDF Parser | Erweitertes Format-Repertoire |
| 6 | PostgreSQL Backend | Enterprise-Faehigkeit |
| 7 | ML-basierte ADC | Langfristiges Differenzierungsmerkmal |
