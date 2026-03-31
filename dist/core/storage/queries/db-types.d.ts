/**
 * Shared database type for all query modules.
 * Uses ReturnType of the postgres() function for correct typing.
 */
import postgres from 'postgres';
export type Db = ReturnType<typeof postgres>;
