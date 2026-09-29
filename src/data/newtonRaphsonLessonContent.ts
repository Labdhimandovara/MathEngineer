/**
 * Course-Grounded Newton-Raphson Lesson Content
 * 
 * Source Material:
 * Dr. Ram Kishun Lodhi, Symbiosis Institute of Technology Pune
 * Unit: Numerical solution of algebraic and transcendental equations
 * Method: Newton-Raphson Method
 * 
 * All mathematical content is grounded in the provided course material.
 * Practical advice and common mistakes are clearly designated as MathEngineer Learning Guidance.
 * Worked example calculations are dynamically derived from newtonRaphsonSolver.ts.
 */

import { solveNewtonRaphson } from '../math/newtonRaphson/newtonRaphsonSolver.ts';
import { NewtonRaphsonResult } from '../math/newtonRaphson/types.ts';

export interface NewtonRaphsonLessonSectionA {
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

export interface NewtonRaphsonLessonSectionB {
  id: 'section-b';
  title: string;
  concept: string;
  tangentIdea: string;
  geometricPrinciple: string;
}

export interface NewtonRaphsonLessonSectionC {
  id: 'section-c';
  title: string;
  initialBracketRequirement: string;
  x0SelectionRule: string;
  mathCriterion: string;
  consequence: string;
}

export interface NewtonRaphsonProcedureStep {
  stepNumber: number;
  label: string;
  instruction: string;
  mathFormula?: string;
}

export interface NewtonRaphsonLessonSectionD {
  id: 'section-d';
  title: string;
  tangentDerivation: string;
  formula: string;
  steps: NewtonRaphsonProcedureStep[];
}

export interface NewtonRaphsonLessonSectionE {
  id: 'section-e';
  title: string;
  summary: string;
  phases: {
    phase: string;
    action: string;
    purpose: string;
  }[];
}

export interface NewtonRaphsonTableColumnDescription {
  header: string;
  description: string;
  roleInProcedure: string;
}

export interface NewtonRaphsonLessonSectionF {
  id: 'section-f';
  title: string;
  description: string;
  columns: NewtonRaphsonTableColumnDescription[];
  tracingGuide: string;
}

export interface NewtonRaphsonLessonSectionG {
  id: 'section-g';
  title: string;
  equation: string;
  derivative: string;
  interval: [number, number];
  initialX0: number;
  requiredAccuracy: string;
  initialCheck: {
    f_a_calc: string;
    f_b_calc: string;
    conclusion: string;
  };
  solverResult: NewtonRaphsonResult;
  approximateRoot: string;
}

export interface NewtonRaphsonLessonSectionH {
  id: 'section-h';
  title: string;
  stoppingRule: string;
  demonstratedExplanation: string;
  methodSpecificClarification: string;
}

export interface NewtonRaphsonMistakeCheckItem {
  id: string;
  mistake: string;
  correction: string;
}

export interface NewtonRaphsonLessonSectionI {
  id: 'section-i';
  title: string;
  category: 'MathEngineer Learning Guidance';
  description: string;
  items: NewtonRaphsonMistakeCheckItem[];
}

export interface NewtonRaphsonLessonSectionJ {
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

export interface NewtonRaphsonLessonData {
  courseTitle: string;
  unitTitle: string;
  methodTitle: string;
  sectionA: NewtonRaphsonLessonSectionA;
  sectionB: NewtonRaphsonLessonSectionB;
  sectionC: NewtonRaphsonLessonSectionC;
  sectionD: NewtonRaphsonLessonSectionD;
  sectionE: NewtonRaphsonLessonSectionE;
  sectionF: NewtonRaphsonLessonSectionF;
  sectionG: NewtonRaphsonLessonSectionG;
  sectionH: NewtonRaphsonLessonSectionH;
  sectionI: NewtonRaphsonLessonSectionI;
  sectionJ: NewtonRaphsonLessonSectionJ;
}

/**
 * Returns the centralized, authoritative Newton-Raphson lesson data model.
 * Worked example uses the deterministic Newton-Raphson solver as the single source of truth.
 */
export function getNewtonRaphsonLessonContent(): NewtonRaphsonLessonData {
  // Compute course example dynamically: x^4 - x - 10 = 0, [1, 2], x0 = 2, 3 decimal places
  const courseSolverResult = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  return {
    courseTitle: 'Numerical Techniques',
    unitTitle: 'Numerical solution of algebraic and transcendental equations',
    methodTitle: 'Newton-Raphson Method (Tangent Method)',

    // Section A: What are we trying to find?
    sectionA: {
      id: 'section-a',
      title: 'What are we trying to find?',
      context:
        'This course unit covers numerical techniques to find real roots of algebraic and transcendental equations when analytical formulas are inaccessible.',
      rootDefinition: {
        statement: 'A number α is called a root of an equation f(x) = 0 if f(α) = 0.',
        notation: 'f(α) = 0',
        explanation:
          'Solving the equation means finding the coordinate where the function graph crosses the horizontal x-axis.',
      },
      equationTypes: {
        algebraic: {
          name: 'Algebraic Equations',
          description:
            'Equations where f(x) is a polynomial with constant coefficients.',
          examples: ['x^4 - x - 10 = 0', 'x^3 - 2x - 5 = 0'],
        },
        transcendental: {
          name: 'Transcendental Equations',
          description:
            'Equations involving trigonometric, exponential, or logarithmic functions.',
          examples: ['3x - cos(x) - 1 = 0', 'x * exp(x) - 1 = 0'],
        },
      },
    },

    // Section B: The Newton-Raphson idea
    sectionB: {
      id: 'section-b',
      title: 'The Newton-Raphson idea',
      concept:
        'The Newton-Raphson Method is an open iterative root-finding technique based on drawing tangent lines to the curve y = f(x).',
      tangentIdea:
        'Starting from an approximation x_n, we evaluate the slope f\'(x_n) and draw the tangent line to the curve at (x_n, f(x_n)). The point where this tangent line intersects the x-axis becomes our next approximation x_(n+1).',
      geometricPrinciple:
        'Because the tangent approximates the curve linearly near the root, each new tangent line leads closer and closer to the true zero-crossing.',
    },

    // Section C: Initial approximation
    sectionC: {
      id: 'section-c',
      title: 'Choosing the initial approximation x₀',
      initialBracketRequirement:
        'First find an interval [a, b] such that f(a) and f(b) have opposite signs (f(a) · f(b) < 0), confirming a real root lies in [a, b].',
      x0SelectionRule:
        'Under the course procedure, select x₀ as the endpoint whose function magnitude |f(x)| is closer to zero.',
      mathCriterion: '|f(x₀)| = min(|f(a)|, |f(b)|)',
      consequence:
        'Choosing x₀ closer to the root helps ensure rapid and stable convergence along the tangent line.',
    },

    // Section D: The Newton-Raphson formula
    sectionD: {
      id: 'section-d',
      title: 'The Newton-Raphson formula',
      tangentDerivation:
        'The tangent line equation at (x_n, f(x_n)) is: y - f(x_n) = f\'(x_n) · (x - x_n). Setting y = 0 for the x-axis intercept yields:',
      formula: 'x_(n+1) = x_n - f(x_n) / f\'(x_n)',
      steps: [
        {
          stepNumber: 1,
          label: 'Find opposite signs and pick x₀',
          instruction: 'Find [a, b] with f(a)·f(b) < 0 and select x₀ with |f(x₀)| = min(|f(a)|, |f(b)|).',
          mathFormula: '|f(x_0)| = min(|f(a)|, |f(b)|)',
        },
        {
          stepNumber: 2,
          label: 'Compute the derivative f\'(x)',
          instruction: 'Differentiate f(x) with respect to x using standard calculus rules.',
        },
        {
          stepNumber: 3,
          label: 'Calculate f(x_n) and f\'(x_n)',
          instruction: 'Substitute the current approximation x_n into f(x) and f\'(x).',
        },
        {
          stepNumber: 4,
          label: 'Apply the iteration formula',
          instruction: 'Calculate the next approximation: x_(n+1) = x_n - f(x_n) / f\'(x_n).',
          mathFormula: 'x_(n+1) = x_n - f(x_n) / f\'(x_n)',
        },
        {
          stepNumber: 5,
          label: 'Repeat until convergence',
          instruction: 'Repeat iterations until successive approximations agree to requested decimal places.',
        },
      ],
    },

    // Section E: Understand one iteration
    sectionE: {
      id: 'section-e',
      title: 'Understand one iteration',
      summary:
        'Every Newton-Raphson iteration updates the root candidate by sliding down the tangent line.',
      phases: [
        {
          phase: '1. Current Estimate',
          action: 'Begin at current point x_n.',
          purpose: 'Anchor point for the tangent line.',
        },
        {
          phase: '2. Height & Slope',
          action: 'Evaluate f(x_n) and the tangent slope f\'(x_n).',
          purpose: 'Determines the direction and steepness of the linear projection.',
        },
        {
          phase: '3. Correction Step',
          action: 'Subtract the ratio: x_(n+1) = x_n - f(x_n)/f\'(x_n).',
          purpose: 'Calculates the horizontal zero-intercept of the tangent line.',
        },
        {
          phase: '4. Agreement Check',
          action: 'Compare x_(n+1) with x_n to check decimal place agreement.',
          purpose: 'Decides whether to accept the root or continue to iteration n+1.',
        },
      ],
    },

    // Section F: Understand the iteration table
    sectionF: {
      id: 'section-f',
      title: 'Understand the iteration table',
      description:
        'The course organizes Newton-Raphson calculations in a clean row-by-row iteration format.',
      columns: [
        {
          header: 'n',
          description: 'Iteration index (0, 1, 2, ...)',
          roleInProcedure: 'Tracks how many tangent line steps have been taken.',
        },
        {
          header: 'x_n',
          description: 'Current root approximation',
          roleInProcedure: 'Base value for function and derivative evaluations.',
        },
        {
          header: 'f(x_n)',
          description: 'Function value evaluated at x_n',
          roleInProcedure: 'Numerator in the correction term.',
        },
        {
          header: 'f\'(x_n)',
          description: 'Derivative value evaluated at x_n',
          roleInProcedure: 'Denominator in the correction term.',
        },
        {
          header: 'x_(n+1)',
          description: 'New approximation: x_n - f(x_n)/f\'(x_n)',
          roleInProcedure: 'Becomes x_n for the next iteration.',
        },
      ],
      tracingGuide:
        'To trace the table: substitute x_n into f(x) and f\'(x). Divide f(x_n) by f\'(x_n) and subtract the quotient from x_n to produce x_(n+1). Repeat until successive x values agree.',
    },

    // Section G: Worked example
    sectionG: {
      id: 'section-g',
      title: 'Worked example: x^4 - x - 10 = 0',
      equation: 'x^4 - x - 10 = 0',
      derivative: 'f\'(x) = 4x^3 - 1',
      interval: [1, 2],
      initialX0: 2,
      requiredAccuracy: '3 decimal places',
      initialCheck: {
        f_a_calc: 'f(1) = 1^4 - 1 - 10 = -10 < 0',
        f_b_calc: 'f(2) = 2^4 - 2 - 10 = 4 > 0',
        conclusion:
          'Since f(1) < 0 and f(2) > 0 have opposite signs, a root lies in [1, 2]. Because |f(2)| = 4 < |f(1)| = 10, we select x₀ = 2.',
      },
      solverResult: courseSolverResult,
      approximateRoot: courseSolverResult.formattedRoot || '1.856',
    },

    // Section H: When do we stop?
    sectionH: {
      id: 'section-h',
      title: 'When do we stop?',
      stoppingRule:
        'In the Newton-Raphson procedure demonstrated in the course material, iterations stop when consecutive approximations agree to the requested number of decimal places.',
      demonstratedExplanation:
        'In the course example with accuracy to 3 decimal places: x₀ = 2, x₁ ≈ 1.871, x₂ ≈ 1.856, and x₃ ≈ 1.856. Because x₂ and x₃ agree to 3 decimal places (1.856), iterations terminate and 1.856 is accepted as the root.',
      methodSpecificClarification:
        'Unlike bracketing methods that maintain two endpoints, Newton-Raphson tracks a single converging sequence x_n. Agreement between consecutive approximations is the textbook stopping rule.',
    },

    // Section I: Common mistakes
    sectionI: {
      id: 'section-i',
      title: 'Common mistakes & things to check',
      category: 'MathEngineer Learning Guidance',
      description:
        'These checks are based on common student errors detected during Newton-Raphson problem solving.',
      items: [
        {
          id: 'missing-minus',
          mistake: 'Adding the ratio instead of subtracting: x_n + f(x_n)/f\'(x_n)',
          correction:
            'Always subtract the correction: x_(n+1) = x_n - f(x_n)/f\'(x_n). Watch the minus sign carefully when f(x_n) is negative.',
        },
        {
          id: 'swapped-derivative',
          mistake: 'Inverting the ratio as f\'(x_n) / f(x_n)',
          correction:
            'The derivative belongs in the denominator: f(x_n) / f\'(x_n).',
        },
        {
          id: 'wrong-derivative-calc',
          mistake: 'Incorrectly differentiating the original expression',
          correction:
            'Differentiate term by term before calculating values. For x^4 - x - 10, the derivative is 4x^3 - 1, not 4x^3.',
        },
        {
          id: 'omitted-denominator',
          mistake: 'Evaluating x_n - f(x_n) without dividing by f\'(x_n)',
          correction:
            'Always divide f(x_n) by the derivative slope f\'(x_n) before subtracting.',
        },
        {
          id: 'wrong-x0-choice',
          mistake: 'Selecting the endpoint with the larger |f(x)|',
          correction:
            'Course rule: Choose x₀ such that |f(x₀)| = min(|f(a)|, |f(b)|).',
        },
      ],
    },

    // Section J: Try Newton-Raphson yourself
    sectionJ: {
      id: 'section-j',
      title: 'Try Newton-Raphson yourself',
      description:
        'Put the tangent method into practice. You can solve step by step with the interactive solver, or inspect the complete explained solution.',
      tryMyselfCTA: {
        label: 'Try Newton-Raphson yourself',
        target: 'solve',
        action: 'myself',
        description:
          'Step through the Newton-Raphson Method with interactive verification and progressive hints.',
      },
      practiceCTA: {
        label: 'Practice Newton-Raphson',
        target: 'practice',
        description:
          'Explore university-focused practice problems and test your calculation speed.',
      },
    },
  };
}
