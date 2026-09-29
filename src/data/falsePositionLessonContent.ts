/**
 * Course-Grounded False Position (Regula Falsi) Lesson Content
 * 
 * Source Material:
 * Dr. Ram Kishun Lodhi, Symbiosis Institute of Technology Pune
 * Unit: Numerical solution of algebraic and transcendental equations
 * Method: False Position Method
 * 
 * All mathematical content is grounded in the provided course material.
 * Practical advice and common mistakes are clearly designated as MathEngineer Learning Guidance.
 * Worked example calculations are dynamically derived from falsePositionSolver.ts.
 */

import { solveFalsePosition } from '../math/falsePosition/falsePositionSolver.ts';
import { FalsePositionResult } from '../math/falsePosition/types.ts';

export interface FalsePositionLessonSectionA {
  id: 'section-a';
  title: string;
  context: string;
  rootDefinition: {
    statement: string;
    notation: string;
    explanation: string;
  };
  equationTypes: {
    algebraic: {
      name: string;
      description: string;
      examples: string[];
    };
    transcendental: {
      name: string;
      description: string;
      examples: string[];
    };
  };
}

export interface FalsePositionLessonSectionB {
  id: 'section-b';
  title: string;
  concept: string;
  geometricIdea: string;
  chordPrinciple: string;
}

export interface FalsePositionLessonSectionC {
  id: 'section-c';
  title: string;
  continuityCondition: string;
  oppositeSignCondition: string;
  signNotation: string;
  consequence: string;
}

export interface FalsePositionProcedureStep {
  stepNumber: number;
  label: string;
  instruction: string;
  mathFormula?: string;
}

export interface FalsePositionLessonSectionD {
  id: 'section-d';
  title: string;
  chordDerivation: string;
  formula: string;
  steps: FalsePositionProcedureStep[];
}

export interface FalsePositionLessonSectionE {
  id: 'section-e';
  title: string;
  summary: string;
  phases: {
    phase: string;
    action: string;
    purpose: string;
  }[];
}

export interface FalsePositionTableColumnDescription {
  header: string;
  description: string;
  roleInProcedure: string;
}

export interface FalsePositionLessonSectionF {
  id: 'section-f';
  title: string;
  description: string;
  columns: FalsePositionTableColumnDescription[];
  tracingGuide: string;
}

export interface FalsePositionLessonSectionG {
  id: 'section-g';
  title: string;
  equation: string;
  interval: [number, number];
  requiredAccuracy: string;
  initialCheck: {
    f_a_calc: string;
    f_b_calc: string;
    conclusion: string;
  };
  solverResult: FalsePositionResult;
  approximateRoot: string;
}

export interface FalsePositionLessonSectionH {
  id: 'section-h';
  title: string;
  stoppingRule: string;
  demonstratedExplanation: string;
  methodSpecificClarification: string;
}

export interface FalsePositionMistakeCheckItem {
  id: string;
  mistake: string;
  correction: string;
}

export interface FalsePositionLessonSectionI {
  id: 'section-i';
  title: string;
  category: 'MathEngineer Learning Guidance';
  description: string;
  items: FalsePositionMistakeCheckItem[];
}

export interface FalsePositionLessonSectionJ {
  id: 'section-j';
  title: string;
  description: string;
  tryMyselfCTA: {
    label: string;
    target: 'solve';
    action: 'myself';
    description: string;
  };
  practiceCTA: {
    label: string;
    target: 'practice';
    description: string;
  };
}

export interface FalsePositionLessonData {
  courseTitle: string;
  unitTitle: string;
  methodTitle: string;
  sectionA: FalsePositionLessonSectionA;
  sectionB: FalsePositionLessonSectionB;
  sectionC: FalsePositionLessonSectionC;
  sectionD: FalsePositionLessonSectionD;
  sectionE: FalsePositionLessonSectionE;
  sectionF: FalsePositionLessonSectionF;
  sectionG: FalsePositionLessonSectionG;
  sectionH: FalsePositionLessonSectionH;
  sectionI: FalsePositionLessonSectionI;
  sectionJ: FalsePositionLessonSectionJ;
}

/**
 * Returns the centralized, authoritative False Position lesson data model.
 * Worked example uses the deterministic False Position solver as the single source of truth.
 */
