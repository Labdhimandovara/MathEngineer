/**
 * Dynamic Solution Explanation Generator for Newton-Raphson Method
 * 
 * Takes the canonical NewtonRaphsonResult from newtonRaphsonSolver.ts and produces
 * a structured, educational step-by-step walkthrough.
 * 
 * Sourced strictly from Dr. Ram Kishun Lodhi's course presentation (SIT Pune).
 * ZERO LLM generation, completely deterministic.
 */

import { NewtonRaphsonResult, NewtonRaphsonIteration } from '../math/newtonRaphson/types.ts';

export interface NewtonRaphsonIterationStepExplanation {
  iterationNumber: number; // 1-indexed (1, 2, 3, ...)
  n: number; // 0-indexed (0, 1, 2, ...)
  x_n: number;
  f_x: number;
  f_prime_x: number;
  x_next: number;
  isStoppingMet: boolean;

  // Sub-step 1: Current approximation
  currentPointTitle: string;
  currentPointExplanation: string;

  // Sub-step 2: Evaluate f(x_n)
  functionFormula: string;
  functionResult: string;

  // Sub-step 3: Evaluate derivative f'(x_n)
  derivativeFormula: string;
  derivativeResult: string;

  // Sub-step 4: Apply formula x_(n+1)
  formulaDisplay: string;
  substitutionDisplay: string;
  approximationResult: string;

  // Sub-step 5: Convergence status
  convergenceExplanation: string;
}

export interface NewtonRaphsonExplainedSolutionData {
  problem: {
    expression: string;
    derivativeExpression: string;
    initialA?: number;
    initialB?: number;
    selectedX0: number;
    decimalPlaces: number;
  };
  overview: {
    methodName: string;
    summary: string;
    corePrinciple: string;
    tangentDerivation: string;
  };
  iterations: NewtonRaphsonIterationStepExplanation[];
  finalSummary: {
    root: number;
    formattedRoot: string;
    iterationsUsed: number;
    accuracyDecimalPlaces: number;
    stoppingReason: string;
    whyThisIsTheAnswer: string;
  };
}

export function generateNewtonRaphsonExplainedSolution(
  result: NewtonRaphsonResult,
  expression: string,
  decimalPlaces: number
): NewtonRaphsonExplainedSolutionData | null {
  if (!result.success) {
    return null;
  }

  const cleanedExpr = expression.replace(/=\s*0$/, '').trim();
  const derivExpr = result.derivativeExpression || "f'(x)";
  const x0 = result.selected_x0;
  const initialA = result.initialInterval?.[0];
  const initialB = result.initialInterval?.[1];

  const iterationExplanations: NewtonRaphsonIterationStepExplanation[] = result.iterations.map(
    (iter: NewtonRaphsonIteration) => {
      const iterNum = iter.n + 1;
      const xnStr = iter.x_n.toFixed(4);
      const fxStr = iter.f_x.toFixed(4);
      const fpxStr = iter.f_prime_x.toFixed(4);
      const nextStr = iter.formatted_x_next || iter.x_next.toFixed(decimalPlaces);

      const isAgreeing = iter.is_stopping_met;

      return {
        iterationNumber: iterNum,
        n: iter.n,
        x_n: iter.x_n,
        f_x: iter.f_x,
        f_prime_x: iter.f_prime_x,
        x_next: iter.x_next,
        isStoppingMet: iter.is_stopping_met,

        // Step 1: Current point
        currentPointTitle: `Current Estimate x_${iter.n} = ${xnStr}`,
        currentPointExplanation: `We examine the tangent line to the curve y = f(x) at the point (x_${iter.n} = ${xnStr}, f(x_${iter.n}) = ${fxStr}).`,

        // Step 2: Function value
        functionFormula: `f(x_${iter.n}) = f(${xnStr})`,
        functionResult: fxStr,

        // Step 3: Derivative value
        derivativeFormula: `f'(x_${iter.n}) = f'(${xnStr})`,
        derivativeResult: fpxStr,

        // Step 4: Formula
        formulaDisplay: `x_${iterNum} = x_${iter.n} - [f(x_${iter.n}) / f'(x_${iter.n})]`,
        substitutionDisplay: `x_${iterNum} = ${xnStr} - (${fxStr}) / (${fpxStr})`,
        approximationResult: nextStr,

        // Step 5: Convergence
        convergenceExplanation: isAgreeing
          ? `Consecutive approximations agree to ${decimalPlaces} decimal places (${iter.formatted_x_next}). Stopping condition is satisfied!`
          : `Consecutive approximations differ (x_${iter.n} = ${iter.x_n.toFixed(decimalPlaces)} vs x_${iterNum} = ${iter.x_next.toFixed(decimalPlaces)}). Continuing to the next iteration.`,
      };
    }
  );

  const finalFormatted = result.formattedRoot ?? (result.root?.toFixed(decimalPlaces) || '');
  const finalRootVal = result.root ?? 0;

  const whyAnswer =
    result.stopping_reason ||
    `Consecutive Newton-Raphson approximations agree to ${decimalPlaces} decimal places (${finalFormatted}). We accept ${finalFormatted} as the real root.`;

  return {
    problem: {
      expression: cleanedExpr,
      derivativeExpression: derivExpr,
      initialA,
      initialB,
      selectedX0: x0,
      decimalPlaces,
    },
    overview: {
      methodName: 'Newton-Raphson Method (Tangent Method)',
      summary: `Find the real root of f(x) = ${cleanedExpr} starting from initial guess x₀ = ${x0} correct to ${decimalPlaces} decimal places.`,
      corePrinciple:
        'We draw a tangent line to the curve y = f(x) at the current approximation (x_n, f(x_n)). The point where this tangent line intersects the x-axis gives the next approximation x_(n+1).',
      tangentDerivation:
        'Tangent equation: y - f(x_n) = f\'(x_n) · (x - x_n). Setting y = 0 yields the Newton-Raphson formula: x_(n+1) = x_n - f(x_n) / f\'(x_n).',
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
