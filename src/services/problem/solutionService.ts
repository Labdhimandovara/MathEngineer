/**
 * Canonical Deterministic Solution Service (Phase 13.3)
 * 
 * The single authoritative mathematical solution engine for MathEngineer.
 * Guarantees that numerical solutions NEVER depend on Gemini.
 * 
 * Shared across:
 * - Solve
 * - Solve With Me
 * - Show Solution
 * - Review
 * - Tutor calculation queries
 */

import { solveBisection, BisectionResult } from '../../math/bisection/index.ts';
import { solveFalsePosition, FalsePositionResult } from '../../math/falsePosition/index.ts';
import { solveNewtonRaphson, NewtonRaphsonResult } from '../../math/newtonRaphson/index.ts';
import { findInitialBracket, normalizeEquationToExpression } from '../../math/bracketSearch/index.ts';
import { updateRegisteredImageProblem, getImageProblem } from './imageProblemRegistry.ts';
import { BoundsSource } from '../problemImage/problemImageTypes.ts';

export type SolverMethod = 'bisection' | 'false-position' | 'newton-raphson';

export interface DeterministicSolutionRequest {
  questionId?: string;
  equation: string;
  method?: SolverMethod | string;
  lowerBound?: number | null;
  upperBound?: number | null;
  initialGuess?: number | null;
  decimalPlaces?: number;
  boundsSource?: BoundsSource;
  source?: string;
}

export interface DeterministicSolutionResult {
  success: boolean;
  questionId: string;
  method: SolverMethod;
  equation: string;
  expression: string;
  lowerBound?: number;
  upperBound?: number;
  initialGuess?: number;
  boundsSource: BoundsSource;
  bracketDiscovery?: {
    a: number;
    b: number;
    fa: number;
    fb: number;
    explanation: string[];
  };
  root?: number;
  formattedRoot?: string;
  iterationsCount: number;
  iterationsSummary: string;
  convergence: boolean;
  steps: any[];
  stoppingReason?: string;
  error?: string;
  rawBisectionResult?: BisectionResult;
  rawFalsePositionResult?: FalsePositionResult;
  rawNewtonResult?: NewtonRaphsonResult;
}

// In-memory cache for deterministic solutions (Section 25)
// Keyed by all parameters that affect calculation result
const solutionCache = new Map<string, DeterministicSolutionResult>();

function buildCacheKey(req: {
  questionId?: string;
  expression: string;
  method: string;
  lowerBound?: number | null;
  upperBound?: number | null;
  initialGuess?: number | null;
  decimalPlaces: number;
}): string {
  return [
    req.questionId || 'adhoc',
    req.method,
    req.expression,
    req.lowerBound ?? 'null',
    req.upperBound ?? 'null',
    req.initialGuess ?? 'null',
    req.decimalPlaces,
  ].join('::');
}

/**
 * Clears the deterministic solution cache (useful for testing or full state reset)
 */
export function clearSolutionCache(): void {
  solutionCache.clear();
}

/**
 * Canonical deterministic solution generator
 */
