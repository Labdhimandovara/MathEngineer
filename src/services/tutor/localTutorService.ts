/**
 * Local Basic Tutor Service (Phase 13.1)
 * 
 * Provides fast, deterministic, educational answers for common low-complexity questions
 * directly from verified course knowledge, deterministic solver state, and curated templates.
 * 
 * Guarantees zero Gemini API usage for basic definitions, formulas, comparisons, and hints,
 * protecting API quota and preventing user exposure to provider overload / 503 errors.
 */

import { TutorContext, LanguageMode, TutorIntent } from './tutorTypes.ts';
import { formatMathForSpeech } from './voiceService.ts';
import { searchKnowledge } from '../knowledge/knowledgeService.ts';
import { generateDeterministicSolution } from '../problem/solutionService.ts';
import {
  formatCompleteDeterministicSolution,
  formatSolutionSpeechText,
} from './solutionFormatter.ts';

export interface LocalTutorResult {
  reply: string;
  speechText: string;
  quickActions?: string[];
  category: 'definition' | 'formula' | 'comparison' | 'hint' | 'step' | 'course' | 'general';
}

/**
 * Normalizes query string for robust intent matching
 */
function cleanQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identifies explicit numerical root-finding / calculation commands
 */
export function isCalculationIntent(query: string): boolean {
  const q = cleanQuery(query);
  return (
    q.startsWith('find the solution') ||
    q.startsWith('find solution') ||
    q.startsWith('find the root') ||
    q.startsWith('find root') ||
    q.startsWith('calculate the root') ||
    q.startsWith('calculate root') ||
    q.startsWith('solve the equation') ||
    (q.startsWith('solve ') && !q.includes('solve with me') && !q.includes('how to solve')) ||
    q === 'solve' ||
    q === 'solve this' ||
    q === 'solve this problem' ||
    q === 'can you solve this' ||
    q === 'what is the solution' ||
    q.startsWith('what is the solution') ||
    q === 'show solution' ||
    q.startsWith('show solution') ||
    q.includes('show solution') ||
    q === 'show me the solution' ||
    q === 'what is the answer' ||
    q.startsWith('what is the answer') ||
    q.includes('what is the answer') ||
    q === 'what is the root' ||
    q.startsWith('what is the root') ||
    q.includes('what is the root') ||
    q.includes('what is the result') ||
    q === 'tell me the root' ||
    q === 'tell me the solution' ||
    q.includes('find the solution of') ||
    q.includes('what is the solution of') ||
    q.includes('what is the root of')
  );
}

/**
 * Extracts a candidate mathematical equation from a calculation query
 */
export function extractEquationFromQuery(query: string): string | null {
  const raw = query.trim();
  const match =
    raw.match(/(?:solution\s+of|solution\s+for|root\s+of|root\s+for|solve\s+the\s+equation|solve)\s+([a-zA-Z0-9^+\-*/().\s=]+)$/i) ||
    raw.match(/^solve\s+([a-zA-Z0-9^+\-*/().\s=]+)$/i);

  if (match && match[1]) {
    const candidate = match[1].trim();
    if (
      candidate.length >= 2 &&
      /[a-zA-Z]/.test(candidate) &&
      !candidate.toLowerCase().includes('problem') &&
      !candidate.toLowerCase().includes('this')
    ) {
      return candidate;
    }
  }
  return null;
}

/**
 * Determines whether a query can be answered locally without contacting external AI
 */
