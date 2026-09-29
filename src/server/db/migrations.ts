/**
 * Database Migrations (Phase 13.2)
 * 
 * Manages schema versions and idempotent database initialization.
 */

import { getDatabase } from './database.ts';

export const CURRENT_SCHEMA_VERSION = 1;

export async function runMigrations(): Promise<{ version: number; migrated: boolean }> {
  const db = await getDatabase();
  const versionEntry = await db.get<number>(['meta', 'schema_version']);
  const currentVersion = versionEntry.value || 0;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return { version: currentVersion, migrated: false };
  }

  // Migration 1: Initial schema setup
  if (currentVersion < 1) {
    // Initialize default anonymous student profile if not exists
    const defaultUser = await db.get(['users', 'anonymous_student']);
    if (!defaultUser.value) {
      await db.set(['users', 'anonymous_student'], {
        id: 'anonymous_student',
        name: 'Local Student',
        languageMode: 'english',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Set schema version
    await db.set(['meta', 'schema_version'], 1);
  }

  return { version: CURRENT_SCHEMA_VERSION, migrated: true };
}
