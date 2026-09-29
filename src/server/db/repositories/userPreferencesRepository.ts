/**
 * User Preferences Repository (Phase 13.2)
 * 
 * Provides persistent database operations for student preferences.
 */

import { getDatabase } from '../database.ts';

export interface UserPreferences {
  userId: string;
  languageMode?: 'english' | 'hinglish';
  theme?: string;
  updatedAt: string;
}

export class UserPreferencesRepository {
  static async get(userId = 'anonymous_student'): Promise<UserPreferences> {
    const db = await getDatabase();
    const entry = await db.get<UserPreferences>(['preferences', userId]);
    return (
      entry.value || {
        userId,
        languageMode: 'english',
        updatedAt: new Date().toISOString(),
      }
    );
  }

  static async set(
    userId = 'anonymous_student',
    prefs: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const db = await getDatabase();
    const existing = await this.get(userId);
    const updated: UserPreferences = {
      ...existing,
      ...prefs,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await db.set(['preferences', userId], updated);
    return updated;
  }
}
