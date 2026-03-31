/**
 * PostgreSQL lot/wafer query functions.
 */
import type { Db } from './db-types';
import type { LotFilter, Pagination, PagedResult, LotSummary, WaferSummary, ImportRecord } from '../storage-types';
export declare function queryLots(sql: Db, filter: LotFilter, pagination: Pagination): Promise<PagedResult<LotSummary>>;
export declare function queryWafers(sql: Db, lotId: string): Promise<WaferSummary[]>;
export declare function getImportHistory(sql: Db, pagination: Pagination): Promise<PagedResult<ImportRecord>>;
