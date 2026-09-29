/**
 * Local Browser OCR Service
 * 
 * Runs Tesseract.js locally in the browser.
 * Caches OCR results per image to avoid redundant computations on re-render.
 * Never calls external paid APIs or consumes Gemini quota.
 */

import { LocalOcrResult } from './ocrTypes.ts';

// In-memory cache for OCR results
const ocrCache = new Map<string, LocalOcrResult>();

// Optional mock runner for deterministic unit testing without canvas / workers
let mockRunner: ((source: any) => Promise<LocalOcrResult>) | null = null;

export function setMockOcrRunner(runner: ((source: any) => Promise<LocalOcrResult>) | null): void {
  mockRunner = runner;
}

export function clearOcrCache(): void {
  ocrCache.clear();
}

/**
 * Computes a cache key for the given image source
 */
function getImageKey(source: File | Blob | string): string {
  if (typeof source === 'string') {
    // If it's a base64 string or URL, take a hash or slice
    return source.slice(0, 200) + ':' + source.length;
  }
  if (source instanceof File) {
    return `${source.name}:${source.size}:${source.lastModified}`;
  }
  if (source instanceof Blob) {
    return `blob:${source.size}:${source.type}`;
  }
  return String(source);
}

/**
 * Executes local OCR on an image file, blob, or data URL
 */
export async function performLocalOcr(
  imageSource: File | Blob | string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  }
): Promise<LocalOcrResult> {
  const cacheKey = getImageKey(imageSource);

  if (ocrCache.has(cacheKey)) {
    return ocrCache.get(cacheKey)!;
  }

  if (options?.signal?.aborted) {
    throw new DOMException('OCR execution aborted', 'AbortError');
  }

  // Use mock runner if set (e.g. in test suite)
  if (mockRunner) {
    const res = await mockRunner(imageSource);
    ocrCache.set(cacheKey, res);
    return res;
  }

  try {
    // Dynamically import tesseract.js for bundle optimization
    const TesseractModule = await import('tesseract.js');
    const Tesseract = TesseractModule.default || TesseractModule;

    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number' && options?.onProgress) {
          options.onProgress(m.progress);
        }
      },
    });

    const text = result?.data?.text || '';
    const confidence = typeof result?.data?.confidence === 'number' ? result.data.confidence / 100 : 0.5;
    const words = result?.data?.words?.map((w: any) => ({
      text: w.text,
      confidence: (w.confidence || 0) / 100,
    })) || [];

    const ocrResult: LocalOcrResult = {
      text: text.trim(),
      confidence,
      source: 'local-ocr',
      words,
    };

    ocrCache.set(cacheKey, ocrResult);
    return ocrResult;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    console.warn('Local OCR encountered an issue:', err?.message || err);
    // Return safe fallback indicating text could not be read
    const fallbackResult: LocalOcrResult = {
      text: '',
      confidence: 0,
      source: 'local-ocr',
      words: [],
    };
    return fallbackResult;
  }
}
