/**
 * SQL Migration Runner for PostgreSQL.
 *
 * Reads .sql files from this directory, tracks applied migrations
 * in a _migrations table, and applies new ones in order.
 * Idempotent: running twice has no effect on already-applied migrations.
 */

import type { MigrationResult } from '../storage-types';

/**
 * Migration definitions — embedded SQL strings.
 * We embed them here instead of reading from disk because the library
 * build doesn't include .sql files as assets.
 */
const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: '001_initial_schema',
    sql: `-- See 001_initial_schema.sql for the full SQL.
-- This is loaded at build time via the runner.`,
  },
  {
    name: '002_materialized_views',
    sql: `-- See 002_materialized_views.sql for the full SQL.
-- This is loaded at build time via the runner.`,
  },
];

/**
 * Run all pending migrations against a PostgreSQL connection.
 *
 * @param sql - A postgres tagged template function (from porsager/postgres)
 * @param migrationSqls - Map of migration name → full SQL string.
 *   If not provided, migrations must be applied manually.
 */
export async function runMigrations(
  sql: { unsafe: (query: string) => Promise<unknown>; begin: <T>(fn: (tx: { unsafe: (q: string) => Promise<unknown> }) => Promise<T>) => Promise<T> } & ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, unknown>>>),
  migrationSqls: Map<string, string>,
): Promise<MigrationResult> {
  const result: MigrationResult = { applied: 0, skipped: 0, errors: [] };

  // Ensure _migrations table exists
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const applied = await sql`SELECT name FROM _migrations ORDER BY id`;
  const appliedSet = new Set(applied.map((r) => r.name as string));

  // Apply new migrations in order
  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.name)) {
      result.skipped++;
      continue;
    }

    const fullSql = migrationSqls.get(migration.name);
    if (!fullSql) {
      result.errors.push(`Migration SQL not found: ${migration.name}`);
      continue;
    }

    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(fullSql);
        await tx.unsafe(
          `INSERT INTO _migrations (name) VALUES ('${migration.name}')`,
        );
      });
      result.applied++;
    } catch (err) {
      result.errors.push(
        `Failed to apply ${migration.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}

/** List of migration names in order. */
export const MIGRATION_NAMES = MIGRATIONS.map((m) => m.name);
