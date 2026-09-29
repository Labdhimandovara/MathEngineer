/**
 * Course-Grounded Bisection Lesson Content
 * 
 * Source Material:
 * Dr. Ram Kishun Lodhi, Symbiosis Institute of Technology Pune
 * Unit: Numerical solution of algebraic and transcendental equations
 * Method: Bisection Method
 * 
 * All mathematical content is grounded in the provided course material.
 * Practical advice and common mistakes are clearly designated as MathEngineer Learning Guidance.
 * Worked example calculations are dynamically derived from bisectionSolver.ts.
 */

import { solveBisection } from '../math/bisection/bisectionSolver.ts';
import { BisectionResult } from '../math/bisection/types.ts';

export interface LessonSectionA {
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

export interface LessonSectionB {
  id: 'section-b';
  title: string;
  concept: string;
  halvingExplanation: string;
  trappingPrinciple: string;
}

export interface LessonSectionC {
  id: 'section-c';
  title: string;
  continuityCondition: string;
  oppositeSignCondition: string;
  signNotation: string;
  consequence: string;
}

export interface ProcedureStep {
  stepNumber: number;
  label: string;
  instruction: string;
  mathFormula?: string;
}

export interface LessonSectionD {
  id: 'section-d';
  title: string;
  steps: ProcedureStep[];
}

export interface LessonSectionE {
  id: 'section-e';
  title: string;
  summary: string;
  phases: {
    phase: string;
    action: string;
    purpose: string;
  }[];
}

export interface TableColumnDescription {
  header: string;
  description: string;
  roleInProcedure: string;
}

export interface LessonSectionF {
  id: 'section-f';
  title: string;
  description: string;
  columns: TableColumnDescription[];
  tracingGuide: string;
}

export interface LessonSectionG {
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
  solverResult: BisectionResult;
  approximateRoot: string;
}

export interface LessonSectionH {
  id: 'section-h';
  title: string;
  stoppingRule: string;
  demonstratedExplanation: string;
  methodSpecificClarification: string;
}

export interface MistakeCheckItem {
  id: string;
  mistake: string;
  correction: string;
}

export interface LessonSectionI {
  id: 'section-i';
  title: string;
  category: 'MathEngineer Learning Guidance';
  description: string;
  items: MistakeCheckItem[];
}

export interface LessonSectionJ {
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

export interface BisectionLessonData {
  courseTitle: string;
  unitTitle: string;
  methodTitle: string;
  sectionA: LessonSectionA;
  sectionB: LessonSectionB;
  sectionC: LessonSectionC;
  sectionD: LessonSectionD;
  sectionE: LessonSectionE;
  sectionF: LessonSectionF;
  sectionG: LessonSectionG;
  sectionH: LessonSectionH;
  sectionI: LessonSectionI;
  sectionJ: LessonSectionJ;
}

/**
 * Returns the centralized, authoritative Bisection lesson data model.
 * Worked example uses the deterministic Bisection solver as the single source of truth.
 */
export function getBisectionLessonContent(): BisectionLessonData {
  // Compute course example dynamically from deterministic solver
  const courseSolverResult = solveBisection({
    expression: 'x^3 - 9x + 1',
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });

  return {
    courseTitle: 'Numerical Techniques',
    unitTitle: 'Numerical solution of algebraic and transcendental equations',
    methodTitle: 'Bisection Method',

    // Section A: What are we trying to find?
    sectionA: {
      id: 'section-a',
      title: 'What are we trying to find?',
      context:
        'This course unit is concerned with the numerical solution of algebraic and transcendental equations.',
      rootDefinition: {
        statement: 'A number α is called a root of an equation f(x) = 0 if f(α) = 0.',
        notation: 'f(α) = 0',
        explanation:
          'Finding a root means identifying the value of x that makes the expression f(x) evaluate exactly to zero.',
      },
      equationTypes: {
        algebraic: {
          name: 'Algebraic Equations',
          description:
            'Equations where f(x) is an algebraic polynomial in powers of x with constant coefficients.',
          examples: ['x^3 - 9x + 1 = 0', 'x^3 - 4x - 9 = 0'],
        },
        transcendental: {
          name: 'Transcendental Equations',
          description:
            'Equations containing non-algebraic terms such as trigonometric, exponential, or logarithmic functions.',
          examples: ['cos(x) - x * e^x = 0', 'x * log10(x) - 1.2 = 0'],
        },
      },
    },

    // Section B: The Bisection idea
    sectionB: {
      id: 'section-b',
      title: 'The Bisection idea',
      concept:
        'The Bisection Method is an iterative bracketing technique that repeatedly halves an interval containing the root.',
      halvingExplanation:
        'If a root is known to lie between two values a and b, the method calculates the midpoint and determines which half still contains the root.',
      trappingPrinciple:
        'The half containing the root is retained, while the other half is discarded. By repeating this process, the interval trapping the root is halved with every iteration.',
    },

    // Section C: When can we use the initial interval?
    sectionC: {
      id: 'section-c',
      title: 'When can we use the initial interval?',
      continuityCondition:
        'The function f(x) must be continuous on the closed interval [a, b].',
      oppositeSignCondition:
        'The function values at the endpoints f(a) and f(b) must have opposite signs.',
      signNotation: 'f(a) · f(b) < 0',
      consequence:
        'If f(x) is continuous on [a, b] and f(a) and f(b) have opposite signs (f(a) · f(b) < 0), then at least one real root of f(x) = 0 lies between a and b.',
    },

    // Section D: The Bisection procedure
    sectionD: {
      id: 'section-d',
      title: 'The Bisection procedure',
      steps: [
        {
          stepNumber: 1,
          label: 'Choose a and b bracketing the root',
          instruction: 'Find initial endpoints a and b such that the root lies in [a, b].',
        },
        {
          stepNumber: 2,
          label: 'Calculate f(a) and f(b)',
          instruction: 'Substitute the endpoints a and b into the equation f(x).',
        },
        {
          stepNumber: 3,
          label: 'Check the sign condition',
          instruction: 'Verify that f(a) and f(b) have opposite signs: f(a) · f(b) < 0.',
          mathFormula: 'f(a) · f(b) < 0',
        },
        {
          stepNumber: 4,
          label: 'Calculate the midpoint',
          instruction: 'Compute the midpoint of the current interval [a_n, b_n].',
          mathFormula: 'x_(n+1) = (a_n + b_n) / 2',
        },
        {
          stepNumber: 5,
          label: 'Calculate f(x_(n+1))',
          instruction: 'Evaluate the function at the newly computed midpoint.',
        },
        {
          stepNumber: 6,
          label: 'Select the next interval',
          instruction:
            'If f(x_(n+1)) has the opposite sign to f(a_n), the root lies in [a_n, x_(n+1)]. Otherwise, the root lies in [x_(n+1), b_n].',
        },
        {
          stepNumber: 7,
          label: 'Repeat until satisfied',
          instruction:
            'Repeat steps 4 through 6 until the desired accuracy or stopping condition is achieved.',
        },
      ],
    },

    // Section E: Understand one iteration
    sectionE: {
      id: 'section-e',
      title: 'Understand one iteration',
      summary:
        'A single bisection iteration follows a clear four-phase sequence: bracket, bisect, evaluate, and choose.',
      phases: [
        {
          phase: '1. Current Bracket',
          action: 'Start with the active interval [a_n, b_n]',
          purpose: 'Ensures the root remains bracketed between opposite signs.',
        },
        {
          phase: '2. Bisect',
          action: 'Calculate midpoint x_(n+1) = (a_n + b_n) / 2',
          purpose: 'Splits the current search interval into two equal halves.',
        },
        {
          phase: '3. Evaluate',
          action: 'Compute f(x_(n+1)) and observe its sign (+ or -)',
          purpose: 'Determines which side of the midpoint contains the zero-crossing.',
        },
        {
          phase: '4. Choose Half',
          action: 'Replace the endpoint having the same sign as f(x_(n+1))',
          purpose:
            'Retains the sub-interval that maintains opposite signs at its endpoints.',
        },
      ],
    },

    // Section F: Understand the iteration table
    sectionF: {
      id: 'section-f',
      title: 'Understand the iteration table',
      description:
        'The course material organizes calculations in a standard tabular format where each row records one iteration.',
      columns: [
        {
          header: 'n',
          description: 'Iteration index (0, 1, 2, ...)',
          roleInProcedure: 'Tracks how many bisection steps have been completed.',
        },
        {
          header: 'a_n',
          description: 'Left endpoint of the current interval',
          roleInProcedure: 'The lower bound currently bracketing the root.',
        },
        {
          header: 'b_n',
          description: 'Right endpoint of the current interval',
          roleInProcedure: 'The upper bound currently bracketing the root.',
        },
        {
          header: 'x_(n+1)',
          description: 'Midpoint: (a_n + b_n) / 2',
          roleInProcedure: 'The new candidate approximation for the root.',
        },
        {
          header: 'f(x_(n+1))',
          description: 'Function value evaluated at the midpoint',
          roleInProcedure:
            'Its sign dictates whether a_n or b_n is replaced for the next row.',
        },
      ],
      tracingGuide:
        'To trace the table: row n computes x_(n+1) and evaluates f(x_(n+1)). The sign of f(x_(n+1)) determines which endpoint is replaced, defining the interval [a_(n+1), b_(n+1)] for row n+1.',
    },

    // Section G: Worked example (Dynamic from deterministic solver)
    sectionG: {
      id: 'section-g',
      title: 'Worked example',
      equation: 'x^3 - 9x + 1 = 0',
      interval: [2, 3],
      requiredAccuracy: '2 decimal places',
      initialCheck: {
        f_a_calc: 'f(2) = 2^3 - 9(2) + 1 = 8 - 18 + 1 = -9 < 0',
        f_b_calc: 'f(3) = 3^3 - 9(3) + 1 = 27 - 27 + 1 = 1 > 0',
        conclusion:
          'Since f(2) and f(3) have opposite signs (f(2) · f(3) < 0), a real root lies in [2, 3].',
      },
      solverResult: courseSolverResult,
      approximateRoot: courseSolverResult.formattedRoot || '2.94',
    },

    // Section H: When do we stop?
    sectionH: {
      id: 'section-h',
      title: 'When do we stop?',
      stoppingRule:
        'In the Bisection procedure demonstrated in the course material, iterations stop when a_n, b_n, and x_(n+1) agree to the required number of decimal places.',
      demonstratedExplanation:
        'In the worked example with accuracy to 2 decimal places, by iteration 7, the interval endpoints and the midpoint all agree on 2.94. Thus, 2.94 is accepted as the root correct to 2 decimal places.',
      methodSpecificClarification:
        'This decimal-place agreement rule is explained in the context of the course Bisection demonstration. It should not be assumed to be a universal stopping rule for all numerical methods.',
    },

    // Section I: Common mistakes / things to check (MathEngineer Learning Guidance)
    sectionI: {
      id: 'section-i',
      title: 'Common mistakes & things to check',
      category: 'MathEngineer Learning Guidance',
      description:
        'These checks are based on the procedural steps and interactive solving validations in MathEngineer.',
      items: [
        {
          id: 'sign-check',
          mistake: 'Forgetting to verify the initial sign change',
          correction:
            'Always compute f(a) and f(b) first and ensure f(a) · f(b) < 0 before computing any midpoints.',
        },
        {
          id: 'half-width-confusion',
          mistake: 'Calculating interval half-width (b - a)/2 instead of midpoint (a + b)/2',
          correction:
            'The midpoint coordinate is the average (a + b)/2. The quantity (b - a)/2 is only the half-width.',
        },
        {
          id: 'sum-without-halving',
          mistake: 'Adding (a + b) without dividing by 2',
          correction:
            'Always divide the sum by 2. For example, (2 + 3)/2 = 2.5, not 5.',
        },
        {
          id: 'wrong-interval-retention',
          mistake: 'Replacing the endpoint with the opposite sign',
          correction:
            'Replace the endpoint whose function value has the SAME sign as f(x_(n+1)). That way, the retained interval preserves opposite endpoint signs.',
        },
        {
          id: 'confusing-x-with-fx',
          mistake: 'Using the value of x_(n+1) instead of f(x_(n+1)) to decide the interval',
          correction:
            'The sign of f(x_(n+1)) determines which endpoint to replace, not whether x_(n+1) itself is positive or negative.',
        },
        {
          id: 'premature-stopping',
          mistake: 'Stopping before the required decimal places agree across endpoints',
          correction:
            'Continue iterations until a_n, b_n, and x_(n+1) round/agree to the requested decimal places.',
        },
      ],
    },

    // Section J: Try Bisection yourself
    sectionJ: {
      id: 'section-j',
      title: 'Try Bisection yourself',
      description:
        'Put the method into practice. You can solve problems step by step with interactive guidance, or test your speed in the question bank.',
      tryMyselfCTA: {
        label: 'Try Bisection yourself',
        target: 'solve',
        action: 'myself',
        description:
          'Step through the Bisection Method step by step with the interactive Solve With Me assistant.',
      },
      practiceCTA: {
        label: 'Practice Bisection',
        target: 'practice',
        description:
          'Explore university-focused practice problems and test your calculation accuracy.',
      },
    },
  };
}
