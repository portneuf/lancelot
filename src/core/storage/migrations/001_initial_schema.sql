-- Migration 001: Initial Schema
-- Creates the core tables for Lancelot's PostgreSQL storage.

-- === Migrations tracking ===
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === Imports ===
CREATE TABLE imports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  file_hash   TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_version TEXT,
  UNIQUE(file_hash)
);

-- === Lots ===
CREATE TABLE lots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id           UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  lot_id              TEXT NOT NULL,
  sample_type         TEXT NOT NULL DEFAULT 'WAFER',
  inspection_station  TEXT,
  setup_id            TEXT,
  step_id             TEXT,
  result_timestamp    TIMESTAMPTZ,
  metadata            JSONB DEFAULT '{}',
  UNIQUE(import_id, lot_id)
);

CREATE INDEX idx_lots_lot_id ON lots(lot_id);
CREATE INDEX idx_lots_step_id ON lots(step_id);
CREATE INDEX idx_lots_result_timestamp ON lots(result_timestamp);

-- === Wafers ===
CREATE TABLE wafers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id          UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  wafer_id        TEXT NOT NULL,
  slot            INTEGER,
  sample_size_x   REAL NOT NULL,
  sample_size_y   REAL NOT NULL,
  die_pitch_x     REAL,
  die_pitch_y     REAL,
  die_origin_x    REAL DEFAULT 0,
  die_origin_y    REAL DEFAULT 0,
  center_x        REAL,
  center_y        REAL,
  orientation     TEXT,
  orientation_loc TEXT,
  defect_count    INTEGER NOT NULL DEFAULT 0,
  yield           REAL,
  UNIQUE(lot_id, wafer_id)
);

CREATE INDEX idx_wafers_lot_id ON wafers(lot_id);

-- === Defect class lookups ===
CREATE TABLE class_lookups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id        UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  class_number  INTEGER NOT NULL,
  class_name    TEXT NOT NULL,
  UNIQUE(lot_id, class_number)
);

CREATE INDEX idx_class_lookups_lot_id ON class_lookups(lot_id);

-- === Sample test plan (tested dies) ===
CREATE TABLE sample_test_plans (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wafer_id  UUID NOT NULL REFERENCES wafers(id) ON DELETE CASCADE,
  x_index   INTEGER NOT NULL,
  y_index   INTEGER NOT NULL,
  UNIQUE(wafer_id, x_index, y_index)
);

-- === Defects (core table, can grow very large) ===
CREATE TABLE defects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wafer_id        UUID NOT NULL REFERENCES wafers(id) ON DELETE CASCADE,
  defect_id       INTEGER NOT NULL,
  x_rel           REAL NOT NULL,
  y_rel           REAL NOT NULL,
  x_index         INTEGER NOT NULL,
  y_index         INTEGER NOT NULL,
  x_size          REAL,
  y_size          REAL,
  defect_area     REAL,
  d_size          REAL,
  class_number    INTEGER NOT NULL,
  test_id         INTEGER,
  cluster_number  INTEGER,
  rough_bin       INTEGER,
  fine_bin        INTEGER,
  image_count     INTEGER DEFAULT 0,
  image_list      TEXT[],
  UNIQUE(wafer_id, defect_id)
);

CREATE INDEX idx_defects_wafer_id ON defects(wafer_id);
CREATE INDEX idx_defects_class_number ON defects(class_number);
CREATE INDEX idx_defects_d_size ON defects(d_size);
CREATE INDEX idx_defects_spatial ON defects(x_index, y_index);
CREATE INDEX idx_defects_wafer_class ON defects(wafer_id, class_number);

-- === Spatial signatures (Phase 3 — SSA) ===
CREATE TABLE spatial_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wafer_id        UUID NOT NULL REFERENCES wafers(id) ON DELETE CASCADE,
  signature_type  TEXT NOT NULL,
  confidence      REAL NOT NULL,
  parameters      JSONB NOT NULL,
  defect_ids      UUID[],
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  algorithm       TEXT NOT NULL
);

CREATE INDEX idx_signatures_wafer_id ON spatial_signatures(wafer_id);
CREATE INDEX idx_signatures_type ON spatial_signatures(signature_type);

-- === AI classifications (Phase 3 — ONNX Classifier) ===
CREATE TABLE ai_classifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wafer_id        UUID NOT NULL REFERENCES wafers(id) ON DELETE CASCADE,
  model_name      TEXT NOT NULL,
  model_version   TEXT NOT NULL,
  predicted_class TEXT NOT NULL,
  confidence      REAL NOT NULL,
  all_scores      JSONB NOT NULL,
  classified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  human_override  TEXT,
  overridden_at   TIMESTAMPTZ
);

CREATE INDEX idx_ai_class_wafer_id ON ai_classifications(wafer_id);
