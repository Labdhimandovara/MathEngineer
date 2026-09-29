/**
 * Tutor Language Mode Manager (Phase 13)
 * 
 * Manages language preference ('english' vs 'hinglish') with local persistence.
 * Default is English. Hinglish provides natural Indian student-oriented explanations
 * while preserving standard mathematical terminology in English.
 */

import { useState, useEffect } from 'react';
import { LanguageMode } from './tutorTypes.ts';

export const LANGUAGE_MODE_STORAGE_KEY = 'mathengineer_tutor_lang_v1';
export const LANGUAGE_MODE_KEY = LANGUAGE_MODE_STORAGE_KEY;

let inMemoryLanguageMode: LanguageMode = 'english';
const listeners = new Set<(mode: LanguageMode) => void>();

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    return null;
  }
  return null;
}

/**
 * Returns current language mode with fallback to English
 */
export function getLanguageMode(): LanguageMode {
  try {
    const storage = getStorage();
    if (storage) {
      const stored = storage.getItem(LANGUAGE_MODE_STORAGE_KEY);
      if (stored === 'hinglish' || stored === 'english') {
        inMemoryLanguageMode = stored;
        return inMemoryLanguageMode;
      }
    }
  } catch {
    // Fall back to memory
  }
  return inMemoryLanguageMode;
}

/**
 * Sets language mode, persists to storage, and notifies subscribers
 */
export function setLanguageMode(mode: LanguageMode): void {
  if (mode !== 'english' && mode !== 'hinglish') {
    mode = 'english';
  }
  inMemoryLanguageMode = mode;
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(LANGUAGE_MODE_STORAGE_KEY, mode);
    }
  } catch (err) {
    console.warn('Unable to persist language mode:', err);
  }

  for (const l of listeners) {
    try {
      l(inMemoryLanguageMode);
    } catch (e) {
      console.error('Error in language mode listener:', e);
    }
  }
}

/**
 * Toggles language mode between english and hinglish
 */
export function toggleLanguageMode(): LanguageMode {
  const current = getLanguageMode();
  const next: LanguageMode = current === 'english' ? 'hinglish' : 'english';
  setLanguageMode(next);
  return next;
}

export type UseLanguageModeResult = [LanguageMode, (mode: LanguageMode) => void] & {
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  toggleMode: () => LanguageMode;
};

/**
 * React hook subscribing to live language mode updates
 */
export function useLanguageMode(): UseLanguageModeResult {
  const [mode, setModeState] = useState<LanguageMode>(getLanguageMode());

  useEffect(() => {
    const handler = (newMode: LanguageMode) => setModeState(newMode);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const result = [mode, setLanguageMode] as any;
  result.languageMode = mode;
  result.setLanguageMode = setLanguageMode;
  result.toggleMode = toggleLanguageMode;
  return result;
}
