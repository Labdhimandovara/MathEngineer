/**
 * Assessment Session & History Repository (Phase 13.2)
 * 
 * Provides persistent database operations for student assessments and quizzes.
 * Compatible with existing AssessmentSession models and assessmentStore.
 */

import { getDatabase } from '../database.ts';
import { AssessmentSession } from '../../../services/assessment/assessmentTypes.ts';

export class AssessmentRepository {
  /**
   * Saves or updates an assessment session
   */
  static async save(session: AssessmentSession): Promise<AssessmentSession> {
    if (!session.id) {
      throw new Error('Assessment session must have an id');
    }
    const db = await getDatabase();
    await db.set(['assessments', session.id], session);
    return session;
  }

  /**
   * Batch saves assessment sessions (idempotent)
   */
  static async saveBatch(sessions: AssessmentSession[]): Promise<number> {
    const db = await getDatabase();
    let count = 0;
    for (const s of sessions) {
      if (s && s.id) {
        await db.set(['assessments', s.id], s);
        count++;
      }
    }
    return count;
  }

  /**
   * Retrieves a single assessment session by id
   */
  static async get(id: string): Promise<AssessmentSession | null> {
    if (!id) return null;
    const db = await getDatabase();
    const entry = await db.get<AssessmentSession>(['assessments', id]);
    return entry.value || null;
  }

  /**
   * Lists all completed assessment sessions (newest first)
   */
  static async list(includeActive = false): Promise<AssessmentSession[]> {
    const db = await getDatabase();
    const iter = db.list<AssessmentSession>({ prefix: ['assessments'] });
    const records: AssessmentSession[] = [];

    for await (const entry of iter) {
      if (!entry.value) continue;
      if (!includeActive && entry.value.status !== 'completed') continue;
      records.push(entry.value);
    }

    return records.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Deletes an assessment session
   */
  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.delete(['assessments', id]);
    return true;
  }
}
