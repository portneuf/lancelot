/**
 * PostgreSQL import (ingestion) queries.
 *
 * Handles inserting parsed InspectionFile data into the database
 * with batch inserts for defects (10k per batch).
 */
import type { Db } from './db-types';
import type { InspectionFile } from '../../models/inspection-file';
import type { ImportResult } from '../storage-types';
export declare function importFileToDb(sql: Db, file: InspectionFile): Promise<ImportResult>;
