/**
 * Image Problem Repository (Phase 13.2)
 * 
 * Provides persistent database operations for student-uploaded image problems.
 * Guarantees:
 * - Stable questionId (never duplicates records or creates branch suffixes).
 * - Discoveries update the canonical record in place.
 * - Atomic updates and validation.
 */

import { getDatabase } from '../database.ts';
import { RegisteredImageProblem } from '../../../services/problem/imageProblemRegistry.ts';

export interface ImageProblemRecord extends RegisteredImageProblem {
  id?: string;
  originalText?: string;
  imageStoragePath?: string;
  ocrText?: string;
  topic?: string;
  updatedAt?: string;
}

export class ImageProblemRepository {
  /**
   * Saves or updates a canonical image problem
   */
  static async save(problem: ImageProblemRecord): Promise<ImageProblemRecord> {
    if (!problem.questionId) {
      throw new Error('Image problem must have a valid questionId');
    }

    const db = await getDatabase();
    const existing = await this.get(problem.questionId);

    const now = new Date().toISOString();
    const record: ImageProblemRecord = {
      ...existing,
      ...problem,
      id: problem.id || existing?.id || problem.questionId,
      questionId: problem.questionId,
      source: 'image',
      method: problem.method || existing?.method || 'false-position',
      equation: (problem.equation || existing?.equation || '').trim(),
      lowerBound: problem.lowerBound !== undefined ? problem.lowerBound : (existing?.lowerBound ?? null),
      upperBound: problem.upperBound !== undefined ? problem.upperBound : (existing?.upperBound ?? null),
      boundsSource: problem.boundsSource || existing?.boundsSource || 'missing',
      initialGuess: problem.initialGuess !== undefined ? problem.initialGuess : (existing?.initialGuess ?? null),
      decimalPlaces: problem.decimalPlaces ?? existing?.decimalPlaces ?? 3,
      createdAt: existing?.createdAt || problem.createdAt || now,
      updatedAt: now,
      title: problem.title || existing?.title || 'Extracted Problem',
      topic: problem.topic || existing?.topic,
      imageThumbnailUrl: problem.imageThumbnailUrl || existing?.imageThumbnailUrl,
      imageStoragePath: problem.imageStoragePath || existing?.imageStoragePath,
      rawExtractedText: problem.rawExtractedText || existing?.rawExtractedText,
      ocrText: problem.ocrText || existing?.ocrText || problem.rawExtractedText,
    };

    await db.set(['image_problems', problem.questionId], record);
    return record;
  }

  /**
   * Retrieves an image problem by its stable questionId
   */
  static async get(questionId: string): Promise<ImageProblemRecord | null> {
    if (!questionId) return null;
    const db = await getDatabase();
    const entry = await db.get<ImageProblemRecord>(['image_problems', questionId]);
    return entry.value || null;
  }

  /**
   * Lists all registered image problems (newest first)
   */
  static async list(): Promise<ImageProblemRecord[]> {
    const db = await getDatabase();
    const iter = db.list<ImageProblemRecord>({ prefix: ['image_problems'] });
    const records: ImageProblemRecord[] = [];
    for await (const entry of iter) {
      if (entry.value) {
        records.push(entry.value);
      }
    }
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * In-place partial update (e.g. updating discovered bounds [a, b])
   */
  static async update(
    questionId: string,
    updates: Partial<ImageProblemRecord>
  ): Promise<ImageProblemRecord | null> {
    const existing = await this.get(questionId);
    if (!existing) {
      return null;
    }
    return await this.save({
      ...existing,
      ...updates,
      questionId, // strictly preserve existing ID
    });
  }

  /**
   * Deletes an image problem
   */
  static async delete(questionId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.delete(['image_problems', questionId]);
    return true;
  }
}