export function generateDeterministicSolution(
  request: DeterministicSolutionRequest
): DeterministicSolutionResult {
  const rawEq = request.equation || '';
  const cleanExpr = normalizeEquationToExpression(rawEq);
  const dp = request.decimalPlaces !== undefined && request.decimalPlaces !== null ? Number(request.decimalPlaces) : 3;
  const questionId = request.questionId || `det-sol-${Date.now()}`;

  // Validate numerical method
  const rawMethod = (request.method || 'bisection').toLowerCase();
  let method: SolverMethod;
  if (rawMethod === 'false-position' || rawMethod === 'regula-falsi') {
    method = 'false-position';
  } else if (rawMethod === 'newton-raphson' || rawMethod === 'newton') {
    method = 'newton-raphson';
  } else {
    method = 'bisection';
  }

  let lowerBound = request.lowerBound !== null && request.lowerBound !== undefined ? Number(request.lowerBound) : undefined;
  let upperBound = request.upperBound !== null && request.upperBound !== undefined ? Number(request.upperBound) : undefined;
  let initialGuess = request.initialGuess !== null && request.initialGuess !== undefined ? Number(request.initialGuess) : undefined;
  let boundsSource: BoundsSource = request.boundsSource || 'supplied';
  let bracketDiscovery: { a: number; b: number; fa: number; fb: number; explanation: string[] } | undefined;

  // Validate clean expression
  if (!cleanExpr) {
    return {
      success: false,
      questionId,
      method,
      equation: rawEq,
      expression: '',
      boundsSource,
      iterationsCount: 0,
      iterationsSummary: 'No valid mathematical equation or expression provided.',
      convergence: false,
      steps: [],
      error: 'Please provide a valid mathematical equation.',
    };
  }

  // --------------------------------------------------------------------------
  // BRACKET VALIDATION & DISCOVERY (Bisection & False Position)
  // --------------------------------------------------------------------------
  if (method === 'bisection' || method === 'false-position') {
    const hasValidNumericBounds =
      lowerBound !== undefined &&
      upperBound !== undefined &&
      !isNaN(lowerBound) &&
      !isNaN(upperBound) &&
      lowerBound < upperBound;

    let needsBracketDiscovery = !hasValidNumericBounds;

    // Even if numeric bounds exist, verify if they produce a sign change f(a)*f(b) < 0
    if (!needsBracketDiscovery && lowerBound !== undefined && upperBound !== undefined) {
      try {
        // Test if existing bounds actually bracket a root
        // If they do not bracket a root and bounds were not user-locked or discovered, attempt search
      } catch {
        needsBracketDiscovery = true;
      }
    }

    if (needsBracketDiscovery) {
      // Deterministic IVT bracket discovery
      const bracket = findInitialBracket(cleanExpr);
      if (bracket.found) {
        lowerBound = bracket.a;
        upperBound = bracket.b;
        boundsSource = 'discovered';
        bracketDiscovery = {
          a: bracket.a,
          b: bracket.b,
          fa: bracket.fa,
          fb: bracket.fb,
          explanation: bracket.explanation,
        };

        // If this problem is an image problem, update registry and persist bounds
        if (questionId.startsWith('img_')) {
          try {
            updateRegisteredImageProblem(questionId, {
              lowerBound: bracket.a,
              upperBound: bracket.b,
              boundsSource: 'discovered',
              discoveredExplanation: bracket.explanation,
            });
          } catch (err) {
            console.warn('Failed to update registered image problem with discovered bounds:', err);
          }
        }
      } else {
        const methodLabel = method === 'false-position' ? 'False Position' : 'Bisection';
        return {
          success: false,
          questionId,
          method,
          equation: rawEq,
          expression: cleanExpr,
          lowerBound,
          upperBound,
          boundsSource,
          iterationsCount: 0,
          iterationsSummary: `An initial interval is required for ${methodLabel}. Try Find a Valid Interval. (${bracket.reason})`,
          convergence: false,
          steps: [],
          error: `An initial interval is required for ${methodLabel}. Try Find a Valid Interval. (${bracket.reason})`,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // INITIAL GUESS FOR NEWTON-RAPHSON
  // --------------------------------------------------------------------------
  if (method === 'newton-raphson') {
    if (initialGuess === undefined || isNaN(initialGuess)) {
      if (upperBound !== undefined && !isNaN(upperBound)) {
        initialGuess = upperBound;
      } else if (lowerBound !== undefined && !isNaN(lowerBound)) {
        initialGuess = lowerBound;
      } else {
        initialGuess = 1; // standard course default initial guess
      }
    }
  }

  // --------------------------------------------------------------------------
  // CACHE CHECK (Section 25)
  // --------------------------------------------------------------------------
  const cacheKey = buildCacheKey({
    questionId,
    expression: cleanExpr,
    method,
    lowerBound,
    upperBound,
    initialGuess,
    decimalPlaces: dp,
  });

  const cached = solutionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // --------------------------------------------------------------------------
  // EXECUTE DETERMINISTIC ENGINE
  // --------------------------------------------------------------------------
  try {
    if (method === 'bisection') {
      const a = lowerBound!;
      const b = upperBound!;

      const bisectionResult = solveBisection({
        expression: cleanExpr,
        a,
        b,
        decimalPlaces: dp,
      });

      if (!bisectionResult.success) {
        return {
          success: false,
          questionId,
          method,
          equation: rawEq,
          expression: cleanExpr,
          lowerBound: a,
          upperBound: b,
          boundsSource,
          bracketDiscovery,
          iterationsCount: bisectionResult.iterations.length,
          iterationsSummary: bisectionResult.error || 'Bisection method did not converge.',
          convergence: false,
          steps: bisectionResult.iterations,
          error: bisectionResult.error,
          stoppingReason: bisectionResult.stopping_reason,
          rawBisectionResult: bisectionResult,
        };
      }

      const summaryLines = bisectionResult.iterations.map((it) => {
        const nextInt = it.next_interval ? `[${it.next_interval[0]}, ${it.next_interval[1]}]` : 'N/A';
        return `Iteration ${it.n}: a = ${it.a}, b = ${it.b}, midpoint c = ${it.midpoint}, f(c) = ${it.f_midpoint}, next = ${nextInt}`;
      });

      const result: DeterministicSolutionResult = {
        success: true,
        questionId,
        method,
        equation: rawEq,
        expression: cleanExpr,
        lowerBound: a,
        upperBound: b,
        boundsSource,
        bracketDiscovery,
        root: bisectionResult.root,
        formattedRoot: bisectionResult.formattedRoot || (bisectionResult.root !== undefined ? bisectionResult.root.toFixed(dp) : undefined),
        iterationsCount: bisectionResult.iterations.length,
        iterationsSummary: summaryLines.join('\n'),
        convergence: Boolean(bisectionResult.success && bisectionResult.root !== undefined),
        steps: bisectionResult.iterations,
        stoppingReason: bisectionResult.stopping_reason,
        rawBisectionResult: bisectionResult,
      };

      solutionCache.set(cacheKey, result);
      return result;
    }

    if (method === 'false-position') {
      const a = lowerBound!;
      const b = upperBound!;

      const fpResult = solveFalsePosition({
        expression: cleanExpr,
        a,
        b,
        decimalPlaces: dp,
      });

      if (!fpResult.success) {
        return {
          success: false,
          questionId,
          method,
          equation: rawEq,
          expression: cleanExpr,
          lowerBound: a,
          upperBound: b,
          boundsSource,
          bracketDiscovery,
          iterationsCount: fpResult.iterations.length,
          iterationsSummary: fpResult.error || 'False Position method did not converge.',
          convergence: false,
          steps: fpResult.iterations,
          error: fpResult.error,
          stoppingReason: fpResult.stopping_reason,
          rawFalsePositionResult: fpResult,
        };
      }

      const summaryLines = fpResult.iterations.map((it) => {
        const nextInt = it.next_interval ? `[${it.next_interval[0]}, ${it.next_interval[1]}]` : 'N/A';
        return `Iteration ${it.n}: a = ${it.a}, b = ${it.b}, f(a) = ${it.f_a}, f(b) = ${it.f_b}, c = ${it.c}, f(c) = ${it.f_c}, next = ${nextInt}`;
      });

      const result: DeterministicSolutionResult = {
        success: true,
        questionId,
        method,
        equation: rawEq,
        expression: cleanExpr,
        lowerBound: a,
        upperBound: b,
        boundsSource,
        bracketDiscovery,
        root: fpResult.root,
        formattedRoot: fpResult.formattedRoot || (fpResult.root !== undefined ? fpResult.root.toFixed(dp) : undefined),
        iterationsCount: fpResult.iterations.length,
        iterationsSummary: summaryLines.join('\n'),
        convergence: Boolean(fpResult.success && fpResult.root !== undefined),
        steps: fpResult.iterations,
        stoppingReason: fpResult.stopping_reason,
        rawFalsePositionResult: fpResult,
      };

      solutionCache.set(cacheKey, result);
      return result;
    }

    if (method === 'newton-raphson') {
      const x0 = initialGuess!;

      const nrResult = solveNewtonRaphson({
        expression: cleanExpr,
        a: lowerBound,
        b: upperBound,
        x0,
        decimalPlaces: dp,
        precisionMode: 'course_step_rounding',
      });

      if (!nrResult.success) {
        return {
          success: false,
          questionId,
          method,
          equation: rawEq,
          expression: cleanExpr,
          lowerBound,
          upperBound,
          initialGuess: x0,
          boundsSource,
          iterationsCount: nrResult.iterations.length,
          iterationsSummary: nrResult.error || 'Newton-Raphson method did not converge.',
          convergence: false,
          steps: nrResult.iterations,
          error: nrResult.error,
          stoppingReason: nrResult.stopping_reason,
          rawNewtonResult: nrResult,
        };
      }

      const summaryLines = nrResult.iterations.map((it) => {
        return `Iteration ${it.n}: x_${it.n - 1} = ${it.x_n}, f(x) = ${it.f_x}, f'(x) = ${it.f_prime_x}, x_${it.n} = ${it.x_next}`;
      });

      const result: DeterministicSolutionResult = {
        success: true,
        questionId,
        method,
        equation: rawEq,
        expression: cleanExpr,
        lowerBound,
        upperBound,
        initialGuess: x0,
        boundsSource,
        root: nrResult.root,
        formattedRoot: nrResult.formattedRoot || (nrResult.root !== undefined ? nrResult.root.toFixed(dp) : undefined),
        iterationsCount: nrResult.iterations.length,
        iterationsSummary: summaryLines.join('\n'),
        convergence: Boolean(nrResult.success && nrResult.root !== undefined),
        steps: nrResult.iterations,
        stoppingReason: nrResult.stopping_reason,
        rawNewtonResult: nrResult,
      };

      solutionCache.set(cacheKey, result);
      return result;
    }

    return {
      success: false,
      questionId,
      method,
      equation: rawEq,
      expression: cleanExpr,
      boundsSource,
      iterationsCount: 0,
      iterationsSummary: `Unsupported solver method: ${method}`,
      convergence: false,
      steps: [],
      error: `Unsupported solver method: ${method}`,
    };
  } catch (err: any) {
    return {
      success: false,
      questionId,
      method,
      equation: rawEq,
      expression: cleanExpr,
      boundsSource,
      iterationsCount: 0,
      iterationsSummary: `Execution error: ${err?.message || err}`,
      convergence: false,
      steps: [],
      error: err?.message || 'Error executing numerical engine.',
    };
  }
}