export function canAnswerLocally(query: string, context?: TutorContext): boolean {
  const q = cleanQuery(query);

  // If query is explicitly asking for university course/syllabus/professor notes, yield to Course Knowledge / RAG
  if (
    q.includes('course') ||
    q.includes('syllabus') ||
    q.includes('professor') ||
    q.includes('lodhi') ||
    q.includes('sit pune')
  ) {
    return false;
  }

  // 0. Explicit calculation requests (Sections 1, 8, 9, 23)
  if (isCalculationIntent(query)) {
    return true;
  }

  // 1. Core definition and method explanation queries
  if (
    q === 'what is bisection' ||
    q === 'what is bisection method' ||
    q === 'what is the bisection method' ||
    q === 'define bisection' ||
    q === 'define bisection method' ||
    q === 'explain bisection' ||
    q === 'explain bisection method' ||
    q.includes('how does bisection work') ||
    q.includes('how bisection works') ||
    q.includes('how does the bisection method work') ||
    q.includes('explain how bisection works') ||
    q.includes('how to solve bisection') ||
    q.includes('how to use bisection') ||
    q === 'what is false position' ||
    q === 'what is false position method' ||
    q === 'what is regula falsi' ||
    q === 'what is the false position method' ||
    q === 'define false position' ||
    q === 'define false position method' ||
    q === 'explain false position' ||
    q === 'explain false position method' ||
    q.includes('how does false position work') ||
    q.includes('how false position works') ||
    q.includes('explain how false position works') ||
    q.includes('how does regula falsi work') ||
    q.includes('how to solve false position') ||
    q === 'what is newton raphson' ||
    q === 'what is newton-raphson' ||
    q === 'what is newton raphson method' ||
    q === 'define newton raphson' ||
    q === 'define newton raphson method' ||
    q === 'what is newton-raphson used for' ||
    q === 'what is newton raphson used for' ||
    q === 'explain newton raphson' ||
    q === 'explain newton raphson method' ||
    q.includes('how does newton raphson work') ||
    q.includes('how newton raphson works') ||
    q.includes('explain how newton raphson works') ||
    q.includes('how to solve newton raphson') ||
    q.includes('how to use newton raphson') ||
    q === 'what is convergence' ||
    q === 'define convergence' ||
    q === 'what is an iteration' ||
    q === 'what is iteration' ||
    q === 'define iteration' ||
    q === 'what is a derivative' ||
    q === 'what is derivative' ||
    q === 'define derivative' ||
    q === 'what is intermediate value theorem' ||
    q === 'what is ivt' ||
    q.includes('bolzano')
  ) {
    return true;
  }

  // 2. Formula queries
  if (
    q === 'formula' ||
    q === 'what is the formula' ||
    q === 'what is the formula for bisection' ||
    q === 'bisection formula' ||
    q === 'what is the formula for false position' ||
    q === 'false position formula' ||
    q === 'what is the false position formula' ||
    q === 'what is the formula for newton raphson' ||
    q === 'newton raphson formula' ||
    q === 'what is the newton raphson formula' ||
    q === 'what is the newton-raphson formula' ||
    q === 'give me the formula' ||
    q === 'show formula' ||
    q.startsWith('what is the formula') ||
    q.endsWith('formula') ||
    q.includes('formula for')
  ) {
    return true;
  }

  // 3. Comparison queries
  if (
    q.includes('compare bisection and newton') ||
    q.includes('compare bisection and false') ||
    q.includes('compare newton and bisection') ||
    q.includes('compare methods') ||
    q.includes('difference between bisection and newton') ||
    q.includes('difference between bisection and newton raphson') ||
    q.includes('bisection vs newton') ||
    q.includes('bisection vs false position') ||
    q.includes('which method is faster') ||
    q.includes('which method converges faster')
  ) {
    return true;
  }

  // 4. Basic hints, next step requests, and solving guidance
  if (
    q === 'give me a hint' ||
    q === 'give hint' ||
    q === 'hint' ||
    q === 'need a hint' ||
    q === 'i am stuck' ||
    q === 'explain this simply' ||
    q === 'explain the next step' ||
    q === 'what is the next step' ||
    q === 'next step' ||
    q.includes('next step') ||
    q.includes('how to solve') ||
    q.includes('how do i solve') ||
    q.includes('help me solve') ||
    q.includes('how can i solve') ||
    q.includes('guide me') ||
    q.includes('why did we choose') ||
    q.includes('why choose') ||
    q.includes('why interval') ||
    q.includes('why [') ||
    (q.includes('why') && q.includes('bracket'))
  ) {
    return true;
  }

  return false;
}

/**
 * Generates an authoritative local educational response based on verified course knowledge
 */
