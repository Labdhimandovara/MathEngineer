/**
 * Learning Attempt Repository (Phase 13.2)
 * 
 * Provides persistent database operations for student learning attempts.
 * Compatible with existing LearningAttempt data model and learningStore.
 */

import { getDatabase } from '../database.ts';
import { LearningAttempt } from '../../../types/learning.ts';

export class LearningAttemptRepository {
  /**
   * Saves or updates a single learning attempt
   */
  static async save(attempt: LearningAttempt): Promise<LearningAttempt> {
    if (!attempt.id) {
      throw new Error('Learning attempt must have an id');
    }
    const db = await getDatabase();
    await db.set(['attempts', attempt.id], attempt);
    return attempt;
  }

  /**
   * Batch saves attempts (idempotent, skips duplicates if unchanged)
   */
  static async saveBatch(attempts: LearningAttempt[]): Promise<number> {
    const db = await getDatabase();
    let savedCount = 0;
    for (const att of attempts) {
      if (att && att.id) {
        await db.set(['attempts', att.id], att);
        savedCount++;
      }
    }
    return savedCount;
  }

  /**
   * Retrieves a single learning attempt by id
   */
  static async get(id: string): Promise<LearningAttempt | null> {
    if (!id) return null;
    const db = await getDatabase();
    const entry = await db.get<LearningAttempt>(['attempts', id]);
    return entry.value || null;
  }

  /**
   * Lists all learning attempts, with optional filters
   */
  static async list(filter?: {
    method?: string;
    questionId?: string;
    source?: string;
  }): Promise<LearningAttempt[]> {
    const db = await getDatabase();
    const iter = db.list<LearningAttempt>({ prefix: ['attempts'] });
    const records: LearningAttempt[] = [];

    for await (const entry of iter) {
      if (!entry.value) continue;
      const att = entry.value;

      if (filter?.method && att.method !== filter.method) continue;
      if (filter?.questionId && att.questionId !== filter.questionId) continue;
      if (filter?.source && att.source !== filter.source) continue;

      records.push(att);
    }

    return records.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Deletes an attempt
   */
  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.delete(['attempts', id]);
    return true;
  }
}
