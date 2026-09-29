/**
 * Authoritative Course Knowledge Base for MathEngineer
 * 
 * Sourced directly from official course presentations by:
 * Dr. Ram Kishun Lodhi
 * Department of Applied Science
 * Symbiosis Institute of Technology Pune
 * 
 * Documents:
 * 1. Unit-I Numerical techniques: Bisection methods (10 pages)
 * 2. Unit-I Numerical techniques: False position methods (8 pages)
 * 3. Unit-I Numerical techniques: Newton - Raphson methods (8 pages)
 */

import { KnowledgeDocument, KnowledgeChunk } from '../../types/knowledge.ts';

export const COURSE_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-unit1-bisection',
    unit: 'Unit-I',
    topic: 'Numerical solution of algebraic and transcendental equations: Bisection methods',
    method: 'bisection',
    title: 'Bisection Methods',
    sourceType: 'official-course',
    sourceFile: 'Unit-I_Bisection_Methods.pdf',
    author: 'Dr. Ram Kishun Lodhi',
    department: 'Department of Applied Science',
    institution: 'Symbiosis Institute of Technology Pune',
    pageCount: 10,
  },
  {
    id: 'doc-unit1-false-position',
    unit: 'Unit-I',
    topic: 'Numerical solution of algebraic and transcendental equations: False position methods',
    method: 'false-position',
    title: 'False Position Methods or Regula-Falsi Method',
    sourceType: 'official-course',
    sourceFile: 'Unit-I_False_Position_Methods.pdf',
    author: 'Dr. Ram Kishun Lodhi',
    department: 'Department of Applied Science',
    institution: 'Symbiosis Institute of Technology Pune',
    pageCount: 8,
  },
  {
    id: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    topic: 'Numerical solution of algebraic and transcendental equations: Newton - Raphson methods',
    method: 'newton-raphson',
    title: 'Newton-Raphson Method',
    sourceType: 'official-course',
    sourceFile: 'Unit-I_Newton_Raphson_Methods.pdf',
    author: 'Dr. Ram Kishun Lodhi',
    department: 'Department of Applied Science',
    institution: 'Symbiosis Institute of Technology Pune',
    pageCount: 8,
  },
];