export function getFalsePositionLessonContent(): FalsePositionLessonData {
  // Compute course example dynamically from deterministic solver: cos(x) - x*exp(x) on [0, 1] to 4 decimal places
  const courseSolverResult = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  return {
    courseTitle: 'Numerical Techniques',
    unitTitle: 'Numerical solution of algebraic and transcendental equations',
    methodTitle: 'False Position Method (Regula Falsi)',

    // Section A: What are we trying to find?
    sectionA: {
      id: 'section-a',
      title: 'What are we trying to find?',
      context:
        'This course unit covers numerical root-finding methods for algebraic and transcendental equations where exact analytical factoring is impracticable.',
      rootDefinition: {
        statement: 'A number α is called a root of an equation f(x) = 0 if f(α) = 0.',
        notation: 'f(α) = 0',
        explanation:
          'Solving the equation means determining the value of x at which the curve y = f(x) crosses the x-axis.',
      },
      equationTypes: {
        algebraic: {
          name: 'Algebraic Equations',
          description:
            'Equations composed of polynomial terms with integer or rational powers of x.',
          examples: ['x^3 - 4x - 9 = 0', 'x^3 + x - 1 = 0'],
        },
        transcendental: {
          name: 'Transcendental Equations',
          description:
            'Equations involving transcendental functions such as trigonometric, exponential, or logarithmic terms.',
          examples: ['cos(x) - x * e^x = 0', 'x * log10(x) - 1.2 = 0'],
        },
      },
    },

    // Section B: The False Position idea
    sectionB: {
      id: 'section-b',
      title: 'The False Position idea',
      concept:
        'The False Position Method (or Regula Falsi) is a bracketing method that replaces the curve of f(x) over [a, b] by a straight chord line.',
      geometricIdea:
        'Instead of blindly taking the geometric midpoint (a + b)/2 as in Bisection, False Position joins the two boundary points (a, f(a)) and (b, f(b)) with a secant chord line and takes its x-intercept as the next approximation.',
      chordPrinciple:
        'Because the chord slants toward whichever endpoint has |f(x)| closer to zero, the approximation is pulled closer to the true root much faster than simple bisection.',
    },

    // Section C: Initial interval condition
    sectionC: {
      id: 'section-c',
      title: 'When can we use the initial interval?',
      continuityCondition:
        'The function f(x) must be continuous on the closed interval [a, b].',
      oppositeSignCondition:
        'The function values at the endpoints f(a) and f(b) must have opposite signs.',
      signNotation: 'f(a) · f(b) < 0',
      consequence:
        'Under continuity and opposite signs (f(a) · f(b) < 0), at least one real root of f(x) = 0 is guaranteed to lie within (a, b).',
    },

    // Section D: The False Position formula
    sectionD: {
      id: 'section-d',
      title: 'The False Position formula',
      chordDerivation:
        'The straight line passing through (a, f(a)) and (b, f(b)) is given by: y - f(a) = [(f(b) - f(a)) / (b - a)] · (x - a). Setting y = 0 to find the x-intercept yields:',
      formula: 'x = [a · f(b) - b · f(a)] / [f(b) - f(a)]',
      steps: [
        {
          stepNumber: 1,
          label: 'Verify the bracket',
          instruction: 'Calculate f(a) and f(b) and verify that f(a) · f(b) < 0.',
          mathFormula: 'f(a) · f(b) < 0',
        },
        {
          stepNumber: 2,
          label: 'Calculate False Position approximation',
          instruction: 'Substitute a, b, f(a), and f(b) into the chord formula.',
          mathFormula: 'x_(n+1) = [a_n · f(b_n) - b_n · f(a_n)] / [f(b_n) - f(a_n)]',
        },
        {
          stepNumber: 3,
          label: 'Calculate f(x_(n+1))',
          instruction: 'Evaluate the function expression at the new approximation x_(n+1).',
        },
        {
          stepNumber: 4,
          label: 'Apply the interval replacement rule',
          instruction:
            'If f(x_(n+1)) has the same sign as f(a_n), replace a_n with x_(n+1). If it has the same sign as f(b_n), replace b_n with x_(n+1).',
        },
        {
          stepNumber: 5,
          label: 'Repeat until convergence',
          instruction:
            'Repeat iterations until successive approximations agree to the requested number of decimal places.',
        },
      ],
    },

    // Section E: Understand one iteration
    sectionE: {
      id: 'section-e',
      title: 'Understand one iteration',
      summary:
        'Every False Position iteration systematically connects endpoints with a chord, evaluates the intercept, and retains opposite signs.',
      phases: [
        {
          phase: '1. Active Bracket',
          action: 'Start with [a_n, b_n] where f(a_n) and f(b_n) have opposite signs.',
          purpose: 'Guarantees the zero-crossing is contained within the search interval.',
        },
        {
          phase: '2. Secant Intercept',
          action: 'Compute x_(n+1) = [a_n · f(b_n) - b_n · f(a_n)] / [f(b_n) - f(a_n)].',
          purpose: 'Finds where the straight chord line between (a_n, f(a_n)) and (b_n, f(b_n)) hits the x-axis.',
        },
        {
          phase: '3. Evaluate Sign',
          action: 'Calculate f(x_(n+1)) and observe if it is positive or negative.',
          purpose: 'Identifies which endpoint shares the same sign as the approximation.',
        },
        {
          phase: '4. Replace Endpoint',
          action: 'Replace the endpoint having the SAME sign as f(x_(n+1)).',
          purpose: 'Maintains the opposite-sign condition in the new interval [a_(n+1), b_(n+1)].',
        },
      ],
    },

    // Section F: Understand the iteration table
    sectionF: {
      id: 'section-f',
      title: 'Understand the iteration table',
      description:
        'Calculations in the course presentation are structured in a comprehensive tabular format tracking each chord step.',
      columns: [
        {
          header: 'n',
          description: 'Iteration index (0, 1, 2, ...)',
          roleInProcedure: 'Tracks how many chord steps have been completed.',
        },
        {
          header: 'a_n, b_n',
          description: 'Current interval boundaries',
          roleInProcedure: 'The two points bracketing the root.',
        },
        {
          header: 'f(a_n), f(b_n)',
          description: 'Function values at endpoints',
          roleInProcedure: 'Weights the chord formula slope.',
        },
        {
          header: 'x_(n+1)',
          description: 'False Position approximation: [a·f(b) - b·f(a)] / [f(b) - f(a)]',
          roleInProcedure: 'The new root approximation.',
        },
        {
          header: 'f(x_(n+1))',
          description: 'Function evaluated at the approximation',
          roleInProcedure: 'Sign dictates whether a_n or b_n is replaced for row n+1.',
        },
      ],
      tracingGuide:
        'To trace the table: substitute a_n, b_n, f(a_n), f(b_n) into the secant formula to get x_(n+1). Then evaluate f(x_(n+1)). Its sign tells you which endpoint to update for the next iteration.',
    },

    // Section G: Worked example (Dynamic from deterministic solver)
    sectionG: {
      id: 'section-g',
      title: 'Worked example: cos(x) - x e^x = 0',
      equation: 'cos(x) - x*exp(x) = 0',
      interval: [0, 1],
      requiredAccuracy: '4 decimal places',
      initialCheck: {
        f_a_calc: 'f(0) = cos(0) - 0 · e^0 = 1 - 0 = 1 > 0',
        f_b_calc: 'f(1) = cos(1) - 1 · e^1 = 0.5403 - 2.7183 = -2.1779 < 0',
        conclusion:
          'Since f(0) > 0 and f(1) < 0 have opposite signs (f(0) · f(1) < 0), a real root lies in [0, 1].',
      },
      solverResult: courseSolverResult,
      approximateRoot: courseSolverResult.formattedRoot || '0.5177',
    },

    // Section H: When do we stop?
    sectionH: {
      id: 'section-h',
      title: 'When do we stop?',
      stoppingRule:
        'In the False Position procedure presented in the course material, iterations stop when successive root approximations x_n and x_(n+1) agree to the requested number of decimal places.',
      demonstratedExplanation:
        'In the course example with accuracy to 4 decimal places, successive approximations stabilize at approximately 0.5177. Thus, 0.5177 is accepted as the root correct to 4 decimal places.',
      methodSpecificClarification:
        'In False Position, one interval endpoint often remains fixed while the other approaches the root. Monitoring agreement between consecutive x values provides the course-specified convergence criterion.',
    },

    // Section I: Common mistakes / things to check (MathEngineer Learning Guidance)
    sectionI: {
      id: 'section-i',
      title: 'Common mistakes & things to check',
      category: 'MathEngineer Learning Guidance',
      description:
        'These checks are based on common student calculation mistakes detected in MathEngineer interactive solving.',
      items: [
        {
          id: 'bisection-confusion',
          mistake: 'Using (a + b)/2 instead of the False Position chord formula',
          correction:
            'Do not calculate the simple midpoint. Use x = [a·f(b) - b·f(a)] / [f(b) - f(a)].',
        },
        {
          id: 'omitted-denominator',
          mistake: 'Evaluating only the numerator [a·f(b) - b·f(a)] without dividing by [f(b) - f(a)]',
          correction:
            'Always divide the numerator by the difference of function values [f(b) - f(a)].',
        },
        {
          id: 'sign-in-numerator',
          mistake: 'Adding instead of subtracting in the numerator: [a·f(b) + b·f(a)]',
          correction:
            'The numerator is a difference: a·f(b) MINUS b·f(a). Watch negative signs carefully when f(a) < 0.',
        },
        {
          id: 'wrong-endpoint-replacement',
          mistake: 'Replacing the endpoint with the OPPOSITE sign',
          correction:
            'Course rule: If f(x) has the same sign as f(a), replace a. If f(x) has the same sign as f(b), replace b.',
        },
        {
          id: 'confusing-x-with-fx',
          mistake: 'Looking at whether x is positive or negative rather than f(x)',
          correction:
            'Interval selection depends on the sign of the function value f(x), not x itself.',
        },
      ],
    },

    // Section J: Try False Position yourself
    sectionJ: {
      id: 'section-j',
      title: 'Try False Position yourself',
      description:
        'Put the chord method into practice. You can calculate step by step with the interactive solver, or inspect the complete explained solution.',
      tryMyselfCTA: {
        label: 'Try False Position yourself',
        target: 'solve',
        action: 'myself',
        description:
          'Step through the False Position Method with interactive verification and progressive hints.',
      },
      practiceCTA: {
        label: 'Practice False Position',
        target: 'practice',
        description:
          'Explore university-focused practice problems and test your calculation speed.',
      },
    },
  };
}