export function getLocalTutorAnswer(
  query: string,
  context: TutorContext
): LocalTutorResult | null {
  const q = cleanQuery(query);
  const isHinglish = context.languageMode === 'hinglish';
  const activeMethod = context.activeProblem?.method || context.courseContext?.methodFocus || 'bisection';
  const activeProblem = context.activeProblem;
  const solver = context.solverState;

  // --------------------------------------------------------------------------
  // 0. DETERMINISTIC MATHEMATICAL CALCULATION (Sections 1, 8, 9, 23)
  // --------------------------------------------------------------------------
  if (isCalculationIntent(query)) {
    const extractedEq = extractEquationFromQuery(query);
    const equationToSolve = extractedEq || activeProblem?.equation || '';

    if (equationToSolve) {
      // Determine method: from query or activeProblem
      let targetMethod: 'bisection' | 'false-position' | 'newton-raphson' | null = null;
      if (q.includes('bisection')) {
        targetMethod = 'bisection';
      } else if (q.includes('false position') || q.includes('regula falsi')) {
        targetMethod = 'false-position';
      } else if (q.includes('newton') || q.includes('raphson')) {
        targetMethod = 'newton-raphson';
      } else if (activeProblem?.method) {
        const m = activeProblem.method.toLowerCase();
        if (m === 'bisection' || m === 'false-position' || m === 'newton-raphson') {
          targetMethod = m as 'bisection' | 'false-position' | 'newton-raphson';
        }
      }

      if (targetMethod) {
        const sol = generateDeterministicSolution({
          questionId: activeProblem?.questionId,
          equation: equationToSolve,
          method: targetMethod,
          lowerBound: activeProblem?.lowerBound,
          upperBound: activeProblem?.upperBound,
          initialGuess: activeProblem?.initialGuess,
          decimalPlaces: activeProblem?.decimalPlaces || 3,
          boundsSource: activeProblem?.boundsSource,
        });

        const methodLabel =
          targetMethod === 'false-position'
            ? 'False Position'
            : targetMethod === 'newton-raphson'
            ? 'Newton-Raphson'
            : 'Bisection';

        const eqDisplay = equationToSolve.includes('=') ? equationToSolve : `${equationToSolve} = 0`;

        if (sol.success && sol.root !== undefined) {
          const reply = formatCompleteDeterministicSolution(sol, context.languageMode);
          const speechText = formatSolutionSpeechText(sol, context.languageMode);
          const quickActions = isHinglish
            ? ['Agla step samjhao', 'Formula kya hai?', 'Ek hint do']
            : ['What is the formula?', 'Explain the next step', 'Compare with other methods'];

          return {
            reply,
            speechText,
            category: 'step',
            quickActions,
          };
        } else {
          const reply = isHinglish
            ? `${eqDisplay} ko solve karne me dikkat: ${sol.error || 'Initial interval bounds verify karein.'}`
            : `Could not solve ${eqDisplay}: ${sol.error || 'Please provide or verify starting interval bounds.'}`;

          return {
            reply,
            speechText: formatMathForSpeech(reply),
            category: 'step',
            quickActions: ['Find a Valid Interval', 'What is Bisection?', 'What is False Position?'],
          };
        }
      } else {
        // Section 23: No method specified and no active method in context
        // Polite clarification asking which method to use
        const eqDisplay = equationToSolve.includes('=') ? equationToSolve : `${equationToSolve} = 0`;
        const reply = isHinglish
          ? `${eqDisplay} ko solve karne ke liye aap kaun sa method use karna chahenge: Bisection, False Position, ya Newton-Raphson?`
          : `Which method would you like to use to solve ${eqDisplay}: Bisection, False Position, or Newton-Raphson?`;

        return {
          reply,
          speechText: formatMathForSpeech(reply),
          category: 'general',
          quickActions: ['Solve with Bisection', 'Solve with False Position', 'Solve with Newton-Raphson'],
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // 1. DEFINITIONS
  // --------------------------------------------------------------------------

  // Bisection Method Definition
  if (
    q === 'what is bisection' ||
    q === 'what is bisection method' ||
    q === 'what is the bisection method' ||
    q === 'define bisection' ||
    q === 'define bisection method' ||
    q === 'explain bisection' ||
    q === 'explain bisection method' ||
    q.includes('how does bisection work') ||
    q.includes('how bisection works') ||
    q.includes('how does the bisection method work') ||
    q.includes('explain how bisection works') ||
    q.includes('how to solve bisection') ||
    q.includes('how to use bisection')
  ) {
    const reply = isHinglish
      ? 'Bisection method ek bracket-based numerical technique hai continuous function f(x) = 0 ka real root nikalne ke liye. Hum ek aisa starting interval [a, b] lete hain jahan f(a) aur f(b) ke signs opposite hon (f(a) · f(b) < 0). Har step par midpoint c = (a + b) / 2 nikalte hain aur root bracket ko aadha karte jaate hain. Iski convergence guaranteed hoti hai (Intermediate Value Theorem se) par rate linear (slow) hota hai.'
      : 'The Bisection method is a bracket-based numerical root-finding algorithm for continuous equations f(x) = 0. Starting with an initial interval [a, b] where f(a) and f(b) have opposite signs (f(a) · f(b) < 0), it repeatedly bisects the interval at midpoint c = (a + b) / 2 and retains the half containing the root. By the Intermediate Value Theorem, convergence is guaranteed, with a linear rate of convergence.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['What is the formula?', 'Give me a hint', 'Compare with Newton-Raphson'],
    };
  }

  // False Position Method Definition
  if (
    q === 'what is false position' ||
    q === 'what is regula falsi' ||
    q === 'what is the false position method' ||
    q === 'define false position' ||
    q === 'explain false position' ||
    q.includes('how does false position work') ||
    q.includes('how false position works') ||
    q.includes('explain how false position works') ||
    q.includes('how does regula falsi work') ||
    q.includes('how to solve false position')
  ) {
    const reply = isHinglish
      ? 'False Position method (Regula Falsi) ek bracketing technique hai jo interval [a, b] ke endpoints (a, f(a)) aur (b, f(b)) ko ek straight line (chord) se connect karta hai. Jahan yeh chord x-axis ko intersect karti hai, wahi naya estimate hota hai: c = (a·f(b) - b·f(a)) / (f(b) - f(a)). Yeh Bisection se faster converge hota hai kyunki yeh function values ke magnitude ko weight karta hai.'
      : 'The False Position method (Regula Falsi) is a bracketing numerical method that approximates real roots by connecting the interval endpoints (a, f(a)) and (b, f(b)) with a secant chord. The next approximation c is the x-intercept of this chord: c = (a·f(b) - b·f(a)) / (f(b) - f(a)). It requires f(a) · f(b) < 0 and converges faster than Bisection on well-behaved functions.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['What is the formula?', 'Give me a hint', 'Compare with Bisection'],
    };
  }

  // Newton-Raphson Method Definition & Purpose
  if (
    q === 'what is newton raphson' ||
    q === 'what is newton-raphson' ||
    q === 'what is newton raphson method' ||
    q === 'define newton raphson' ||
    q === 'what is newton-raphson used for' ||
    q === 'what is newton raphson used for' ||
    q === 'explain newton raphson' ||
    q.includes('how does newton raphson work') ||
    q.includes('how newton raphson works') ||
    q.includes('explain how newton raphson works') ||
    q.includes('how to solve newton raphson') ||
    q.includes('how to use newton raphson')
  ) {
    const reply = isHinglish
      ? 'Newton-Raphson method ek open, single-point iterative method hai jo tangent lines ki madad se roots find karta hai. Ek initial guess x₀ se start karke, formula hota hai: xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ). Iska convergence order quadratic (2) hota hai, jo teeno methods me sabse fast hai, basharte derivative f\'(xₙ) zero na ho aur initial guess root ke close ho.'
      : 'The Newton-Raphson method is an open, single-point iterative method that approximates real roots using tangent lines. Starting from an initial guess x₀, each successive value is calculated by xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ). It features quadratic convergence (order 2), making it significantly faster than Bisection and False Position, provided f\'(xₙ) ≠ 0 and x₀ is sufficiently close to the true root.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['What is the formula?', 'Give me a hint', 'Compare with Bisection'],
    };
  }

  // Convergence Definition
  if (q === 'what is convergence' || q === 'define convergence') {
    const reply = isHinglish
      ? 'Numerical methods me convergence ka matlab hota hai ki successive iterations xₙ true root ke pass aate jaate hain (|xₙ - root| → 0). Bisection linear rate (1/2 har step) se converge hota hai, False Position linear/superlinear hota hai, aur Newton-Raphson quadratic rate (har iteration me correct digits double) se converge hota hai.'
      : 'In numerical analysis, convergence means that successive approximations xₙ approach the exact root as the iteration count increases (|xₙ - root| → 0). Bisection converges linearly (error is halved each step), False Position converges linearly, and Newton-Raphson exhibits quadratic convergence (the number of correct decimal digits roughly doubles each iteration).';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['Compare methods', 'What is an iteration?'],
    };
  }

  // Iteration Definition
  if (q === 'what is an iteration' || q === 'what is iteration' || q === 'define iteration') {
    const reply = isHinglish
      ? 'Iteration ka matlab algorithm ka ek single evaluation cycle hota hai, jahan current value ya interval se formula apply karke ek naya aur better root approximation nikalte hain.'
      : 'An iteration is a single repeated step in a numerical algorithm where current approximations are updated using a mathematical rule to produce a more precise root estimate.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['What is the formula?', 'Give me a hint'],
    };
  }

  // Derivative Definition
  if (q === 'what is a derivative' || q === 'what is derivative' || q === 'define derivative') {
    const reply = isHinglish
      ? 'Derivative f\'(x) curve ke kisi point par tangent line ka slope ya instantaneous rate of change hota hai. Newton-Raphson method me f\'(xₙ) denominator me aata hai (xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ)), isliye f\'(x) calculation accurate hona zaroori hai aur zero nahi hona chahiye.'
      : 'The derivative f\'(x) represents the instantaneous rate of change of a function, or geometrically, the slope of the tangent line to the curve at point x. In the Newton-Raphson method, f\'(xₙ) forms the denominator in xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ), so it must be non-zero.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['What is the formula?', 'What is Newton-Raphson?'],
    };
  }

  // Intermediate Value Theorem & Bolzano
  if (q === 'what is intermediate value theorem' || q === 'what is ivt' || q.includes('bolzano')) {
    const reply = isHinglish
      ? 'Intermediate Value Theorem (IVT) states that agar f(x) interval [a, b] par continuous hai aur f(a) aur f(b) ke signs opposite hain (f(a) · f(b) < 0), to interval (a, b) ke andar kam se kam ek real root alpha zaroor exist karega jahan f(alpha) = 0.'
      : 'The Intermediate Value Theorem (IVT) states that if f(x) is continuous on [a, b] and f(a) · f(b) < 0 (opposite signs), then there exists at least one real number c in (a, b) such that f(c) = 0. This is the mathematical foundation of bracketing methods like Bisection and False Position.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'definition',
      quickActions: ['What is Bisection?', 'What is False Position?'],
    };
  }

  // --------------------------------------------------------------------------
  // 2. FORMULAS
  // --------------------------------------------------------------------------

  if (
    q === 'formula' ||
    q === 'what is the formula' ||
    q === 'give me the formula' ||
    q === 'show formula' ||
    q.includes('formula')
  ) {
    // Specific method formulas
    if (q.includes('bisection') || (!q.includes('false') && !q.includes('newton') && activeMethod === 'bisection')) {
      const reply = isHinglish
        ? 'Bisection Method Formula:\n1. Midpoint Formula: c = (a + b) / 2\n2. Subinterval Update: Agar f(a) · f(c) < 0 hai, to naya interval [a, c] banega; agar f(c) · f(b) < 0 hai, to naya interval [c, b] banega.\n3. Stopping Criterion: |b - a| < epsilon ya decimal places match hone tak continue karein.'
        : 'Bisection Method Formulas:\n1. Midpoint calculation: c = (a + b) / 2\n2. Interval update rule: If f(a) · f(c) < 0, next interval is [a, c]. Otherwise, next interval is [c, b].\n3. Stopping criterion: Stop when |b - a| < tolerance or root matches the required decimal places.';

      return {
        reply,
        speechText: formatMathForSpeech(reply),
        category: 'formula',
        quickActions: ['Give me a hint', 'Explain the next step', 'Show solution'],
      };
    }

    if (q.includes('false') || q.includes('regula') || (!q.includes('bisection') && !q.includes('newton') && activeMethod === 'false-position')) {
      const reply = isHinglish
        ? 'False Position (Regula Falsi) Formula:\n1. Chord Intercept Formula: c = (a·f(b) - b·f(a)) / (f(b) - f(a))\n2. Equivalent form: c = b - (f(b) · (b - a)) / (f(b) - f(a))\n3. Interval Update: Agar f(a) · f(c) < 0, to naya interval [a, c]; otherwise [c, b].'
        : 'False Position (Regula Falsi) Formulas:\n1. Linear chord formula: c = (a·f(b) - b·f(a)) / (f(b) - f(a))\n2. Numerically stable form: c = b - [f(b) · (b - a)] / [f(b) - f(a)]\n3. Replacement rule: If f(a) · f(c) < 0, next interval is [a, c]; else [c, b].';

      return {
        reply,
        speechText: formatMathForSpeech(reply),
        category: 'formula',
        quickActions: ['Give me a hint', 'Explain the next step', 'Show solution'],
      };
    }

    if (q.includes('newton') || (!q.includes('bisection') && !q.includes('false') && activeMethod === 'newton-raphson')) {
      const reply = isHinglish
        ? 'Newton-Raphson Iteration Formula:\n1. Formula: xₙ₊₁ = xₙ - f(xₙ) / f\'(xₙ)\n2. Condition: Derivative f\'(xₙ) ≠ 0 hona chahiye.\n3. Stopping Criterion: |xₙ₊₁ - xₙ| < epsilon.'
        : 'Newton-Raphson Iteration Formulas:\n1. Iteration formula: xₙ₊₁ = xₙ - f(xₙ) / f\'(xₙ)\n2. Condition: Requires f\'(xₙ) ≠ 0 at each step.\n3. Stopping criterion: Stop when |xₙ₊₁ - xₙ| < tolerance.';

      return {
        reply,
        speechText: formatMathForSpeech(reply),
        category: 'formula',
        quickActions: ['Give me a hint', 'Explain the next step', 'Show solution'],
      };
    }
  }

  // --------------------------------------------------------------------------
  // 3. COMPARISON OF METHODS
  // --------------------------------------------------------------------------

  if (
    q.includes('compare bisection and newton') ||
    q.includes('compare bisection and false') ||
    q.includes('compare newton and bisection') ||
    q.includes('compare methods') ||
    q.includes('difference between bisection and newton') ||
    q.includes('difference between bisection and newton raphson') ||
    q.includes('bisection vs newton') ||
    q.includes('bisection vs false position') ||
    q.includes('which method is faster') ||
    q.includes('which method converges faster')
  ) {
    const reply = isHinglish
      ? 'Numerical Methods Comparison:\n1. Bisection Method:\n   - Type: Bracketing method (requires [a, b] with f(a)·f(b) < 0)\n   - Convergence: Guaranteed, linear rate (slowest)\n   - Formula: c = (a + b) / 2\n\n2. False Position (Regula Falsi):\n   - Type: Bracketing method (requires f(a)·f(b) < 0)\n   - Convergence: Guaranteed, faster than Bisection\n   - Formula: c = (a·f(b) - b·f(a)) / (f(b) - f(a))\n\n3. Newton-Raphson Method:\n   - Type: Open method (needs initial guess x₀ and derivative f\'(x))\n   - Convergence: quadratic order (fastest), but may diverge if f\'(x) ≈ 0\n   - Formula: xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ)'
      : 'Comparison of Numerical Root-Finding Methods:\n1. Bisection Method:\n   - Category: Bracketing (requires interval [a, b] where f(a)·f(b) < 0)\n   - Convergence: Always guaranteed, linear rate (halves interval each step)\n   - Formula: c = (a + b) / 2\n\n2. False Position Method:\n   - Category: Bracketing (requires f(a)·f(b) < 0)\n   - Convergence: Always guaranteed, faster than Bisection by using secant weights\n   - Formula: c = (a·f(b) - b·f(a)) / (f(b) - f(a))\n\n3. Newton-Raphson Method:\n   - Category: Open (requires one initial guess x₀ and analytic derivative f\'(x))\n   - Convergence: quadratic order (doubles accurate digits each step; fastest), but can diverge if f\'(x) ≈ 0\n   - Formula: xₙ₊₁ = xₙ - f(xₙ) / f\'(xₙ)';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'comparison',
      quickActions: ['What is Bisection?', 'What is Newton-Raphson?', 'Give me a hint'],
    };
  }

  // --------------------------------------------------------------------------
  // 4. HINTS & NEXT STEP GUIDANCE
  // --------------------------------------------------------------------------

  if (
    q === 'give me a hint' ||
    q === 'give hint' ||
    q === 'hint' ||
    q === 'need a hint' ||
    q === 'i am stuck' ||
    q === 'explain the next step' ||
    q === 'what is the next step' ||
    q === 'next step' ||
    q.includes('next step') ||
    q.includes('how to solve') ||
    q.includes('how do i solve') ||
    q.includes('help me solve') ||
    q.includes('how can i solve') ||
    q.includes('guide me')
  ) {
    if (activeProblem?.equation) {
      const isGuidance = q.includes('how') || q.includes('help') || q.includes('guide');
      const stepHeader = isGuidance
        ? (isHinglish ? 'Solving Guidance' : 'Solving Guidance')
        : (q.includes('step'))
        ? (isHinglish ? 'Next step' : 'Next step')
        : (isHinglish ? 'Hint' : 'Hint');

      if (activeMethod === 'bisection') {
        const a = activeProblem.lowerBound ?? 0;
        const b = activeProblem.upperBound ?? 1;
        const reply = isHinglish
          ? `${stepHeader} for ${activeProblem.equation}:\n1. Pehle interval [${a}, ${b}] par signs check karein ki f(${a}) aur f(${b}) opposite hain.\n2. Midpoint c = (${a} + ${b}) / 2 = ${((a + b) / 2).toFixed(activeProblem.decimalPlaces)} calculate karein.\n3. f(c) evaluate karke dekhein ki root kis subinterval me hai.`
          : `${stepHeader} for ${activeProblem.equation}:\n1. Verify that f(${a}) and f(${b}) have opposite signs (f(${a}) · f(${b}) < 0).\n2. Calculate the midpoint c = (${a} + ${b}) / 2 = ${((a + b) / 2).toFixed(activeProblem.decimalPlaces)}.\n3. Evaluate f(c) to determine whether the root lies in [${a}, c] or [c, ${b}].`;

        return {
          reply,
          speechText: formatMathForSpeech(reply),
          category: 'hint',
          quickActions: ['What is the formula?', 'Explain the next step', 'Show solution'],
        };
      }

      if (activeMethod === 'false-position') {
        const a = activeProblem.lowerBound ?? 0;
        const b = activeProblem.upperBound ?? 1;
        const reply = isHinglish
          ? `Hint for ${activeProblem.equation}:\n1. Points (${a}, f(${a})) aur (${b}, f(${b})) evaluate karein.\n2. Chord formula apply karein: c = (${a}·f(${b}) - ${b}·f(${a})) / (f(${b}) - f(${a})).\n3. f(c) ka sign check karke opposite sign wale endpoint ko retain karein.`
          : `Hint for ${activeProblem.equation}:\n1. Evaluate f(${a}) and f(${b}) carefully.\n2. Apply the chord formula: c = (${a}·f(${b}) - ${b}·f(${a})) / (f(${b}) - f(${a})).\n3. Check the sign of f(c) to decide whether to update a or b for the next iteration.`;

        return {
          reply,
          speechText: formatMathForSpeech(reply),
          category: 'hint',
          quickActions: ['What is the formula?', 'Explain the next step', 'Show solution'],
        };
      }

      if (activeMethod === 'newton-raphson') {
        const x0 = activeProblem.initialGuess ?? activeProblem.lowerBound ?? 1;
        const reply = isHinglish
          ? `Hint for ${activeProblem.equation}:\n1. Equation ka derivative f'(x) calculate karein.\n2. Current estimate x₀ = ${x0} par f(x₀) aur f'(x₀) evaluate karein.\n3. Update karein: x₁ = ${x0} - f(${x0}) / f'(${x0}).`
          : `Hint for ${activeProblem.equation}:\n1. Differentiate f(x) to find f'(x).\n2. Evaluate f(${x0}) and f'(${x0}) at your current estimate x₀ = ${x0}.\n3. Compute the next approximation: x₁ = ${x0} - f(${x0}) / f'(${x0}).`;

        return {
          reply,
          speechText: formatMathForSpeech(reply),
          category: 'hint',
          quickActions: ['What is the formula?', 'Explain the next step', 'Show solution'],
        };
      }
    }

    const reply = isHinglish
      ? 'General Hint: Root-finding start karne se pehle starting interval ya initial guess confirm karein. Bisection aur False Position me opposite signs zaroori hain, jabki Newton-Raphson me non-zero derivative zaroori hai.'
      : 'General Hint: Before calculating, verify your starting interval or initial guess. Bisection and False Position require opposite signs (f(a) · f(b) < 0), while Newton-Raphson requires f\'(x) ≠ 0.';

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'hint',
      quickActions: ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?'],
    };
  }

  // --------------------------------------------------------------------------
  // 5. EXPLAIN SIMPLY
  // --------------------------------------------------------------------------

  if (q === 'explain this simply') {
    if (activeMethod === 'bisection') {
      const reply = isHinglish
        ? 'Simple explanation: Socho hum 1 se 100 ke beech koi number guess kar rahe hain aur har baar puchte hain "bada hai ya chota?". Hum har baar beech ka number bol kar range ko aadha kar dete hain. Bisection method exactly yahi karta hai root ke sath!'
        : 'Simple explanation: Think of guessing a number between 1 and 100 where each time you are told "higher or lower". You always guess the midpoint to eliminate half the possibilities. The Bisection method does exactly this to find mathematical roots!';

      return {
        reply,
        speechText: formatMathForSpeech(reply),
        category: 'general',
        quickActions: ['What is the formula?', 'Give me a hint'],
      };
    }

    if (activeMethod === 'false-position') {
      const reply = isHinglish
        ? 'Simple explanation: Bisection hamesha theek beech me divide karta hai, par False Position dekhta hai ki curve kahan zero ke zyada pass hai. Yeh dono points ko straight line se jod kar estimate karta hai, isliye jaldi answer tak pahunchta hai.'
        : 'Simple explanation: While Bisection always cuts directly in the middle, False Position draws a straight line between the two endpoints and checks where that line hits zero. This weights the estimate toward the closer endpoint, usually converging faster.';

      return {
        reply,
        speechText: formatMathForSpeech(reply),
        category: 'general',
        quickActions: ['What is the formula?', 'Give me a hint'],
      };
    }

    if (activeMethod === 'newton-raphson') {
      const reply = isHinglish
        ? 'Simple explanation: Socho aap pahad par ho aur slope follow karke zameen tak aana chahte ho. Aap tangent line banate ho aur follow karte ho jahan woh zameen ko touch karti hai. Yeh method bahut tezi se root par pahunchata hai!'
        : 'Simple explanation: Imagine rolling down a hill toward the ground by following the tangent slope of the curve at your current spot. Following the tangent line shoots you straight toward the root, making Newton-Raphson extremely fast!';

      return {
        reply,
        speechText: formatMathForSpeech(reply),
        category: 'general',
        quickActions: ['What is the formula?', 'Give me a hint'],
      };
    }
  }

  // --------------------------------------------------------------------------
  // 6. INTERVAL BRACKET CHOICE (IVT)
  // --------------------------------------------------------------------------
  if (
    (q.includes('why did we choose') ||
      q.includes('why choose') ||
      q.includes('why interval') ||
      q.includes('why [') ||
      (q.includes('why') && q.includes('bracket'))) &&
    activeProblem?.equation
  ) {
    const a = activeProblem.lowerBound ?? 2;
    const b = activeProblem.upperBound ?? 3;
    const eq = activeProblem.equation;
    const reply = isHinglish
      ? `Humne interval [${a}, ${b}] Intermediate Value Theorem (IVT) ke mutabiq choose kiya hai. Equation ${eq} ke liye starting points f(${a}) aur f(${b}) opposite signs ke hone chahiye (f(${a}) · f(${b}) < 0). Kyunki f(x) continuous function hai aur endpoints par opposite signs hain, isliye [${a}, ${b}] ke beech kam se kam ek real root guarantee hota hai.`
      : `We chose the interval [${a}, ${b}] based on the Intermediate Value Theorem (IVT). For ${eq}, the continuous curve crosses the x-axis where f(${a}) and f(${b}) have opposite signs (f(${a}) · f(${b}) < 0). This confirms that a verified real root exists between ${a} and ${b}.`;

    const quickActions = isHinglish
      ? ['Solution dikhao', 'Agla step samjhao', 'Ek hint do']
      : ['What is the solution?', 'Explain the next step', 'Give me a hint'];

    return {
      reply,
      speechText: formatMathForSpeech(reply),
      category: 'step',
      quickActions,
    };
  }

  return null;
}

