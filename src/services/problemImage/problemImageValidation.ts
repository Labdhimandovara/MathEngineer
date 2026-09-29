/**
 * Problem Image Validation Utilities
 * 
 * Verifies that AI-extracted or student-edited mathematical problems
 * are mathematically well-formed and valid for deterministic solvers.
 */

import { compileExpression } from '../../math/expressionParser.ts';
import {
  ExtractedProblem,
  ProblemValidationResult,
  SupportedMethod,
} from './problemImageTypes.ts';

/**
 * Normalizes and strictly validates raw extracted problem data from Vision AI.
 * 
 * Crucial Rule: NEVER fabricates or silently invents missing mathematical information.
 * Any missing or ambiguous mathematical field remains null and triggers 'Needs review'.
 */
export function normalizeExtractedProblem(raw: any): ExtractedProblem {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      questionText: 'Unstructured problem image',
      equation: null,
      method: null,
      lowerBound: null,
      upperBound: null,
      initialGuess: null,
      decimalPlaces: null,
      confidence: 0,
      confidenceLabel: 'Needs review',
      notes: 'No structured mathematical data could be identified in the image.',
      missingFields: ['equation', 'method', 'bounds'],
    };
  }

  const missingFields: string[] = [];

  // 0. Stable Question ID: preserve if present, else generate stable img_q_ ID
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `img_q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Question text
  const questionText =
    typeof raw.questionText === 'string' && raw.questionText.trim()
      ? raw.questionText.trim()
      : 'Extracted mathematical problem';

  // 2. Equation: must be string, cannot be fabricated
  let equation: string | null = null;
  if (typeof raw.equation === 'string' && raw.equation.trim()) {
    equation = raw.equation.trim();
  } else {
    missingFields.push('equation');
  }

  // 3. Method: must be one of the 3 supported methods, never fabricated
  let method: SupportedMethod | null = null;
  const rawMethod = typeof raw.method === 'string' ? raw.method.trim().toLowerCase() : '';
  if (rawMethod === 'bisection' || rawMethod === 'false-position' || rawMethod === 'newton-raphson') {
    method = rawMethod as SupportedMethod;
  } else {
    missingFields.push('method');
  }

  // 4. Lower bound (a): numeric only, never fabricated
  let lowerBound: number | null = null;
  if (typeof raw.lowerBound === 'number' && isFinite(raw.lowerBound)) {
    lowerBound = raw.lowerBound;
  } else if (typeof raw.lowerBound === 'string' && raw.lowerBound.trim() !== '') {
    const parsed = parseFloat(raw.lowerBound);
    if (isFinite(parsed)) lowerBound = parsed;
    else missingFields.push('lowerBound');
  } else {
    missingFields.push('lowerBound');
  }

  // 5. Upper bound (b): numeric only, never fabricated
  let upperBound: number | null = null;
  if (typeof raw.upperBound === 'number' && isFinite(raw.upperBound)) {
    upperBound = raw.upperBound;
  } else if (typeof raw.upperBound === 'string' && raw.upperBound.trim() !== '') {
    const parsed = parseFloat(raw.upperBound);
    if (isFinite(parsed)) upperBound = parsed;
    else missingFields.push('upperBound');
  } else {
    missingFields.push('upperBound');
  }

  // 6. Initial guess (x0) for Newton-Raphson: numeric only, never fabricated
  let initialGuess: number | null = null;
  if (typeof raw.initialGuess === 'number' && isFinite(raw.initialGuess)) {
    initialGuess = raw.initialGuess;
  } else if (typeof raw.initialGuess === 'string' && raw.initialGuess.trim() !== '') {
    const parsed = parseFloat(raw.initialGuess);
    if (isFinite(parsed)) initialGuess = parsed;
    else if (method === 'newton-raphson') missingFields.push('initialGuess');
  } else if (method === 'newton-raphson') {
    missingFields.push('initialGuess');
  }

  // 7. Decimal places: must be integer between 1 and 6, or null if not in image
  let decimalPlaces: number | null = null;
  if (
    typeof raw.decimalPlaces === 'number' &&
    Number.isInteger(raw.decimalPlaces) &&
    raw.decimalPlaces >= 1 &&
    raw.decimalPlaces <= 6
  ) {
    decimalPlaces = raw.decimalPlaces;
  } else if (typeof raw.decimalPlaces === 'string') {
    const parsed = parseInt(raw.decimalPlaces, 10);
    if (parsed >= 1 && parsed <= 6) decimalPlaces = parsed;
  }

  // 8. Confidence calculation
  let confidence =
    typeof raw.confidence === 'number' && isFinite(raw.confidence)
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.5;

  // If any critical mathematical parameter is missing, force confidence down and label 'Needs review'
  const isMissingCritical =
    equation === null ||
    lowerBound === null ||
    upperBound === null ||
    (method === 'newton-raphson' && initialGuess === null);

  let confidenceLabel: 'High' | 'Medium' | 'Needs review';
  if (isMissingCritical) {
    confidence = Math.min(confidence, 0.4);
    confidenceLabel = 'Needs review';
  } else if (confidence >= 0.85) {
    confidenceLabel = 'High';
  } else if (confidence >= 0.6) {
    confidenceLabel = 'Medium';
  } else {
    confidenceLabel = 'Needs review';
  }

  const notes = typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : undefined;

  let boundsSource: 'supplied' | 'discovered' | 'manual' | 'missing' = 'missing';
  if (raw.boundsSource && ['supplied', 'discovered', 'manual', 'missing'].includes(raw.boundsSource)) {
    boundsSource = raw.boundsSource;
  } else if (lowerBound !== null && upperBound !== null) {
    boundsSource = 'supplied';
  } else {
    boundsSource = 'missing';
  }

  return {
    id,
    questionText,
    equation,
    method,
    lowerBound,
    upperBound,
    initialGuess,
    decimalPlaces,
    confidence,
    confidenceLabel,
    notes,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    boundsSource,
    discoveredExplanation: Array.isArray(raw.discoveredExplanation) ? raw.discoveredExplanation : undefined,
  };
}

export function validateExtractedProblem(
  problem: Partial<ExtractedProblem>,
  methodChoice?: SupportedMethod | null
): ProblemValidationResult {
  const result: ProblemValidationResult = {
    isValid: true,
  };

  // 1. Equation validation
  const rawEq = (problem.equation || '').trim();
  if (!rawEq) {
    result.isValid = false;
    result.equationError = 'Equation is missing. Please enter an equation f(x) = 0.';
  } else {
    // Strip trailing '= 0' or '=0'
    const cleanExpr = rawEq.replace(/=\s*0\s*$/, '').trim();
    try {
      const compiled = compileExpression(cleanExpr);
      // Test evaluation at sample points x = 1 and x = 2
      const val1 = compiled.fn(1);
      const val2 = compiled.fn(2);
      if (
        typeof val1 !== 'number' ||
        isNaN(val1) ||
        !isFinite(val1) ||
        typeof val2 !== 'number' ||
        isNaN(val2) ||
        !isFinite(val2)
      ) {
        result.isValid = false;
        result.equationError = 'Equation evaluated to non-finite or undefined value.';
      } else {
        result.parsedExpression = cleanExpr;
      }
    } catch (err: any) {
      result.isValid = false;
      result.equationError = `Equation syntax cannot be parsed: ${err?.message || 'Invalid syntax'}`;
    }
  }

  // 2. Active method validation
  const activeMethod = methodChoice ?? problem.method;
  if (!activeMethod || !['bisection', 'false-position', 'newton-raphson'].includes(activeMethod)) {
    result.isValid = false;
    result.methodError = 'Please choose a numerical method.';
  }

  // 3. Bounds validation
  if (
    problem.lowerBound === undefined ||
    problem.lowerBound === null ||
    isNaN(problem.lowerBound)
  ) {
    result.isValid = false;
    result.boundsError = 'Lower bound (a) is required.';
  }
  if (
    problem.upperBound === undefined ||
    problem.upperBound === null ||
    isNaN(problem.upperBound)
  ) {
    result.isValid = false;
    result.boundsError = 'Upper bound (b) is required.';
  }
  if (
    problem.lowerBound !== undefined &&
    problem.lowerBound !== null &&
    problem.upperBound !== undefined &&
    problem.upperBound !== null &&
    !isNaN(problem.lowerBound) &&
    !isNaN(problem.upperBound) &&
    problem.lowerBound >= problem.upperBound
  ) {
    result.isValid = false;
    result.boundsError = 'Lower bound (a) must be strictly less than upper bound (b).';
  }

  // 4. Initial guess validation (for Newton-Raphson)
  if (activeMethod === 'newton-raphson') {
    if (
      problem.initialGuess === undefined ||
      problem.initialGuess === null ||
      isNaN(problem.initialGuess)
    ) {
      result.isValid = false;
      result.initialGuessError = 'Initial guess (x₀) is required for Newton-Raphson.';
    }
  }

  // 5. Decimal places validation
  if (
    problem.decimalPlaces === undefined ||
    problem.decimalPlaces === null ||
    isNaN(problem.decimalPlaces) ||
    problem.decimalPlaces < 1 ||
    problem.decimalPlaces > 6
  ) {
    result.isValid = false;
    result.decimalPlacesError = 'Decimal places must be an integer between 1 and 6.';
  }

  return result;
}
