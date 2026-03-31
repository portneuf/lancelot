-- Migration 002: Materialized Views for fast aggregates

-- === Lot statistics ===
CREATE MATERIALIZED VIEW lot_statistics AS
SELECT
  l.id AS lot_id,
  l.lot_id AS lot_id_text,
  l.step_id,
  l.setup_id,
  l.result_timestamp,
  l.inspection_station,
  i.source_file,
  i.imported_at,
  COUNT(DISTINCT w.id) AS wafer_count,
  SUM(w.defect_count) AS total_defects,
  AVG(w.defect_count) AS avg_defects_per_wafer,
  AVG(w.yield) AS avg_yield,
  MIN(w.yield) AS min_yield,
  MAX(w.yield) AS max_yield
FROM lots l
JOIN imports i ON i.id = l.import_id
JOIN wafers w ON w.lot_id = l.id
GROUP BY l.id, i.source_file, i.imported_at;

CREATE UNIQUE INDEX idx_lot_statistics_id ON lot_statistics(lot_id);

-- === Defect class pareto ===
CREATE MATERIALIZED VIEW defect_class_pareto AS
SELECT
  l.id AS lot_id,
  cl.class_number,
  cl.class_name,
  COUNT(d.id) AS defect_count
FROM defects d
JOIN wafers w ON d.wafer_id = w.id
JOIN lots l ON w.lot_id = l.id
JOIN class_lookups cl ON cl.lot_id = l.id AND cl.class_number = d.class_number
GROUP BY l.id, cl.class_number, cl.class_name;

CREATE INDEX idx_pareto_lot ON defect_class_pareto(lot_id);