/**
 * Returns calm MathEngineer fallback message when Gemini API is overloaded or unavailable
 * Eliminates raw provider error messages like "503", "high demand", "gemini-3.x".
 */
export function getCalmFallbackMessage(
  languageMode: LanguageMode,
  hasActiveProblem: boolean
): { reply: string; speechText: string; quickActions: string[] } {
  const isHinglish = languageMode === 'hinglish';
  const reply = isHinglish
    ? 'AI Tutor filhaal temporarily unavailable hai. Aap neeche diye gaye quick actions se help le sakte hain, ya bina AI ke deterministic solver use karke continue kar sakte hain.'
    : 'AI Tutor is temporarily unavailable. Try one of the quick actions below, or continue solving with our deterministic numerical engine.';

  const quickActions = hasActiveProblem
    ? ['Give me a hint', 'Explain the formula', 'Explain the next step', 'Try again']
    : ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?', 'Try again'];

  return {
    reply,
    speechText: formatMathForSpeech(reply),
    quickActions,
  };
}

/**
 * Sanitizes any raw provider error string to eliminate leaked internals
 */
export function sanitizeProviderErrorMessage(rawError: string, languageMode?: LanguageMode): string {
  if (!rawError || typeof rawError !== 'string') return '';

  let cleaned = rawError
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/AQ\.[0-9A-Za-z\-_]{45,60}/g, '[REDACTED_API_KEY]');

  const lower = cleaned.toLowerCase();

  if (
    lower.includes('demand') ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('gemini') ||
    lower.includes('provider') ||
    lower.includes('model') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource exhausted')
  ) {
    return languageMode === 'hinglish'
      ? 'AI Tutor filhaal temporarily unavailable hai. Aap quick actions use kar sakte hain ya deterministic solver se continue karein.'
      : 'AI Tutor is temporarily unavailable. Try one of the quick actions below, or continue solving without AI.';
  }

  return cleaned;
}
