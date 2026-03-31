/**
 * SQL Migration Runner for PostgreSQL.
 *
 * Reads .sql files from this directory, tracks applied migrations
 * in a _migrations table, and applies new ones in order.
 * Idempotent: running twice has no effect on already-applied migrations.
 */
import type { MigrationResult } from '../storage-types';
/**
 * Run all pending migrations against a PostgreSQL connection.
 *
 * @param sql - A postgres tagged template function (from porsager/postgres)
 * @param migrationSqls - Map of migration name → full SQL string.
 *   If not provided, migrations must be applied manually.
 */
export declare function runMigrations(sql: {
    unsafe: (query: string) => Promise<unknown>;
    begin: <T>(fn: (tx: {
        unsafe: (q: string) => Promise<unknown>;
    }) => Promise<T>) => Promise<T>;
} & ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, unknown>>>), migrationSqls: Map<string, string>): Promise<MigrationResult>;
/** List of migration names in order. */
export declare const MIGRATION_NAMES: string[];
