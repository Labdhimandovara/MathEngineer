/**
 * Deterministic Initial Interval / Bracket Search Service
 * 
 * Sourced directly from numerical root-finding principles:
 * If f(x) is continuous and f(a) * f(b) < 0, then by the
 * Intermediate Value Theorem, a real root alpha exists in (a, b).
 * 
 * Runs 100% locally and deterministically. Never calls external AI.
 */

import { compileExpression } from '../expressionParser.ts';
import {
  BracketSearchResult,
  BracketSearchResultSuccess,
  BracketStep,
  BracketSearchOptions,
} from './types.ts';

/**
 * Strips equation boilerplate and isolates f(x)
 */
export function normalizeEquationToExpression(equation: string): string {
  let clean = equation.trim();
  if (clean.includes('=')) {
    const parts = clean.split('=');
    const lhs = parts[0].trim();
    const rhs = parts.slice(1).join('=').trim();
    if (rhs === '0' || rhs === '') {
      clean = lhs;
    } else {
      clean = `(${lhs}) - (${rhs})`;
    }
  }
  return clean;
}

/**
 * Searches for a valid bracket [a, b] such that f(a) * f(b) < 0.
 * Uses a finite, safe, deterministic integer/half-step strategy near 0.
 */
export function findInitialBracket(
  equationOrExpr: string,
  options?: BracketSearchOptions
): BracketSearchResult {
  const steps: BracketStep[] = [];
  const cleanExpr = normalizeEquationToExpression(equationOrExpr);

  if (!cleanExpr) {
    return {
      found: false,
      reason: 'No mathematical equation or expression was provided.',
      steps: [],
    };
  }

  // Safe compilation
  let compiled: { fn: (x: number) => number };
  try {
    compiled = compileExpression(cleanExpr);
  } catch (err: any) {
    return {
      found: false,
      reason: `Invalid mathematical expression syntax: ${err?.message || 'Syntax error'}`,
      steps: [],
    };
  }

  // Safe evaluator
  const evalSafe = (x: number): { val: number; valid: boolean } => {
    try {
      const val = compiled.fn(x);
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return { val, valid: true };
      }
      return { val: NaN, valid: false };
    } catch {
      return { val: NaN, valid: false };
    }
  };

  const minRange = options?.min ?? -10;
  const maxRange = options?.max ?? 10;

  // Search candidate intervals:
  // We prioritize intervals starting from 0 upward: [0, 1], [1, 2], [2, 3], ...
  // followed by negative intervals: [-1, 0], [-2, -1], [-3, -2], ...
  const candidateIntervals: [number, number][] = [];

  for (let i = 0; i < maxRange; i++) {
    candidateIntervals.push([i, i + 1]);
  }
  for (let i = 0; i > minRange; i--) {
    candidateIntervals.push([i - 1, i]);
  }

  // Cache evaluations to avoid re-evaluating the same x
  const evalCache = new Map<number, { val: number; valid: boolean }>();
  const getCached = (x: number) => {
    if (!evalCache.has(x)) {
      const res = evalSafe(x);
      evalCache.set(x, res);
      steps.push({
        x,
        fx: res.val,
        isFinite: res.valid,
        note: res.valid ? `f(${x}) = ${res.val}` : `f(${x}) is non-finite or undefined`,
      });
    }
    return evalCache.get(x)!;
  };

  // Pass 1: Integer intervals
  for (const [a, b] of candidateIntervals) {
    const resA = getCached(a);
    const resB = getCached(b);

    if (resA.valid && resB.valid) {
      if (resA.val * resB.val < 0) {
        // Sign change found!
        return buildSuccessResult(cleanExpr, a, b, resA.val, resB.val, steps);
      }
    }
  }

  // Pass 2: Half-step intervals in [-5, 5] if no integer bracket was found
  const halfStepIntervals: [number, number][] = [];
  for (let x = 0; x < 5; x += 0.5) {
    halfStepIntervals.push([x, x + 0.5]);
  }
  for (let x = 0; x > -5; x -= 0.5) {
    halfStepIntervals.push([x - 0.5, x]);
  }

  for (const [a, b] of halfStepIntervals) {
    const resA = getCached(a);
    const resB = getCached(b);

    if (resA.valid && resB.valid) {
      if (resA.val * resB.val < 0) {
        return buildSuccessResult(cleanExpr, a, b, resA.val, resB.val, steps);
      }
    }
  }

  return {
    found: false,
    reason: `No sign-changing interval found in the search range [${minRange}, ${maxRange}].`,
    steps,
  };
}

function buildSuccessResult(
  cleanExpr: string,
  a: number,
  b: number,
  fa: number,
  fb: number,
  steps: BracketStep[]
): BracketSearchResultSuccess {
  const explanation = [
    `f(x) = ${cleanExpr}`,
    `f(${a}) = ${fa}`,
    `f(${b}) = ${fb}`,
    `The signs are opposite.`,
    `Therefore, [${a}, ${b}] is a valid starting interval.`,
  ];

  return {
    found: true,
    a,
    b,
    fa,
    fb,
    steps,
    explanation,
  };
}

/**
 * Formats a clean 5-step human-readable explanation matching course guidelines
 */
export function formatBracketExplanation(
  res: BracketSearchResultSuccess,
  methodName = 'False Position'
): string {
  const expr = res.explanation[0].startsWith('f(x) = ')
    ? res.explanation[0].slice(7)
    : res.explanation[0];
  return [
    'The question does not provide an initial interval.',
    '',
    'We can find one by checking simple trial values.',
    '',
    `1. f(x) = ${expr}`,
    `2. f(${res.a}) = ${res.fa}`,
    `3. f(${res.b}) = ${res.fb}`,
    '4. The signs are opposite.',
    `5. Therefore, [${res.a}, ${res.b}] is a valid starting interval.`,
    '',
    `We can now apply the ${methodName} method.`,
  ].join('\n');
}
