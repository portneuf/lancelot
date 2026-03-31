/**
 * PostgreSQL defect query functions.
 */
import type { Db } from './db-types';
import type { DefectFilter, Pagination, PagedResult, StoredDefectRecord } from '../storage-types';
export declare function queryDefects(sql: Db, filter: DefectFilter, pagination: Pagination): Promise<PagedResult<StoredDefectRecord>>;
export declare function getWaferDefects(sql: Db, waferId: string, filter?: DefectFilter): Promise<StoredDefectRecord[]>;
export declare function getDefectCount(sql: Db, filter: DefectFilter): Promise<number>;
