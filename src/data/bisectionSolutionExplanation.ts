/**
 * Dynamic Solution Explanation Generator for Bisection Method
 * 
 * Takes the canonical BisectionResult from bisectionSolver.ts and produces
 * a structured, educational step-by-step walkthrough.
 * 
 * Completely deterministic and dynamic: no hardcoded problem-specific values.
 */

import { BisectionResult, BisectionIteration } from '../math/bisection/types';

export interface IterationStepExplanation {
  iterationNumber: number; // 1-indexed (1, 2, 3, ...)
  n: number; // 0-indexed (0, 1, 2, ...)
  a: number;
  b: number;
  midpoint: number;
  f_a: number;
  f_b: number;
  f_midpoint: number;
  nextInterval: [number, number];
  isStoppingMet: boolean;

  // Step 1: Current interval
  intervalTitle: string;
  intervalExplanation: string;

  // Step 2: Calculate midpoint
  midpointFormula: string;
  midpointSubstitution: string;
  midpointResult: string;

  // Step 3: Evaluate function
  functionFormula: string;
  functionResult: string;
  functionSign: string;

  // Step 4: Decide next interval
  f_a_display: string;
  f_b_display: string;
  f_midpoint_display: string;
  oppositePairExplanation: string;
  retainedIntervalDisplay: string;
  decisionReasoning: string;
}

export interface ExplainedSolutionData {
  problem: {
    expression: string;
    initialA: number;
    initialB: number;
    decimalPlaces: number;
  };
  overview: {
    methodName: string;
    summary: string;
    corePrinciple: string;
  };
  iterations: IterationStepExplanation[];
  finalSummary: {
    root: number;
    formattedRoot: string;
    iterationsUsed: number;
    accuracyDecimalPlaces: number;
    stoppingReason: string;
    whyThisIsTheAnswer: string;
  };
}

