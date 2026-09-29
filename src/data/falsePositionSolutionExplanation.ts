/**
 * Dynamic Solution Explanation Generator for False Position (Regula Falsi) Method
 * 
 * Takes the canonical FalsePositionResult from falsePositionSolver.ts and produces
 * a structured, educational step-by-step walkthrough.
 * 
 * Sourced strictly from Dr. Ram Kishun Lodhi's course presentation (SIT Pune).
 * ZERO LLM generation, completely deterministic.
 */

import { FalsePositionResult, FalsePositionIteration } from '../math/falsePosition/types.ts';

export interface FalsePositionIterationStepExplanation {
  iterationNumber: number; // 1-indexed (1, 2, 3, ...)
  n: number; // 0-indexed (0, 1, 2, ...)
  a: number;
  b: number;
  c: number; // False position approximation
  f_a: number;
  f_b: number;
  f_c: number;
  nextInterval: [number, number];
  isStoppingMet: boolean;

  // Step 1: Current interval
  intervalTitle: string;
  intervalExplanation: string;

  // Step 2: False Position Secant Formula
  formulaName: string;
  formulaDisplay: string;
  substitutionDisplay: string;
  approximationResult: string;

  // Step 3: Evaluate function
  functionFormula: string;
  functionResult: string;
  functionSign: string;

  // Step 4: Interval replacement rule
  f_a_display: string;
  f_b_display: string;
  f_c_display: string;
  signComparisonExplanation: string;
  replacedEndpoint: string;
  retainedIntervalDisplay: string;
  decisionReasoning: string;
}

export interface FalsePositionExplainedSolutionData {
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
    chordEquationDescription: string;
  };
  iterations: FalsePositionIterationStepExplanation[];
  finalSummary: {
    root: number;
    formattedRoot: string;
    iterationsUsed: number;
    accuracyDecimalPlaces: number;
    stoppingReason: string;
    whyThisIsTheAnswer: string;
  };
}

export function generateFalsePositionExplainedSolution(
  result: FalsePositionResult,
  expression: string,
  decimalPlaces: number
): FalsePositionExplainedSolutionData | null {
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
        methodName: 'False Position Method (Regula Falsi)',
        summary: `Find the real root of f(x) = ${cleanedExpr} in the interval [${initialA}, ${initialB}] correct to ${decimalPlaces} decimal places.`,
        corePrinciple:
          'We evaluate the boundary endpoints. If an endpoint evaluates exactly to zero, it is an exact root.',
        chordEquationDescription:
          'The chord line intersects the x-axis directly at the root point.',
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

  const iterationExplanations: FalsePositionIterationStepExplanation[] = result.iterations.map(
    (iter: FalsePositionIteration) => {
      const iterNum = iter.n + 1;
      const aFormatted = iter.a.toFixed(4);
      const bFormatted = iter.b.toFixed(4);
      const cFormatted = iter.c.toFixed(4);
      const fCFormatted = iter.f_c.toFixed(4);
      const fAFormatted = iter.f_a.toFixed(4);
      const fBFormatted = iter.f_b.toFixed(4);

      // Determine which endpoint was replaced
      const isAReplaced = Math.abs(iter.next_interval[0] - iter.c) < 1e-5;
      const nextA = iter.next_interval[0].toFixed(4);
      const nextB = iter.next_interval[1].toFixed(4);

      let signComparison = '';
      let replacedEp = '';
      if (isAReplaced) {
        replacedEp = `a (replaced with x = ${cFormatted})`;
        signComparison = `f(${cFormatted}) = ${fCFormatted} has the same sign as f(a) = ${fAFormatted} (${iter.f_c < 0 ? 'both negative' : 'both positive'}). Therefore, we replace a with x.`;
      } else {
        replacedEp = `b (replaced with x = ${cFormatted})`;
        signComparison = `f(${cFormatted}) = ${fCFormatted} has the same sign as f(b) = ${fBFormatted} (${iter.f_c < 0 ? 'both negative' : 'both positive'}). Therefore, we replace b with x.`;
      }

      return {
        iterationNumber: iterNum,
        n: iter.n,
        a: iter.a,
        b: iter.b,
        c: iter.c,
        f_a: iter.f_a,
        f_b: iter.f_b,
        f_c: iter.f_c,
        nextInterval: iter.next_interval,
        isStoppingMet: iter.is_stopping_met,

        // Step 1: Interval
        intervalTitle: `Interval [a_${iter.n}, b_${iter.n}]`,
        intervalExplanation: `We examine the bracket [a_${iter.n} = ${aFormatted}, b_${iter.n} = ${bFormatted}]. The root is bracketed because f(a) and f(b) have opposite signs.`,

        // Step 2: Formula
        formulaName: 'False Position Secant-Intercept Formula',
        formulaDisplay: `x_(n+1) = [a_n · f(b_n) - b_n · f(a_n)] / [f(b_n) - f(a_n)]`,
        substitutionDisplay: `x_${iterNum} = [(${aFormatted})(${fBFormatted}) - (${bFormatted})(${fAFormatted})] / [${fBFormatted} - (${fAFormatted})]`,
        approximationResult: cFormatted,

        // Step 3: Evaluate function
        functionFormula: `f(x_${iterNum}) = f(${cFormatted})`,
        functionResult: fCFormatted,
        functionSign: iter.f_c < 0 ? 'negative (< 0)' : iter.f_c > 0 ? 'positive (> 0)' : 'zero (= 0)',

        // Step 4: Interval choice
        f_a_display: `f(a_${iter.n}) = ${fAFormatted}`,
        f_b_display: `f(b_${iter.n}) = ${fBFormatted}`,
        f_c_display: `f(x_${iterNum}) = ${fCFormatted}`,
        signComparisonExplanation: signComparison,
        replacedEndpoint: replacedEp,
        retainedIntervalDisplay: `[${nextA}, ${nextB}]`,
        decisionReasoning:
          'False Position replaces the endpoint that has the same sign as f(x), ensuring that the root remains securely bracketed between opposite signs.',
      };
    }
  );

  const finalFormatted = result.formattedRoot ?? (result.root?.toFixed(decimalPlaces) || '');
  const finalRootVal = result.root ?? 0;

  const whyAnswer =
    result.stopping_reason ||
    `Consecutive False Position approximations agree to ${decimalPlaces} decimal places (${finalFormatted}). Thus, ${finalFormatted} is accepted as the root to ${decimalPlaces} decimal places.`;

  return {
    problem: {
      expression: cleanedExpr,
      initialA,
      initialB,
      decimalPlaces,
    },
    overview: {
      methodName: 'False Position Method (Regula Falsi)',
      summary: `Find the real root of f(x) = ${cleanedExpr} in the interval [${initialA}, ${initialB}] correct to ${decimalPlaces} decimal places.`,
      corePrinciple:
        'We connect the endpoint values (a, f(a)) and (b, f(b)) with a straight line chord and find its x-intercept. We then replace the endpoint having the same sign as f(x).',
      chordEquationDescription:
        'Equation of the chord: y - f(a) = [(f(b) - f(a)) / (b - a)] · (x - a). Setting y = 0 yields x = [a·f(b) - b·f(a)] / [f(b) - f(a)].',
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
