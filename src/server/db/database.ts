/**
 * Server Database Engine (Phase 13.2)
 * 
 * Provides an embedded, zero-external-dependency, file-persisted database
 * backed by Deno KV / SQLite (writing to ./data/mathengineer.db).
 * 
 * Guarantees:
 * - Persistent across server restarts.
 * - Supports memory mode (':memory:') for ultra-fast, isolated testing.
 * - Clean asynchronous API for repositories.
 * - Zero raw SQL in UI components.
 */

let kvInstance: Deno.Kv | null = null;
let currentDbPath = './data/mathengineer.db';

export function setDatabasePath(path: string): void {
  currentDbPath = path;
  if (kvInstance) {
    try {
      kvInstance.close();
    } catch {
      // ignore
    }
    kvInstance = null;
  }
}

export async function getDatabase(): Promise<Deno.Kv> {
  if (kvInstance) {
    return kvInstance;
  }

  if (currentDbPath !== ':memory:') {
    try {
      await Deno.mkdir('./data', { recursive: true });
    } catch {
      // Directory exists or in environment where mkdir is unnecessary
    }
  }

  kvInstance = await Deno.openKv(currentDbPath);
  return kvInstance;
}

export async function closeDatabase(): Promise<void> {
  if (kvInstance) {
    try {
      kvInstance.close();
    } catch {
      // ignore
    }
    kvInstance = null;
  }
}

/**
 * Resets database contents (primarily for automated test environments)
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  const iter = db.list({ prefix: [] });
  for await (const entry of iter) {
    await db.delete(entry.key);
  }
}