export const COURSE_CHUNKS: KnowledgeChunk[] = [
  // ==========================================
  // BISECTION METHOD CHUNKS (Unit-I, SIT Pune)
  // ==========================================
  {
    id: 'chunk-bis-equations-root',
    documentId: 'doc-unit1-bisection',
    unit: 'Unit-I',
    method: 'bisection',
    topic: 'Equations and Root Definition',
    section: 'Algebraic, Transcendental, and Root Definition',
    sourcePage: 2,
    sourceSlide: 2,
    sourceType: 'official-course',
    keywords: ['algebraic', 'transcendental', 'root', 'definition', 'polynomial', 'degree', 'equation'],
    equations: [
      'f(x) = a_0 x^n + a_1 x^{n-1} + ... + a_n = 0',
      '\\tan x - e^x = 0',
      'x + \\log_e x = 0',
      'f(\\alpha) = 0',
    ],
    content:
      'According to the course notes by Dr. Ram Kishun Lodhi (SIT Pune):\n' +
      '- An algebraic equation is of the form f(x) = a0*x^n + a1*x^(n-1) + ... + an = 0, where an are real numbers, a0 != 0, and n is a non-negative integer.\n' +
      '- A transcendental equation contains trigonometric, logarithmic, or exponential functions (e.g., tan(x) - e^x = 0, x + log_e(x) = 0).\n' +
      '- Root Definition: The value alpha of x which satisfies f(x) = 0 is called a root of f(x) = 0.',
  },
  {
    id: 'chunk-bis-bracketing-condition',
    documentId: 'doc-unit1-bisection',
    unit: 'Unit-I',
    method: 'bisection',
    topic: 'Condition for Existence of Root',
    section: 'Bracketing Condition and Sign Check',
    sourcePage: 4,
    sourceSlide: 4,
    sourceType: 'official-course',
    keywords: ['condition', 'bracket', 'opposite signs', 'continuous', 'real root', 'f(a)', 'f(b)', 'intermediate value'],
    equations: ['f(a) \\cdot f(b) < 0', 'f(x) = x^3 - 5'],
    content:
      'Official Course Rule for Bisection Bracketing:\n' +
      'If f(x) is continuous and real in the interval [a, b] and f(a), f(b) are of opposite signs (f(a) * f(b) < 0), then the equation f(x) = 0 will have at least one real root between a and b.\n' +
      'Example from slides: For f(x) = x^3 - 5, f(0) = -5, f(1) = -4, f(2) = 3. Since f(1) and f(2) have opposite signs (-4 and +3), there lies a root in the interval (1, 2).',
  },
  {
    id: 'chunk-bis-algorithm-midpoint',
    documentId: 'doc-unit1-bisection',
    unit: 'Unit-I',
    method: 'bisection',
    topic: 'Bisection Procedure & Midpoint',
    section: 'Midpoint Calculation and Algorithm',
    sourcePage: 5,
    sourceSlide: 5,
    sourceType: 'official-course',
    keywords: ['midpoint', 'algorithm', 'procedure', 'x1', '(a+b)/2', 'calculate', 'formula'],
    equations: ['x_1 = \\frac{a + b}{2}', 'f(x_1) = 0'],
    content:
      'Official Course Procedure/Algorithm for Bisection:\n' +
      '1. Let the function f(x) be continuous in the interval [a, b].\n' +
      '2. Decide initial values of a and b that bracket the root.\n' +
      '3. Calculate f(a) and f(b).\n' +
      '4. If f(a)*f(b) > 0, no root exists between a and b (under single root bracketing assumption).\n' +
      '5. If f(a)*f(b) < 0, calculate the first approximation midpoint: x1 = (a + b) / 2, and evaluate f(x1).\n' +
      '6. If f(x1) = 0, then x1 is the exact root.',
  },
  {
    id: 'chunk-bis-interval-update',
    documentId: 'doc-unit1-bisection',
    unit: 'Unit-I',
    method: 'bisection',
    topic: 'Interval Update Rule',
    section: 'Sign-Based Interval Update',
    sourcePage: 5,
    sourceSlide: 5,
    sourceType: 'official-course',
    keywords: ['interval update', 'update', 'replace a', 'replace b', 'sign rule', 'subinterval', 'next interval'],
    equations: ['f(x_1) \\cdot f(b) < 0', 'a_n', 'b_n'],
    content:
      'Official Course Interval Update Rule for Bisection:\n' +
      '- If f(x1)*f(b) < 0:\n' +
      '  The root does not lie between a and x1; the root lies between x1 and b. Therefore, replace a with x1 for the next iteration.\n' +
      '- Conversely, if f(a)*f(x1) < 0, the root lies between a and x1. Therefore, replace b with x1 for the next iteration.\n' +
      '- Repeat the procedure until the desired result is obtained.',
  },
  {
    id: 'chunk-bis-stopping-rule',
    documentId: 'doc-unit1-bisection',
    unit: 'Unit-I',
    method: 'bisection',
    topic: 'Stopping Rule and Precision',
    section: 'Convergence and Stopping Convention',
    sourcePage: 8,
    sourceSlide: 8,
    sourceType: 'official-course',
    keywords: ['stopping rule', 'when to stop', 'stop', 'convergence', 'precision', 'decimal places', 'two decimal places'],
    equations: ['a_n \\approx b_n \\approx x_{n+1}'],
    content:
      'Official Course Stopping Convention for Bisection:\n' +
      'In the course notes worked example (Slide 8): "In the 8th step an, bn and x_{n+1} are equal up to two decimal places. We can take 2.94 as a root up to two decimal places. Therefore the root of x^3 - 9x + 1 = 0 is 2.94."\n' +
      'The course standard stops when the interval endpoints and midpoint agree to the requested number of decimal places.',
  },
  {
    id: 'chunk-bis-worked-example',
    documentId: 'doc-unit1-bisection',
    unit: 'Unit-I',
    method: 'bisection',
    topic: 'Worked Example',
    section: 'Step-by-Step Course Example',
    sourcePage: 6,
    sourceSlide: 6,
    sourceType: 'official-course',
    keywords: ['worked example', 'example', 'x^3 - 9x + 1', 'table', 'iterations', '2.94'],
    equations: ['x^3 - 9x + 1 = 0', 'x_1 = 2.5', 'x_8 = 2.9419', 'x = 2.94'],
    content:
      'Official Course Worked Example for Bisection:\n' +
      'Problem: Solve x^3 - 9x + 1 = 0 for the root lying between 2 and 3 correct to two decimal places.\n' +
      'Solution:\n' +
      '- f(2) = -9, f(3) = 1 => f(2)*f(3) < 0. Root lies between 2 and 3.\n' +
      '- n=0: a0=2, b0=3 => x1 = 2.5, f(2.5) = -5.8\n' +
      '- n=1: a1=2.5, b1=3 => x2 = 2.75, f(2.75) = -2.9\n' +
      '- n=2: a2=2.75, b2=3 => x3 = 2.88, f(2.88) = -1.03\n' +
      '- n=3: a3=2.88, b3=3 => x4 = 2.94, f(2.94) = -0.05\n' +
      '- n=4: a4=2.94, b4=3 => x5 = 2.97, f(2.97) = 0.47\n' +
      '- n=5: a5=2.94, b5=2.97 => x6 = 2.955, f(2.955) = 0.21\n' +
      '- n=6: a6=2.94, b6=2.955 => x7 = 2.9475, f(2.9475) = 0.08\n' +
      '- n=7: a7=2.94, b7=2.9475 => x8 = 2.9438, f(2.9438) = 0.017\n' +
      '- n=8: a8=2.94, b8=2.9438 => x9 = 2.9419, f(2.9419) = -0.016\n' +
      'At step 8, an=2.94, bn=2.9438, x9=2.9419 are equal to 2 decimal places (2.94). Desired root is 2.94.',
  },

  // ===============================================
  // FALSE POSITION METHOD CHUNKS (Unit-I, SIT Pune)
  // ===============================================
  {
    id: 'chunk-fp-concept-geometry',
    documentId: 'doc-unit1-false-position',
    unit: 'Unit-I',
    method: 'false-position',
    topic: 'Concept and Geometric Interpretation',
    section: 'Regula-Falsi Concept & Secant Line',
    sourcePage: 2,
    sourceSlide: 2,
    sourceType: 'official-course',
    keywords: ['false position', 'regula-falsi', 'concept', 'secant line', 'oldest method', 'geometry'],
    equations: ['\\frac{y - f(a)}{x - a} = \\frac{f(b) - f(a)}{b - a}'],
    content:
      'According to the course notes by Dr. Ram Kishun Lodhi (SIT Pune):\n' +
      '- False Position Method (or Regula-Falsi Method) is the oldest method of finding the real root of an equation f(x) = 0 and closely resembles the bisection method.\n' +
      '- Identify two points a and b such that f(a) and f(b) are of opposite signs, so the root lies between a and b.\n' +
      '- The equation of the secant line joining (a, f(a)) and (b, f(b)) is:\n' +
      '  (y - f(a)) / (x - a) = (f(b) - f(a)) / (b - a)',
  },
  {
    id: 'chunk-fp-formula-derivation',
    documentId: 'doc-unit1-false-position',
    unit: 'Unit-I',
    method: 'false-position',
    topic: 'False Position Formula',
    section: 'Formula Derivation at y=0',
    sourcePage: 3,
    sourceSlide: 3,
    sourceType: 'official-course',
    keywords: ['formula', 'false position formula', 'regula falsi formula', 'derivation', 'recurrence', 'x-intercept'],
    equations: [
      'x = \\frac{a \\cdot f(b) - b \\cdot f(a)}{f(b) - f(a)}',
      'x_{n+2} = \\frac{x_n \\cdot f(x_{n+1}) - x_{n+1} \\cdot f(x_n)}{f(x_{n+1}) - f(x_n)}',
    ],
    content:
      'Official False Position Formula Derivation:\n' +
      'Setting y = 0 in the secant line equation:\n' +
      '(0 - f(a)) / (x - a) = (f(b) - f(a)) / (b - a)\n' +
      '=> x = (a * f(b) - b * f(a)) / (f(b) - f(a))\n' +
      'In general recurrence notation:\n' +
      'x_{n+2} = (x_n * f(x_{n+1}) - x_{n+1} * f(x_n)) / (f(x_{n+1}) - f(x_n))',
  },
  {
    id: 'chunk-fp-interval-sign-update',
    documentId: 'doc-unit1-false-position',
    unit: 'Unit-I',
    method: 'false-position',
    topic: 'Interval Sign Update Rule',
    section: 'Sign Check and Bracket Update',
    sourcePage: 4,
    sourceSlide: 4,
    sourceType: 'official-course',
    keywords: ['update', 'interval update', 'sign rule', 'replacement', 'subinterval', 'bracket'],
    equations: ['f(x_1) \\cdot f(b) < 0', 'f(a) \\cdot f(x_1) < 0'],
    content:
      'Official Course Interval Update for False Position:\n' +
      'After computing x1:\n' +
      '- Evaluate f(x1).\n' +
      '- Check sign: if f(x1) has the same sign as f(a), replace a with x1 so the root lies in [x1, b].\n' +
      '- If f(x1) has the same sign as f(b), replace b with x1 so the root lies in [a, x1].\n' +
      '- The bracket always maintains f(a)*f(b) < 0.',
  },
  {
    id: 'chunk-fp-stopping-rule',
    documentId: 'doc-unit1-false-position',
    unit: 'Unit-I',
    method: 'false-position',
    topic: 'Stopping Rule and Precision',
    section: 'Stopping Convention for False Position',
    sourcePage: 3,
    sourceSlide: 3,
    sourceType: 'official-course',
    keywords: ['stopping rule', 'when to stop', 'stop', 'convergence', 'precision', 'successive approximations', 'four decimal places'],
    equations: ['|x_{n+1} - x_n| \\approx 0'],
    content:
      'Official Course Stopping Convention for False Position:\n' +
      '- "We continue this until the two successive approximations are approximately equal." (Slide 3)\n' +
      '- In the worked example (Slide 6), x8 = 0.51767 and x9 = 0.51775. Both round to 0.5177. "Hence the root is 0.5177 correct to 4 decimal places."\n' +
      '- Important note: Unlike Bisection, False Position does NOT stop when endpoints a and b agree, because one endpoint often stays fixed.',
  },
  {
    id: 'chunk-fp-worked-example',
    documentId: 'doc-unit1-false-position',
    unit: 'Unit-I',
    method: 'false-position',
    topic: 'Worked Example',
    section: 'Step-by-Step Regula-Falsi Example',
    sourcePage: 4,
    sourceSlide: 4,
    sourceType: 'official-course',
    keywords: ['worked example', 'x e^x = cos(x)', 'regula falsi example', '0.5177', 'iterations'],
    equations: [
      'f(x) = x e^x - \\cos(x) = 0',
      'f(0) = -1, f(1) = 2.17798',
      'x_1 = 0.31467',
      'x_8 = 0.51767, x_9 = 0.51775 \\implies 0.5177',
    ],
    content:
      'Official Course Worked Example for False Position:\n' +
      'Problem: Find the root of x*e^x = cos(x) using the regula-falsi method correct to 4 decimal places.\n' +
      'Solution:\n' +
      '- f(x) = x*e^x - cos(x) = 0\n' +
      '- f(0) = -1, f(1) = 1*e^1 - cos(1) = 2.17798 => root in [0, 1]\n' +
      '- x1 = (0*2.17798 - 1*(-1)) / (2.17798 - (-1)) = 1 / 3.17798 = 0.31467\n' +
      '- f(0.31467) = -0.51987 => root lies between 0.31467 and 1\n' +
      '- x2 = (0.31467*2.17798 - 1*(-0.51987)) / (2.17798 - (-0.51987)) = 0.44673\n' +
      '- Successive approximations: x3=0.49402, x4=0.50995, x5=0.51520, x6=0.51692, x7=0.51748, x8=0.51767, x9=0.51775\n' +
      '- Hence the root is 0.5177 correct to 4 decimal places.',
  },

  // ===============================================
  // NEWTON-RAPHSON METHOD CHUNKS (Unit-I, SIT Pune)
  // ===============================================
  {
    id: 'chunk-nr-concept-applicability',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Concept and Applicability',
    section: 'Newton-Raphson Applicability & Definition',
    sourcePage: 2,
    sourceSlide: 2,
    sourceType: 'official-course',
    keywords: ['newton-raphson', 'concept', 'applicability', 'simple expression', 'derivative', 'iteration method'],
    equations: ['f(x) = 0', "f'(x)"],
    content:
      'According to the course notes by Dr. Ram Kishun Lodhi (SIT Pune):\n' +
      '- Newton-Raphson Method is an iteration method used to find the roots of an equation f(x) = 0 when the derivative of f(x) is a simple expression.\n' +
      '- It starts with an approximate root x0 and generates rapidly improving successive approximations.',
  },
  {
    id: 'chunk-nr-taylor-derivation',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Taylor Series Derivation',
    section: 'Derivation from Taylor Series Expansion',
    sourcePage: 3,
    sourceSlide: 3,
    sourceType: 'official-course',
    keywords: ['derivation', 'taylor series', 'taylors theorem', 'neglecting terms', 'h = -f/f', 'proof'],
    equations: [
      'f(x_0 + h) = 0',
      "f(x_0) + \\frac{h}{1!} f'(x_0) + \\frac{h^2}{2!} f''(x_0) + ... = 0",
      "h = -\\frac{f(x_0)}{f'(x_0)}",
      "x_1 = x_0 - \\frac{f(x_0)}{f'(x_0)}",
    ],
    content:
      'Official Course Derivation of Newton-Raphson:\n' +
      '1. Let x = x0 be an approximate value of one root of f(x) = 0 in [a, b].\n' +
      '2. If x = x1 is the exact root, then f(x1) = 0, where x1 = x0 + h and h is very small.\n' +
      '3. By Taylor’s theorem:\n' +
      '   f(x0) + (h/1!) f\'(x0) + (h^2/2!) f\'\'(x0) + (h^3/3!) f\'\'\'(x0) + ... = 0\n' +
      '4. Since h is small, neglecting the terms containing h^2, h^3, ...:\n' +
      '   f(x0) + h f\'(x0) = 0  =>  h = -f(x0) / f\'(x0)\n' +
      '5. From x1 = x0 + h:\n' +
      '   x1 = x0 - f(x0) / f\'(x0).',
  },
  {
    id: 'chunk-nr-formula',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Newton-Raphson Formula',
    section: 'General Recurrence Formula',
    sourcePage: 4,
    sourceSlide: 4,
    sourceType: 'official-course',
    keywords: ['formula', 'newton formula', 'recurrence', 'xn+1', 'derivative ratio'],
    equations: ["x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}"],
    content:
      'Official Newton-Raphson Formula (Equation 3 in course notes):\n' +
      'Proceeding iteratively:\n' +
      'x_{n+1} = x_n - f(x_n) / f\'(x_n)\n' +
      'Each iteration evaluates the ratio of the function value to its first derivative and subtracts it from the current estimate.',
  },
  {
    id: 'chunk-nr-initial-guess-x0',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Initial Guess Selection Rule',
    section: 'Course Rule for Choosing x0',
    sourcePage: 5,
    sourceSlide: 5,
    sourceType: 'official-course',
    keywords: ['initial guess', 'choose x0', 'x0 selection', 'close to 0', 'how to choose x0', 'starting value', 'rule'],
    equations: ['f(1) = -10, f(2) = 4 \\implies x_0 = 2'],
    content:
      'Official Course Rule for Choosing Initial Guess x0:\n' +
      'In the course notes (Slide 5):\n' +
      'For the bracket between 1 and 2, calculate f(1) = -10 and f(2) = 4.\n' +
      '"Since 4 is close to 0, so take x0 = 2 as initial approximation."\n' +
      'Rule: Choose x0 as the endpoint whose function value magnitude |f(x)| is closest to 0.',
  },
  {
    id: 'chunk-nr-stopping-rule',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Stopping Rule and Precision',
    section: 'Convergence and Stopping Convention',
    sourcePage: 6,
    sourceSlide: 6,
    sourceType: 'official-course',
    keywords: ['stopping rule', 'when to stop', 'stop', 'x3 = x2', 'successive approximations', 'three decimal places', 'convergence'],
    equations: ['x_{n+1} = x_n'],
    content:
      'Official Course Stopping Convention for Newton-Raphson:\n' +
      'Continue iterations until consecutive approximations agree to the requested number of decimal places.\n' +
      'From Slide 7: "Since x3 = x2. Hence the desired root is 1.856 (correct to three decimal places)."\n' +
      'When x_{n+1} matches x_n to the desired decimal places, the iteration terminates.',
  },
  {
    id: 'chunk-nr-worked-example',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Worked Example',
    section: 'Step-by-Step Newton-Raphson Example',
    sourcePage: 5,
    sourceSlide: 5,
    sourceType: 'official-course',
    keywords: ['worked example', 'x^4 - x - 10', '1.856', 'example', 'iterations'],
    equations: [
      'f(x) = x^4 - x - 10 = 0',
      "f'(x) = 4x^3 - 1",
      'x_0 = 2',
      'x_1 = 1.871',
      'x_2 = 1.856',
      'x_3 = 1.856',
    ],
    content:
      'Official Course Worked Example for Newton-Raphson:\n' +
      'Problem: Find one root of x^4 - x - 10 = 0 between 1 and 2 by Newton-Raphson method correct to 3 decimal places.\n' +
      'Solution:\n' +
      '- f(x) = x^4 - x - 10 => f\'(x) = 4x^3 - 1\n' +
      '- f(1) = -10, f(2) = 4. Since 4 is close to 0, take x0 = 2 as initial approximation.\n' +
      '- First approximation: x1 = 2 - (2^4 - 2 - 10) / (4*2^3 - 1) = 2 - 4/31 = 1.871\n' +
      '- Second approximation: x2 = 1.871 - ((1.871)^4 - 1.871 - 10) / (4*(1.871)^3 - 1) = 1.856\n' +
      '- Third approximation: x3 = 1.856 - ((1.856)^4 - 1.856 - 10) / (4*(1.856)^3 - 1) = 1.856\n' +
      '- Since x3 = x2, the desired root is 1.856 (correct to three decimal places).',
  },

  // ==============================================================
  // EXPLICIT NEGATIVE KNOWLEDGE (Topics NOT specified by course)
  // ==============================================================
  {
    id: 'chunk-negative-boundaries',
    documentId: 'doc-unit1-newton-raphson',
    unit: 'Unit-I',
    method: 'newton-raphson',
    topic: 'Course Negative Boundaries (Unspecified Topics)',
    section: 'Topics Not Covered in Dr. Lodhi Notes',
    sourcePage: 8,
    sourceSlide: 8,
    sourceType: 'official-course',
    keywords: [
      'derivative zero',
      'derivative is zero',
      'derivative is 0',
      'derivative 0',
      "f'(x) = 0",
      'division by zero',
      'division by 0',
      'divided by zero',
      'divided by 0',
      'quadratic convergence',
      'order of convergence',
      'divergence',
      'inflection point',
    ],
    notSpecifiedInCourse: [
      'derivative-zero-handling',
      'quadratic-convergence-proof',
      'order-of-convergence-derivation',
      'divergence-cycles',
    ],
    content:
      'Course Negative Boundary Notice:\n' +
      'The audited official course slide deck by Dr. Ram Kishun Lodhi (SIT Pune) DOES NOT specify:\n' +
      '1. Explicit handling when derivative is zero f\'(x) = 0 (division by zero).\n' +
      '2. Proof or rate of quadratic convergence.\n' +
      '3. Divergence, cycle oscillations, or inflection point failure modes.\n' +
      'STATUS: NOT_SPECIFIED_BY_COURSE.',
  },
];
