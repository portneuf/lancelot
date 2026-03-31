/**
 * PostgreSQL analytics query functions.
 * Pareto, Yield, Trend, Correlation, SPC, Class Distribution.
 */
import type { Db } from './db-types';
import type { DefectFilter, LotFilter, TrendMetric, ParetoEntry, YieldSummary, TrendPoint, CorrelationPoint, ClassDistEntry, SPCDataSet, HeatmapCell, WaferMapData, StackedMapData, AggregationMode } from '../storage-types';
export declare function getPareto(sql: Db, filter: DefectFilter, topN: number): Promise<ParetoEntry[]>;
export declare function getYieldSummary(sql: Db, filter: LotFilter): Promise<YieldSummary>;
export declare function getTrend(sql: Db, _metric: TrendMetric, filter: LotFilter, groupBy: 'lot' | 'wafer' | 'day'): Promise<TrendPoint[]>;
export declare function getCorrelation(sql: Db, _xMetric: string, _yMetric: string, filter: LotFilter): Promise<CorrelationPoint[]>;
export declare function getClassDistribution(sql: Db, filter: DefectFilter): Promise<ClassDistEntry[]>;
export declare function getSPCData(sql: Db, _metric: string, filter: LotFilter): Promise<SPCDataSet>;
export declare function getWaferMapData(sql: Db, waferId: string): Promise<WaferMapData | null>;
export declare function getSpatialDensity(sql: Db, waferId: string, gridSize: number): Promise<HeatmapCell[]>;
export declare function getStackedWaferMapData(sql: Db, waferIds: string[], aggregation: AggregationMode, gridSize: number): Promise<StackedMapData>;
