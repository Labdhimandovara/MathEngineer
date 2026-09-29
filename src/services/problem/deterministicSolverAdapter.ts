/**
 * Deterministic Solver Adapter for Assistant Grounding
 * 
 * Executes MathEngineer's verified deterministic numerical engines
 * (Bisection, False Position, Newton-Raphson) via the canonical
 * generateDeterministicSolution service.
 * 
 * Guarantees that MathEngineer remains the single source of numerical truth.
 * Gemini never calculates or invents iterations.
 */

import {
  generateDeterministicSolution,
  DeterministicSolutionResult,
} from './solutionService.ts';

export interface VerifiedSolverData {
  converged: boolean;
  root?: number;
  formattedRoot?: string;
  iterationsCount: number;
  iterationsSummary: string;
  stoppingReason?: string;
  bracketDiscovery?: {
    a: number;
    b: number;
    fa: number;
    fb: number;
    explanation: string[];
  };
}

export function runDeterministicSolver(params: {
  method: 'bisection' | 'false-position' | 'newton-raphson';
  equation: string;
  lowerBound?: number | null;
  upperBound?: number | null;
  initialGuess?: number | null;
  decimalPlaces: number;
  questionId?: string;
}): VerifiedSolverData {
  const result: DeterministicSolutionResult = generateDeterministicSolution({
    questionId: params.questionId,
    equation: params.equation,
    method: params.method,
    lowerBound: params.lowerBound,
    upperBound: params.upperBound,
    initialGuess: params.initialGuess,
    decimalPlaces: params.decimalPlaces,
  });

  return {
    converged: Boolean(result.convergence && result.success),
    root: result.root,
    formattedRoot: result.formattedRoot,
    iterationsCount: result.iterationsCount,
    iterationsSummary: result.iterationsSummary,
    stoppingReason: result.stoppingReason,
    bracketDiscovery: result.bracketDiscovery,
  };
}
