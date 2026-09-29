/**
 * Deterministic Question Parser
 * 
 * Analyzes local OCR text from student uploads to extract mathematical parameters:
 * - Numerical method (Bisection, False Position, Newton-Raphson)
 * - Equation (including natural language patterns like "fourth root of 32")
 * - Interval bounds [a, b]
 * - Initial guess x0
 * - Target decimal places
 * 
 * Runs 100% locally and deterministically. Never calls external AI.
 */

import { SupportedMethod, BoundsSource } from '../problemImage/problemImageTypes.ts';
import { ParsedQuestionResult } from './ocrTypes.ts';
import { compileExpression } from '../../math/expressionParser.ts';

function generateQuestionId(): string {
  return `img_q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Normalizes unicode mathematical glyphs and OCR artifacts
 */
function cleanOcrText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[—–]/g, '-')
    .replace(/[−]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/⁴/g, '^4')
    .replace(/³/g, '^3')
    .replace(/²/g, '^2')
    .replace(/¹/g, '^1')
    .replace(/⁰/g, '^0')
    .replace(/x[₀o]/gi, 'x0');
}

/**
 * Parses numerical method from question text
 */
function extractMethod(lower: string): SupportedMethod | null {
  if (
    lower.includes('false position') ||
    lower.includes('regula falsi') ||
    lower.includes('falsi') ||
    lower.includes('chord method')
  ) {
    return 'false-position';
  }
  if (
    lower.includes('bisection') ||
    lower.includes('bolzano') ||
    lower.includes('interval halving')
  ) {
    return 'bisection';
  }
  if (
    lower.includes('newton') ||
    lower.includes('raphson') ||
    lower.includes('tangent method')
  ) {
    return 'newton-raphson';
  }
  return null;
}

/**
 * Detects natural-language root specifications:
 * e.g. "fourth root of 32" -> "x^4 - 32 = 0"
 */
function extractNaturalLanguageRoot(lower: string): { equation: string; pattern: string } | null {
  // Pattern 1: Worded root: "fourth root of 32", "cube root of 10", etc.
  const wordRootMatch = lower.match(
    /(?:find|compute|calculate|evaluate|determine)?\s*(?:the\s+)?(square|cube|cubic|fourth|fifth|sixth|seventh|eighth|ninth|tenth|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+root\s+of\s+(\d+(?:\.\d+)?)/i
  );

  if (wordRootMatch) {
    const rootName = wordRootMatch[1].toLowerCase();
    const val = wordRootMatch[2];
    let power = 2;
    if (rootName === 'cube' || rootName === 'cubic' || rootName === '3rd') power = 3;
    else if (rootName === 'fourth' || rootName === '4th') power = 4;
    else if (rootName === 'fifth' || rootName === '5th') power = 5;
    else if (rootName === 'sixth' || rootName === '6th') power = 6;
    else if (rootName === 'seventh' || rootName === '7th') power = 7;
    else if (rootName === 'eighth' || rootName === '8th') power = 8;
    else if (rootName === 'ninth' || rootName === '9th') power = 9;
    else if (rootName === 'tenth' || rootName === '10th') power = 10;

    return {
      equation: `x^${power} - ${val} = 0`,
      pattern: `${rootName} root of ${val}`,
    };
  }

  // Pattern 2: Numeric power root: "4th root of 32"
  const numRootMatch = lower.match(
    /(?:the\s+)?(\d+)(?:th|st|nd|rd)\s+root\s+of\s+(\d+(?:\.\d+)?)/i
  );
  if (numRootMatch) {
    const power = parseInt(numRootMatch[1], 10);
    const val = numRootMatch[2];
    if (power >= 2 && power <= 10) {
      return {
        equation: `x^${power} - ${val} = 0`,
        pattern: `${power}th root of ${val}`,
      };
    }
  }

  return null;
}

/**
 * Searches for explicit mathematical equations in the text
 */
function extractExplicitEquation(text: string): string | null {
  // Strategy 1: Look for equations ending in "= 0"
  const eqZeroMatch = text.match(/(?:root of\s+|equation\s+|solve\s+)?([a-zA-Z0-9\s\+\-\*\/\^\(\)\.]{3,50})\s*=\s*0/i);
  if (eqZeroMatch) {
    let cand = eqZeroMatch[1].trim();
    cand = cand.replace(/^(?:find\s+)?(?:a\s+)?(?:the\s+)?(?:real\s+)?(?:positive\s+)?(?:root\s+of\s+|equation\s+|solve\s+)+/i, '').trim();
    try {
      const compiled = compileExpression(cand);
      const v = compiled.fn(1);
      if (typeof v === 'number' && isFinite(v)) {
        return `${cand} = 0`;
      }
    } catch {
      // continue
    }
  }

  // Strategy 2: Scan lines for candidates
  const lines = text.split('\n');
  const eqCandidates: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Look for explicit "f(x) = ..." or "... = 0"
    const fxMatch = trimmed.match(/f\s*\(\s*x\s*\)\s*=\s*([^,;]+)/i);
    if (fxMatch) {
      eqCandidates.push(fxMatch[1].trim());
    }

    // Delimited before common English keywords
    const delimitedMatch = trimmed.match(
      /(?:root of\s+|equation\s+|solve\s+)?([x\d\s\+\-\*\/\^\(\)\.]*(?:cos|sin|exp|x\^)[x\d\s\+\-\*\/\^\(\)\.]*(?:=\s*0)?)\s+(?:using|by|in|on|with|correct|to)/i
    );
    if (delimitedMatch) {
      let cand = delimitedMatch[1].trim().replace(/=\s*0$/, '').trim();
      cand = cand.replace(/^(?:find\s+)?(?:a\s+)?(?:the\s+)?(?:real\s+)?(?:positive\s+)?(?:root\s+of\s+|equation\s+|solve\s+)+/i, '').trim();
      eqCandidates.push(cand);
    }

    const polyMatch = trimmed.match(/(x\^[0-9]+[\s\d\+\-\*\/\^x\.]+(?:=\s*0)?)/i);
    if (polyMatch) {
      eqCandidates.push(polyMatch[1].trim());
    }
  }

  // Test and validate candidates with compileExpression
  for (const cand of eqCandidates) {
    const cleanCand = cand
      .replace(/=\s*0$/, '')
      .replace(/=\s*$/, '')
      .trim();
    try {
      const compiled = compileExpression(cleanCand);
      const v1 = compiled.fn(1);
      const v2 = compiled.fn(2);
      if (typeof v1 === 'number' && isFinite(v1) && typeof v2 === 'number' && isFinite(v2)) {
        return cleanCand.includes('=') ? cleanCand : `${cleanCand} = 0`;
      }
    } catch {
      // keep searching
    }
  }

  return null;
}

/**
 * Extracts target decimal places requirement
 */
function extractDecimalPlaces(lower: string): number | null {
  const match = lower.match(
    /(?:correct\s+to|to)\s+(one|two|three|four|five|six|\d+)\s+decimal\s+places?/i
  );
  if (match) {
    const rawVal = match[1].toLowerCase();
    if (rawVal === 'one') return 1;
    if (rawVal === 'two') return 2;
    if (rawVal === 'three') return 3;
    if (rawVal === 'four') return 4;
    if (rawVal === 'five') return 5;
    if (rawVal === 'six') return 6;
    const parsed = parseInt(rawVal, 10);
    if (parsed >= 1 && parsed <= 6) return parsed;
  }

  // Short forms: "3 decimal places", "4 decimals", "3 places of decimals"
  const shortMatch = lower.match(/(\d+)\s+decimal\s+places?/i) ||
    lower.match(/(\d+)\s+decimals?/i) ||
    lower.match(/(\d+)\s+places\s+of\s+decimals?/i);
  if (shortMatch) {
    const p = parseInt(shortMatch[1], 10);
    if (p >= 1 && p <= 6) return p;
  }

  return null;
}

/**
 * Extracts interval bounds [a, b]
 */
function extractBounds(text: string): { lowerBound: number | null; upperBound: number | null; boundsSource: BoundsSource } {
  // Pattern 1: [a, b] or (a, b)
  const bracketMatch = text.match(/(?:in|on|interval)?\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i);
  if (bracketMatch) {
    const a = parseFloat(bracketMatch[1]);
    const b = parseFloat(bracketMatch[2]);
    if (!isNaN(a) && !isNaN(b)) {
      return { lowerBound: a, upperBound: b, boundsSource: 'supplied' };
    }
  }

  // Pattern 2: between a and b / lying between a and b
  const betweenMatch = text.match(/(?:between|lying between)\s+(-?\d+(?:\.\d+)?)\s+and\s+(-?\d+(?:\.\d+)?)/i);
  if (betweenMatch) {
    const a = parseFloat(betweenMatch[1]);
    const b = parseFloat(betweenMatch[2]);
    if (!isNaN(a) && !isNaN(b)) {
      return { lowerBound: a, upperBound: b, boundsSource: 'supplied' };
    }
  }

  return { lowerBound: null, upperBound: null, boundsSource: 'missing' };
}

/**
 * Extracts initial guess x0 for Newton-Raphson
 */
function extractInitialGuess(text: string): number | null {
  const guessMatch =
    text.match(/x0\s*=\s*(-?\d+(?:\.\d+)?)/i) ||
    text.match(/initial\s+guess\s+(?:x0\s*=\s*)?(-?\d+(?:\.\d+)?)/i) ||
    text.match(/starting\s+(?:with|near|at)\s+(?:x0\s*=\s*)?(-?\d+(?:\.\d+)?)/i) ||
    text.match(/near\s+(?:x0\s*=\s*)?(-?\d+(?:\.\d+)?)/i);

  if (guessMatch) {
    const parsed = parseFloat(guessMatch[1]);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

/**
 * Deterministically parses OCR text into a structured problem definition
 */
export function parseQuestionText(ocrText: string): ParsedQuestionResult {
  const cleanedText = cleanOcrText(ocrText || '');
  const lower = cleanedText.toLowerCase();

  const missingFields: string[] = [];

  // 1. Method
  const method = extractMethod(lower);
  if (!method) {
    missingFields.push('method');
  }

  // 2. Equation (Natural language pattern first, then explicit formula)
  let equation: string | null = null;
  let patternMatched: string | undefined;

  const nlRoot = extractNaturalLanguageRoot(lower);
  if (nlRoot) {
    equation = nlRoot.equation;
    patternMatched = nlRoot.pattern;
  } else {
    equation = extractExplicitEquation(cleanedText);
  }

  if (!equation) {
    missingFields.push('equation');
  }

  // 3. Decimal places
  const decimalPlaces = extractDecimalPlaces(lower);
  if (decimalPlaces === null) {
    missingFields.push('decimalPlaces');
  }

  // 4. Bounds
  const { lowerBound, upperBound, boundsSource } = extractBounds(cleanedText);
  if (lowerBound === null || upperBound === null) {
    missingFields.push('bounds');
  }

  // 5. Initial Guess (relevant for Newton-Raphson)
  const initialGuess = extractInitialGuess(cleanedText);
  if (method === 'newton-raphson' && initialGuess === null) {
    missingFields.push('initialGuess');
  }

  // Confidence & Notes
  let confidence = 0.5;
  let confidenceLabel: 'High' | 'Medium' | 'Needs review' = 'Needs review';
  let notes: string | undefined;

  const hasMethod = method !== null;
  const hasEquation = equation !== null;
  const hasBounds = lowerBound !== null && upperBound !== null;
  const hasInitialGuess = initialGuess !== null;

  if (hasMethod && hasEquation) {
    if (method === 'newton-raphson') {
      if (hasInitialGuess) {
        confidence = 0.95;
        confidenceLabel = 'High';
      } else {
        confidence = 0.75;
        confidenceLabel = 'Needs review';
        notes = 'Initial guess x₀ not detected. Please verify or enter x₀.';
      }
    } else {
      // Bisection / False Position
      if (hasBounds) {
        confidence = 0.95;
        confidenceLabel = 'High';
      } else {
        confidence = 0.85;
        confidenceLabel = 'Needs review';
        notes = 'Initial interval not provided in question. Deterministic bracket search available.';
      }
    }
  } else if (hasEquation || hasMethod) {
    confidence = 0.55;
    confidenceLabel = 'Needs review';
    notes = 'Some parts of this question could not be confidently understood.';
  } else {
    confidence = 0.2;
    confidenceLabel = 'Needs review';
    notes = 'Some parts of this question could not be confidently understood.';
  }

  return {
    id: generateQuestionId(),
    questionText: cleanedText.trim() || 'Extracted question photo',
    equation,
    method,
    lowerBound,
    upperBound,
    initialGuess,
    decimalPlaces,
    confidence,
    confidenceLabel,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    patternMatched,
    notes,
    boundsSource,
    extractionSource: 'local-ocr',
  };
}

export const parseQuestionFromOcr = parseQuestionText;