export function generateExplainedSolution(
  result: BisectionResult,
  expression: string,
  decimalPlaces: number
): ExplainedSolutionData | null {
  if (!result.success) {
    return null;
  }

  const initialA = result.initialEvaluation?.a ?? 0;
  const initialB = result.initialEvaluation?.b ?? 0;
  const cleanedExpr = expression.replace(/=\s*0$/, '').trim();

  // If exact root at boundary with 0 iterations
  if (result.iterations.length === 0) {
    const rootVal = result.root ?? initialA;
    const formatted = result.formattedRoot ?? rootVal.toFixed(decimalPlaces);
    return {
      problem: {
        expression: cleanedExpr,
        initialA,
        initialB,
        decimalPlaces,
      },
      overview: {
        methodName: 'Bisection Method',
        summary: `Find the real root of f(x) = ${cleanedExpr} in the interval [${initialA}, ${initialB}] correct to ${decimalPlaces} decimal places.`,
        corePrinciple:
          'We evaluate the boundary endpoints. If an endpoint evaluates exactly to zero, it is an exact root.',
      },
      iterations: [],
      finalSummary: {
        root: rootVal,
        formattedRoot: formatted,
        iterationsUsed: 0,
        accuracyDecimalPlaces: decimalPlaces,
        stoppingReason: result.stopping_reason || `Exact root found at boundary point.`,
        whyThisIsTheAnswer: `Evaluating the function at x = ${formatted} yields f(x) = 0 exactly.`,
      },
    };
  }

  const iterationExplanations: IterationStepExplanation[] = result.iterations.map(
    (iter: BisectionIteration) => {
      const iterNum = iter.n + 1;
      const aFormatted = iter.a.toFixed(4);
      const bFormatted = iter.b.toFixed(4);
      const mFormatted = iter.midpoint.toFixed(4);
      const fMFormatted = iter.f_midpoint.toFixed(4);
      const fAFormatted = iter.f_a.toFixed(4);
      const fBFormatted = iter.f_b.toFixed(4);

      const isRetainingLeft = Math.abs(iter.next_interval[0] - iter.a) < 1e-6;
      const nextA = iter.next_interval[0].toFixed(4);
      const nextB = iter.next_interval[1].toFixed(4);

      let oppositePair = '';
      if (isRetainingLeft) {
        oppositePair = `f(${aFormatted}) = ${fAFormatted} (${iter.f_a < 0 ? '< 0' : '> 0'}) and f(${mFormatted}) = ${fMFormatted} (${iter.f_midpoint < 0 ? '< 0' : '> 0'}) have opposite signs.`;
      } else {
        oppositePair = `f(${mFormatted}) = ${fMFormatted} (${iter.f_midpoint < 0 ? '< 0' : '> 0'}) and f(${bFormatted}) = ${fBFormatted} (${iter.f_b < 0 ? '< 0' : '> 0'}) have opposite signs.`;
      }

      return {
        iterationNumber: iterNum,
        n: iter.n,
        a: iter.a,
        b: iter.b,
        midpoint: iter.midpoint,
        f_a: iter.f_a,
        f_b: iter.f_b,
        f_midpoint: iter.f_midpoint,
        nextInterval: iter.next_interval,
        isStoppingMet: iter.is_stopping_met,

        // Step 1
        intervalTitle: `Interval [a_${iter.n}, b_${iter.n}]`,
        intervalExplanation: `We consider the current interval [a_${iter.n} = ${aFormatted}, b_${iter.n} = ${bFormatted}] where the root is currently bracketed.`,

        // Step 2
        midpointFormula: `x_${iterNum} = (a_${iter.n} + b_${iter.n}) / 2`,
        midpointSubstitution: `x_${iterNum} = (${aFormatted} + ${bFormatted}) / 2`,
        midpointResult: mFormatted,

        // Step 3
        functionFormula: `f(x_${iterNum}) = f(${mFormatted})`,
        functionResult: fMFormatted,
        functionSign: iter.f_midpoint < 0 ? 'negative (< 0)' : iter.f_midpoint > 0 ? 'positive (> 0)' : 'zero (= 0)',

        // Step 4
        f_a_display: `f(a_${iter.n}) = ${fAFormatted}`,
        f_b_display: `f(b_${iter.n}) = ${fBFormatted}`,
        f_midpoint_display: `f(x_${iterNum}) = ${fMFormatted}`,
        oppositePairExplanation: oppositePair,
        retainedIntervalDisplay: `[${nextA}, ${nextB}]`,
        decisionReasoning: `Bisection retains the half-interval that continues to bracket the root by preserving opposite endpoint signs.`,
      };
    }
  );

  const finalFormatted = result.formattedRoot ?? (result.root?.toFixed(decimalPlaces) || '');
  const finalRootVal = result.root ?? 0;

  const whyAnswer =
    result.stopping_reason ||
    `In the final iteration, a_n, b_n and x_(n+1) agree to ${decimalPlaces} decimal places (${finalFormatted}). We can take ${finalFormatted} as the root up to ${decimalPlaces} decimal places.`;

  return {
    problem: {
      expression: cleanedExpr,
      initialA,
      initialB,
      decimalPlaces,
    },
    overview: {
      methodName: 'Bisection Method',
      summary: `Find the real root of f(x) = ${cleanedExpr} in the interval [${initialA}, ${initialB}] correct to ${decimalPlaces} decimal places.`,
      corePrinciple:
        'We repeatedly divide the current interval into two halves and retain the half that continues to bracket the root.',
    },
    iterations: iterationExplanations,
    finalSummary: {
      root: finalRootVal,
      formattedRoot: finalFormatted,
      iterationsUsed: result.iterations_used,
      accuracyDecimalPlaces: decimalPlaces,
      stoppingReason: result.stopping_reason || `Stopping criteria met at ${decimalPlaces} decimal places.`,
      whyThisIsTheAnswer: whyAnswer,
    },
  };
}
