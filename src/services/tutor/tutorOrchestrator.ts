/**
 * Unified Intelligent Tutor Orchestrator & Router (Phase 13.4)
 * 
 * Central controller for all AI Tutor inquiries in MathEngineer:
 * - Deterministic Priority Routing:
 *     1. Deterministic Mathematical Calculation & Solution Display
 *     2. Current Deterministic Solver State & Interval Bracket Explanations
 *     3. Local Verified Tutor Knowledge (definitions, formulas, comparisons, hints)
 *     4. Official Course Knowledge / RAG (SIT Pune, Dr. Lodhi, syllabus citations)
 *     5. Google Gemini AI (conversational reasoning, pedagogy, intuitive explanations)
 *     6. Safe Non-Dead-End Clarification / Fallback
 * 
 * Guarantees:
 * - No UI decisions: All requests flow through this orchestrator.
 * - Zero Gemini calls for basic math calculations, definitions, formulas, and hints.
 * - Gemini failures (503, 429, timeout, network) never create a dead end or leak provider errors.
 * - Active Problem context (Image > Practice > Review > Quiz > Learn) is strictly preserved.
 * - Every request terminates in: SUCCESS, CLARIFICATION_REQUIRED, or ASSESSMENT_BLOCKED.
 * - Never leaves the user stuck in loading or empty response states.
 */

import {
  TutorRequest,
  TutorResponse,
  TutorResponseStatus,
  TutorAnswerSource,
  TutorIntent,
  TutorContext,
  LanguageMode,
} from './tutorTypes.ts';
import { buildTutorContext, classifyTutorIntent } from './tutorContext.ts';
import { formatMathForSpeech } from './voiceService.ts';
import { getLanguageMode, setLanguageMode } from './languageMode.ts';
import {
  formatCompleteDeterministicSolution,
  formatSolutionSpeechText,
} from './solutionFormatter.ts';
import {
  generateDeterministicSolution,
  DeterministicSolutionResult,
} from '../problem/solutionService.ts';
import { findInitialBracket } from '../../math/bracketSearch/index.ts';
import { updateRegisteredImageProblem, registerImageProblem } from '../problem/imageProblemRegistry.ts';
import { performLocalOcr } from '../ocr/ocrService.ts';
import { parseQuestionFromOcr } from '../ocr/questionParser.ts';
import {
  setActiveImageProblem,
  updateActiveImageSolverResult,
  NormalizedActiveProblem,
} from '../problem/activeProblemStore.ts';
import {
  canAnswerLocally,
  getLocalTutorAnswer,
  isCalculationIntent,
  extractEquationFromQuery,
  getCalmFallbackMessage,
  sanitizeProviderErrorMessage,
} from './localTutorService.ts';
import {
  searchKnowledge,
  detectMethodFromQuery,
} from '../knowledge/knowledgeService.ts';
import {
  stripBoldAsterisks,
  formatTutorReply,
  TutorRequestOptions,
} from './tutorService.ts';
import {
  fileToBase64,
  validateImageFile,
} from '../assistant/assistantService.ts';
import { handleChatRequest } from '../assistant/chatHandler.ts';
import { ChatRequestPayload, ChatRequestMessage } from '../assistant/types.ts';
import { getAttempts } from '../learning/learningStore.ts';
import { getAssessmentHistory } from '../assessment/assessmentStore.ts';
import { detectWeakTopics, deriveAdaptiveTopicStates } from '../adaptive/index.ts';

// -----------------------------------------------------------------------------
// INTERNAL AUDIT LOGGING (Section 29)
// -----------------------------------------------------------------------------

export interface TutorAuditLog {
  requestId: string;
  query: string;
  intent: TutorIntent;
  source: TutorAnswerSource;
  status: TutorResponseStatus;
  fallbackUsed: boolean;
  latencyMs: number;
  hasActiveProblem: boolean;
  language: LanguageMode;
  timestamp: number;
}

const auditLogBuffer: TutorAuditLog[] = [];
const MAX_AUDIT_LOGS = 100;

export function recordAuditLog(entry: TutorAuditLog): void {
  auditLogBuffer.push(entry);
  if (auditLogBuffer.length > MAX_AUDIT_LOGS) {
    auditLogBuffer.shift();
  }
}

export function getTutorAuditLogs(): TutorAuditLog[] {
  return [...auditLogBuffer];
}

export function clearTutorAuditLogs(): void {
  auditLogBuffer.length = 0;
}

// -----------------------------------------------------------------------------
// VERBAL SPOKEN MATH NORMALIZATION (Sections 18 & 19)
// -----------------------------------------------------------------------------

/**
 * Normalizes verbal spoken mathematical phrases into standard algebraic expressions
 * Example: "x to the power four minus thirty two" -> "x^4 - 32"
 */
export function convertSpokenMathToExpression(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.toLowerCase();

  // Spoken number words
  const wordMap: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    twenty: '20',
    thirty: '30',
    forty: '40',
    fifty: '50',
    sixty: '60',
    seventy: '70',
    eighty: '80',
    ninety: '90',
  };

  // Convert compound numbers like "thirty two" -> "32"
  text = text.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, tens, ones) => {
      const t = parseInt(wordMap[tens] || '0', 10);
      const o = parseInt(wordMap[ones] || '0', 10);
      return String(t + o);
    }
  );

  // Convert single number words
  for (const [w, digit] of Object.entries(wordMap)) {
    const reg = new RegExp(`\\b${w}\\b`, 'g');
    text = text.replace(reg, digit);
  }

  // Convert verbal powers
  text = text.replace(/\bx\s+to\s+the\s+power\s+(?:of\s+)?([0-9]+)\b/g, 'x^$1');
  text = text.replace(/\bx\s+(?:cubed|cube)\b/g, 'x^3');
  text = text.replace(/\bx\s+(?:squared|square)\b/g, 'x^2');

  // Convert operators
  text = text.replace(/\bminus\b/g, '-');
  text = text.replace(/\bplus\b/g, '+');
  text = text.replace(/\btimes\b/g, '*');
  text = text.replace(/\bmultiplied\s+by\b/g, '*');
  text = text.replace(/\bdivided\s+by\b/g, '/');
  text = text.replace(/\bequals?(?:\s+to)?\s+0\b/g, '= 0');

  return text.trim();
}

// -----------------------------------------------------------------------------
// UNIFIED TUTOR ORCHESTRATOR / ROUTER
// -----------------------------------------------------------------------------

/**
 * Routes any TutorRequest to the highest-priority appropriate source:
 * 1. Deterministic Solver (Calculations / Solutions)
 * 2. Current Solver State (Step Explanation / IVT Bracket Selection)
 * 3. Local Verified Tutor Knowledge (Definitions / Formulas / Comparisons / Hints)
 * 4. Course Knowledge / RAG (Official SIT Pune Syllabus / Dr. Lodhi Notes)
 * 5. Google Gemini AI (Conversational Pedagogy / Intuitive Conceptual Reasoning)
 * 6. Safe Clarification / Fallback
 */
export async function routeTutorRequest(
  request: TutorRequest,
  options?: TutorRequestOptions
): Promise<TutorResponse> {
  const startTime = Date.now();
  const requestId = `tutor-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Normalize query and verbal speech if present
  const rawQuery = (request.query || '').trim();
  const normalizedSpoken = convertSpokenMathToExpression(rawQuery);
  const effectiveQueryRaw = normalizedSpoken || rawQuery;
  const lowerRaw = rawQuery.toLowerCase().trim();

  // 1A. Language Mode Detection & Persistence (Phase 13.5)
  let languageMode: LanguageMode = request.languageMode || getLanguageMode();

  const isSwitchToHinglish =
    lowerRaw.includes('in hinglish') ||
    lowerRaw.includes('explain in hinglish') ||
    lowerRaw === 'hinglish' ||
    lowerRaw.startsWith('hinglish ') ||
    lowerRaw.endsWith(' hinglish');

  const isSwitchToEnglish =
    lowerRaw.includes('in english') ||
    lowerRaw.includes('explain in english') ||
    lowerRaw === 'english' ||
    lowerRaw.startsWith('english ') ||
    lowerRaw.endsWith(' english');

  if (isSwitchToHinglish) {
    languageMode = 'hinglish';
    setLanguageMode('hinglish');
  } else if (isSwitchToEnglish) {
    languageMode = 'english';
    setLanguageMode('english');
  }
  const isHinglish = languageMode === 'hinglish';

  // Normalize effectiveQuery by stripping explicit language switch directives for intent matching
  let effectiveQuery = effectiveQueryRaw;
  if (isSwitchToHinglish) {
    effectiveQuery = effectiveQuery
      .replace(/\bin hinglish\b/gi, '')
      .replace(/\bexplain in hinglish\b/gi, '')
      .replace(/\bhinglish\b/gi, '')
      .trim();
  } else if (isSwitchToEnglish) {
    effectiveQuery = effectiveQuery
      .replace(/\bin english\b/gi, '')
      .replace(/\bexplain in english\b/gi, '')
      .replace(/\benglish\b/gi, '')
      .trim();
  }
  if (!effectiveQuery) {
    effectiveQuery = effectiveQueryRaw;
  }

  // ---------------------------------------------------------------------------
  // 2. ASSESSMENT SAFETY (Section 21)
  // ---------------------------------------------------------------------------
  if (request.isAssessmentActive) {
    const pausedMsg = isHinglish
      ? 'Quiz ke dauraan AI tutor paused hai. Pehle assessment complete karein, phir explanations review kar sakte hain.'
      : 'AI tutor is paused during active assessment. Complete the quiz to review explanations.';

    const response: TutorResponse = {
      status: 'assessment-blocked',
      answer: pausedMsg,
      source: 'local',
      language: languageMode,
      success: false,
      reply: pausedMsg,
      speechText: formatMathForSpeech(pausedMsg),
      intent: 'EXPLAIN_STEP',
      languageMode,
      solverVerified: false,
      isSolverGrounded: false,
      isAssessmentBlocked: true,
      error: 'AI tutor is paused during active assessment.',
      retryable: false,
    };

    recordAuditLog({
      requestId,
      query: effectiveQuery,
      intent: 'EXPLAIN_STEP',
      source: 'local',
      status: 'assessment-blocked',
      fallbackUsed: false,
      latencyMs: Date.now() - startTime,
      hasActiveProblem: false,
      language: languageMode,
      timestamp: Date.now(),
    });

    return response;
  }

  // ---------------------------------------------------------------------------
  // 3. OCR-FIRST IMAGE PROBLEM PIPELINE
  // When an image file is uploaded, run local OCR deterministically.
  // Never fall back to stale Practice or old active problem context!
  // ---------------------------------------------------------------------------
  let imageProblemCreated: NormalizedActiveProblem | null = null;

  if (request.imageFile) {
    const val = validateImageFile(request.imageFile);
    if (!val.valid) {
      const errMsg = val.error || 'Please upload a valid JPEG, PNG, or WebP image under 10MB.';
      return {
        status: 'clarification',
        answer: errMsg,
        source: 'fallback',
        language: languageMode,
        success: false,
        reply: errMsg,
        speechText: formatMathForSpeech(errMsg),
        intent: 'CALCULATION',
        languageMode,
        solverVerified: false,
        isSolverGrounded: false,
        error: errMsg,
        retryable: false,
      };
    }

    try {
      const ocrResult = await performLocalOcr(request.imageFile, { signal: options?.signal });
      const parsed = parseQuestionFromOcr(ocrResult.text);

      if (!parsed.equation) {
        // OCR could not extract equation -> NEVER fall back to stale practice context
        const noEqMsg = isHinglish
          ? 'Hum is photo se mathematical equation confidently detect nahi kar sake. Kripya photo clear upload karein ya problem manually enter karein.'
          : "I couldn't confidently read the mathematical equation from this image. Please try uploading a clearer image or enter the problem manually.";

        const actions = ['Try Again', 'Enter Problem Manually', 'What is Bisection?'];
        return {
          status: 'clarification',
          answer: noEqMsg,
          source: 'clarification',
          language: languageMode,
          success: false,
          reply: noEqMsg,
          speechText: formatMathForSpeech(noEqMsg),
          intent: 'CALCULATION',
          languageMode,
          solverVerified: false,
          isSolverGrounded: false,
          actions,
          quickActions: actions,
          retryable: true,
        };
      }

      // Equation extracted successfully!
      const imageMethod: 'bisection' | 'false-position' | 'newton-raphson' =
        parsed.method || 'bisection';
      let lowerBound = parsed.lowerBound;
      let upperBound = parsed.upperBound;
      let initialGuess = parsed.initialGuess;
      let boundsSource = parsed.boundsSource || 'supplied';
      let bracketDiscovery: any = undefined;

      // Deterministic IVT bracket discovery if bounds are missing for bracketed methods
      if ((imageMethod === 'bisection' || imageMethod === 'false-position') && (lowerBound == null || upperBound == null)) {
        const disc = findInitialBracket(parsed.equation);
        if (disc.found) {
          lowerBound = disc.a;
          upperBound = disc.b;
          boundsSource = 'discovered';
          bracketDiscovery = {
            a: disc.a,
            b: disc.b,
            fa: disc.fa,
            fb: disc.fb,
            explanation: disc.explanation,
          };
        }
      }

      if (imageMethod === 'newton-raphson' && initialGuess == null) {
        initialGuess = 1;
      }

      const imageQuestionId = parsed.id || `img_q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const decimalPlaces = parsed.decimalPlaces || 3;

      // Register in persistent image problem registry
      registerImageProblem({
        questionId: imageQuestionId,
        source: 'image',
        equation: parsed.equation,
        method: imageMethod,
        lowerBound,
        upperBound,
        initialGuess,
        boundsSource,
        decimalPlaces,
        rawExtractedText: parsed.questionText,
        discoveredExplanation: bracketDiscovery?.explanation,
      });

      // Update activeProblemStore immediately
      imageProblemCreated = {
        questionId: imageQuestionId,
        source: 'image',
        equation: parsed.equation,
        method: imageMethod,
        lowerBound,
        upperBound,
        initialGuess,
        boundsSource,
        decimalPlaces,
        rawExtractedText: parsed.questionText,
        bracketDiscovery,
      };

      setActiveImageProblem(imageProblemCreated);

      // Precalculate deterministic solution
      const detSol = generateDeterministicSolution({
        questionId: imageQuestionId,
        equation: parsed.equation,
        method: imageMethod,
        lowerBound,
        upperBound,
        initialGuess,
        decimalPlaces,
        boundsSource,
      });

      if (detSol.success) {
        updateActiveImageSolverResult({
          converged: detSol.convergence,
          root: detSol.root,
          formattedRoot: detSol.formattedRoot,
          iterationsCount: detSol.iterationsCount,
          iterationsSummary: detSol.iterationsSummary,
          stoppingReason: detSol.stoppingReason,
          bracketDiscovery: detSol.bracketDiscovery,
        });
      }
    } catch (err: any) {
      if (options?.signal?.aborted) {
        throw err;
      }
      console.warn('Local OCR execution failed:', err);
    }
  }

  // 4. Build deterministic TutorContext respecting precedence
  const context: TutorContext =
    request.context ||
    buildTutorContext({
      query: effectiveQuery,
      currentPage: request.currentPage,
      isAssessmentActive: request.isAssessmentActive,
      activeProblemOverride: (imageProblemCreated as any) || request.activeProblemOverride,
      languageMode,
      responseMode: request.responseMode,
    });

  const activeProblem = context.activeProblem;
  const activeMethod = activeProblem?.method || context.courseContext?.methodFocus || 'bisection';
  let intent: TutorIntent = context.interactionContext.tutorMode || classifyTutorIntent(effectiveQuery, activeProblem);

  // ---------------------------------------------------------------------------
  // 4. INPUT VALIDATION (Section 46)
  // ---------------------------------------------------------------------------
  if (!effectiveQuery && !request.imageFile) {
    const emptyMsg = isHinglish
      ? 'Kripya apna question type karein ya kisi problem ki photo upload karein.'
      : 'Please ask a mathematical question or upload an image of a problem.';

    const actions = ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?'];

    return {
      status: 'clarification',
      answer: emptyMsg,
      source: 'fallback',
      language: languageMode,
      success: false,
      reply: emptyMsg,
      speechText: formatMathForSpeech(emptyMsg),
      intent,
      languageMode,
      solverVerified: false,
      isSolverGrounded: false,
      actions,
      quickActions: actions,
      error: 'Empty question provided.',
      retryable: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. QUICK ACTION INTENT NORMALIZATION (Sections 15 & 16)
  // ---------------------------------------------------------------------------
  const lowerQ = effectiveQuery.toLowerCase().trim();

  // Retry Quick Action: retries the previous question or regenerates
  if (lowerQ === 'try again' || lowerQ === 'retry') {
    const history = (request.conversationHistory || []).filter((m) => m.role === 'user');
    if (history.length > 0) {
      const prevQuery = history[history.length - 1].content || history[history.length - 1].text;
      if (prevQuery && prevQuery.toLowerCase().trim() !== 'try again') {
        return routeTutorRequest(
          {
            ...request,
            query: prevQuery,
          },
          options
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5A. PURE LANGUAGE SWITCH QUERIES (Phase 13.5 Hinglish / English Toggle)
  // ---------------------------------------------------------------------------
  if (lowerRaw === 'explain in hinglish' || lowerRaw === 'in hinglish' || lowerRaw === 'hinglish') {
    if (activeProblem?.equation && activeProblem?.method) {
      const sol = generateDeterministicSolution({
        questionId: activeProblem.questionId,
        equation: activeProblem.equation,
        method: activeProblem.method,
        lowerBound: activeProblem.lowerBound,
        upperBound: activeProblem.upperBound,
        initialGuess: activeProblem.initialGuess,
        decimalPlaces: activeProblem.decimalPlaces || 3,
        boundsSource: activeProblem.boundsSource,
      });

      let hinglishMsg: string;
      if (sol.success && sol.root !== undefined) {
        hinglishMsg = `Ab se main is problem ko natural Hinglish me explain karunga!\n\n${formatCompleteDeterministicSolution(sol, 'hinglish')}`;
      } else {
        const methodTitle =
          activeProblem.method === 'false-position'
            ? 'False Position (Regula Falsi)'
            : activeProblem.method === 'newton-raphson'
            ? 'Newton-Raphson'
            : 'Bisection';
        hinglishMsg = `Ab se main is problem ko natural Hinglish me explain karunga!\n\nCurrent Problem:\n- Equation: ${activeProblem.equation}\n- Method: ${methodTitle}\n- Interval / Guess: [${activeProblem.lowerBound ?? 2}, ${activeProblem.upperBound ?? 3}]\n\nAap 'Show solution' pooch kar poora step-by-step iteration table dekh sakte hain, ya 'Give me a hint' bol kar agla step samajh sakte hain.`;
      }

      const actions = ['Show solution', 'Explain the formula', 'Give me a hint'];
      return {
        status: 'success',
        answer: hinglishMsg,
        source: 'local',
        language: 'hinglish',
        questionId: activeProblem.questionId,
        actions,
        success: true,
        reply: hinglishMsg,
        speechText: sol.success ? formatSolutionSpeechText(sol, 'hinglish') : formatMathForSpeech(hinglishMsg),
        intent: 'EXPLAIN_CONCEPT',
        languageMode: 'hinglish',
        groundedInMethod: activeProblem.method,
        groundedInProblem: activeProblem.questionId,
        groundedEquation: activeProblem.equation,
        groundedSource: activeProblem.source,
        solverVerified: Boolean(sol.success),
        isSolverGrounded: true,
        quickActions: actions,
        isLocalAnswer: true,
      };
    } else {
      const welcomeHinglish =
        'Ab se main sab kuch natural Hinglish me explain karunga! Aap mujhse numerical methods (Bisection, False Position, Newton-Raphson), formulas, interval bracket selection, ya kisi bhi problem ke baare me pooch sakte hain.';
      const actions = ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?'];
      return {
        status: 'success',
        answer: welcomeHinglish,
        source: 'local',
        language: 'hinglish',
        actions,
        success: true,
        reply: welcomeHinglish,
        speechText: formatMathForSpeech(welcomeHinglish),
        intent: 'GENERAL_HELP',
        languageMode: 'hinglish',
        solverVerified: false,
        isSolverGrounded: false,
        quickActions: actions,
        isLocalAnswer: true,
      };
    }
  }

  if (lowerRaw === 'explain in english' || lowerRaw === 'in english' || lowerRaw === 'english') {
    const welcomeEnglish =
      'I will now explain everything in standard English. Feel free to ask about numerical methods, step explanations, formulas, or specific problems.';
    const actions = ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?'];
    return {
      status: 'success',
      answer: welcomeEnglish,
      source: 'local',
      language: 'english',
      actions,
      success: true,
      reply: welcomeEnglish,
      speechText: formatMathForSpeech(welcomeEnglish),
      intent: 'GENERAL_HELP',
      languageMode: 'english',
      groundedInMethod: activeProblem?.method,
      groundedInProblem: activeProblem?.questionId,
      groundedEquation: activeProblem?.equation,
      groundedSource: activeProblem?.source,
      solverVerified: false,
      isSolverGrounded: false,
      quickActions: actions,
      isLocalAnswer: true,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. SOURCE 1 & 2: DETERMINISTIC SOLVER & CALCULATIONS (Sections 4, 5, 6, 17, 23)
  // ---------------------------------------------------------------------------

  // A. Check for Interval Bracket Choice Inquiry: "Why did we choose [2, 3]?"
  const isWhyIntervalInquiry =
    lowerQ.includes('why did we choose') ||
    lowerQ.includes('why choose') ||
    lowerQ.includes('why interval') ||
    lowerQ.includes('why [') ||
    (lowerQ.includes('why') && lowerQ.includes('bracket'));

  if (isWhyIntervalInquiry && activeProblem?.equation) {
    const a = activeProblem.lowerBound ?? 2;
    const b = activeProblem.upperBound ?? 3;
    const eq = activeProblem.equation;

    const bracketMsg = isHinglish
      ? `Humne interval [${a}, ${b}] Intermediate Value Theorem (IVT) ke mutabiq choose kiya hai. Equation ${eq} ke liye starting points f(${a}) aur f(${b}) opposite signs ke hone chahiye (f(${a}) · f(${b}) < 0). Kyunki f(x) continuous function hai aur endpoints par opposite signs hain, isliye [${a}, ${b}] ke beech kam se kam ek real root guarantee hota hai.`
      : `We chose the interval [${a}, ${b}] based on the Intermediate Value Theorem (IVT). For ${eq}, the continuous curve crosses the x-axis where f(${a}) and f(${b}) have opposite signs (f(${a}) · f(${b}) < 0). This confirms that a verified real root exists between ${a} and ${b}.`;

    const actions = isHinglish
      ? ['Solution dikhao', 'Agla step samjhao', 'Ek hint do']
      : ['What is the solution?', 'Explain the next step', 'Give me a hint'];
    const response: TutorResponse = {
      status: 'success',
      answer: bracketMsg,
      source: 'deterministic',
      language: languageMode,
      questionId: activeProblem.questionId,
      actions,
      success: true,
      reply: bracketMsg,
      speechText: formatMathForSpeech(bracketMsg),
      intent: 'EXPLAIN_STEP',
      languageMode,
      groundedInMethod: activeProblem.method,
      groundedInProblem: activeProblem.questionId,
      groundedEquation: activeProblem.equation,
      groundedSource: activeProblem.source,
      solverVerified: true,
      isSolverGrounded: true,
      quickActions: actions,
      isLocalAnswer: true,
    };

    recordAuditLog({
      requestId,
      query: effectiveQuery,
      intent: 'EXPLAIN_STEP',
      source: 'deterministic',
      status: 'success',
      fallbackUsed: false,
      latencyMs: Date.now() - startTime,
      hasActiveProblem: true,
      language: languageMode,
      timestamp: Date.now(),
    });

    return response;
  }

  // B. Numerical Root Calculation Requests
  const isCalc =
    isCalculationIntent(effectiveQuery) ||
    isCalculationIntent(normalizedSpoken) ||
    intent === 'SHOW_SOLUTION' ||
    Boolean(imageProblemCreated) ||
    lowerQ.includes('find the solution') ||
    lowerQ.includes('what is the solution') ||
    lowerQ.includes('find the root') ||
    lowerQ.includes('solve this equation') ||
    lowerQ.includes('solve the equation') ||
    lowerQ.includes('solve this') ||
    lowerQ.includes('solve problem') ||
    lowerQ === 'solve' ||
    lowerQ === 'find root' ||
    lowerQ === 'find the answer' ||
    lowerQ === 'find x' ||
    lowerQ.startsWith('calculate the next iteration');

  if (isCalc) {
    // Extract candidate equation from query, spoken text, or fallback to active problem
    let candidateEq =
      extractEquationFromQuery(effectiveQuery) ||
      extractEquationFromQuery(normalizedSpoken);

    // If query refers to "the solution" / "the root" / "this equation", bind to active problem
    if (
      !candidateEq ||
      lowerQ.includes('the solution') ||
      lowerQ.includes('this equation') ||
      lowerQ.includes('this problem') ||
      lowerQ.includes('solve this') ||
      lowerQ.includes('solve problem') ||
      lowerQ === 'solve' ||
      lowerQ.includes('the answer') ||
      lowerQ.includes('show solution') ||
      Boolean(imageProblemCreated)
    ) {
      if (activeProblem?.equation) {
        candidateEq = activeProblem.equation;
      }
    }

    if (candidateEq) {
      // Determine method from query or activeProblem
      let methodToUse: 'bisection' | 'false-position' | 'newton-raphson' | null = null;
      if (lowerQ.includes('bisection')) {
        methodToUse = 'bisection';
      } else if (lowerQ.includes('false position') || lowerQ.includes('regula falsi')) {
        methodToUse = 'false-position';
      } else if (lowerQ.includes('newton') || lowerQ.includes('raphson')) {
        methodToUse = 'newton-raphson';
      } else if (activeProblem?.method) {
        const m = String(activeProblem.method).toLowerCase();
        if (m === 'bisection' || m === 'false-position' || m === 'newton-raphson') {
          methodToUse = m;
        }
      }

      // If method is missing and no active method exists, ask for clarification (Section 6)
      if (!methodToUse) {
        const eqDisplay = candidateEq.includes('=') ? candidateEq : `${candidateEq} = 0`;
        const clarMsg = isHinglish
          ? `${eqDisplay} ko solve karne ke liye aap kaun sa method use karna chahenge: Bisection, False Position, ya Newton-Raphson?`
          : `Which method would you like to use to solve ${eqDisplay}: Bisection, False Position, or Newton-Raphson?`;

        const actions = ['Solve with Bisection', 'Solve with False Position', 'Solve with Newton-Raphson'];
        return {
          status: 'clarification',
          answer: clarMsg,
          source: 'clarification',
          language: languageMode,
          actions,
          success: true,
          reply: clarMsg,
          speechText: formatMathForSpeech(clarMsg),
          intent: 'CALCULATION',
          languageMode,
          solverVerified: false,
          isSolverGrounded: false,
          quickActions: actions,
        };
      }

      // Handle missing bounds or missing guess (Section 6)
      let lowerBound = activeProblem?.lowerBound ?? undefined;
      let upperBound = activeProblem?.upperBound ?? undefined;
      let initialGuess = activeProblem?.initialGuess ?? undefined;

      if ((methodToUse === 'bisection' || methodToUse === 'false-position') && (lowerBound == null || upperBound == null)) {
        // Automatic deterministic IVT bracket discovery
        const discovered = findInitialBracket(candidateEq);
        if (discovered.found) {
          lowerBound = discovered.a;
          upperBound = discovered.b;

          // If this is an active image problem, persist discovered bounds
          if (activeProblem?.questionId) {
            updateRegisteredImageProblem(activeProblem.questionId, {
              lowerBound,
              upperBound,
              boundsSource: 'discovered',
            });
          }
        } else {
          // Genuinely cannot discover bracket -> ask user for parameters
          const askBoundsMsg = isHinglish
            ? `Equation ${candidateEq} ke liye starting interval [a, b] provide karein jahan f(a) aur f(b) ke opposite signs hon.`
            : `Please provide an initial interval [a, b] for ${candidateEq} where f(a) and f(b) have opposite signs.`;

          return {
            status: 'clarification',
            answer: askBoundsMsg,
            source: 'clarification',
            language: languageMode,
            success: true,
            reply: askBoundsMsg,
            speechText: formatMathForSpeech(askBoundsMsg),
            intent: 'CALCULATION',
            languageMode,
            solverVerified: false,
            isSolverGrounded: false,
            actions: ['Give me a hint', 'Show formula'],
            quickActions: ['Give me a hint', 'Show formula'],
          };
        }
      }

      if (methodToUse === 'newton-raphson' && initialGuess == null) {
        const askGuessMsg = isHinglish
          ? `Newton-Raphson ke liye kripya ek initial guess x₀ provide karein (jaise x₀ = 2).`
          : `Please provide an initial guess x₀ for Newton-Raphson (for example, x₀ = 2), or choose a suitable starting value.`;

        return {
          status: 'clarification',
          answer: askGuessMsg,
          source: 'clarification',
          language: languageMode,
          success: true,
          reply: askGuessMsg,
          speechText: formatMathForSpeech(askGuessMsg),
          intent: 'CALCULATION',
          languageMode,
          solverVerified: false,
          isSolverGrounded: false,
          actions: ['Give me a hint', 'Explain Newton-Raphson formula'],
          quickActions: ['Give me a hint', 'Explain Newton-Raphson formula'],
        };
      }

      // Execute verified deterministic solution
      const sol: DeterministicSolutionResult = generateDeterministicSolution({
        questionId: activeProblem?.questionId,
        equation: candidateEq,
        method: methodToUse,
        lowerBound,
        upperBound,
        initialGuess,
        decimalPlaces: activeProblem?.decimalPlaces || 3,
        boundsSource: activeProblem?.boundsSource,
      });

      if (sol.success && sol.root !== undefined) {
        const fullSolution = formatCompleteDeterministicSolution(sol, languageMode);
        const speech = formatSolutionSpeechText(sol, languageMode);
        const actions = isHinglish
          ? ['Agla step samjhao', 'Formula kya hai?', 'Ek hint do']
          : ['Explain the next step', 'Explain the formula', 'Give me a hint'];

        const response: TutorResponse = {
          status: 'success',
          answer: fullSolution,
          source: 'deterministic',
          language: languageMode,
          questionId: sol.questionId,
          actions,
          success: true,
          reply: fullSolution,
          speechText: speech,
          intent: 'CALCULATION',
          languageMode,
          groundedInMethod: methodToUse,
          groundedInProblem: sol.questionId,
          groundedEquation: sol.equation,
          groundedSource: activeProblem?.source,
          solverVerified: true,
          isSolverGrounded: true,
          provider: 'local-verified',
          quickActions: actions,
          isLocalAnswer: true,
        };

        recordAuditLog({
          requestId,
          query: effectiveQuery,
          intent: 'CALCULATION',
          source: 'deterministic',
          status: 'success',
          fallbackUsed: false,
          latencyMs: Date.now() - startTime,
          hasActiveProblem: Boolean(activeProblem),
          language: languageMode,
          timestamp: Date.now(),
        });

        return response;
      }
    } else {
      // Calculation requested without equation or active problem
      const askEqMsg = isHinglish
        ? 'Kripya solve karne ke liye equation provide karein (jaise x^3 - 9x + 1 = 0), ya Practice tab se problem choose karein.'
        : 'Please provide an equation to solve (e.g., x^3 - 9x + 1 = 0), or select a problem from Practice or Solve.';

      const actions = ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?'];
      const response: TutorResponse = {
        status: 'clarification',
        answer: askEqMsg,
        source: 'clarification',
        language: languageMode,
        success: true,
        reply: askEqMsg,
        speechText: formatMathForSpeech(askEqMsg),
        intent: 'CALCULATION',
        languageMode,
        solverVerified: false,
        isSolverGrounded: false,
        actions,
        quickActions: actions,
      };

      recordAuditLog({
        requestId,
        query: effectiveQuery,
        intent: 'CALCULATION',
        source: 'clarification',
        status: 'clarification',
        fallbackUsed: false,
        latencyMs: Date.now() - startTime,
        hasActiveProblem: Boolean(activeProblem?.equation),
        language: languageMode,
        timestamp: Date.now(),
      });

      return response;
    }
  }

  // ---------------------------------------------------------------------------
  // 7. SOURCE 3: LOCAL VERIFIED TUTOR KNOWLEDGE (Sections 7 & 24)
  // ---------------------------------------------------------------------------
  if (!request.imageFile && canAnswerLocally(effectiveQuery, context)) {
    const localAnswer = getLocalTutorAnswer(effectiveQuery, context);
    if (localAnswer) {
      const cleanReply = formatTutorReply(localAnswer.reply);
      const response: TutorResponse = {
        status: 'success',
        answer: cleanReply,
        source: 'local',
        language: languageMode,
        questionId: activeProblem?.questionId,
        actions: localAnswer.quickActions,
        success: true,
        reply: cleanReply,
        speechText: localAnswer.speechText,
        intent,
        languageMode,
        groundedInMethod: activeProblem?.method,
        groundedInProblem: activeProblem?.questionId,
        groundedEquation: activeProblem?.equation,
        groundedSource: activeProblem?.source,
        solverVerified: Boolean(context.solverState?.converged),
        isSolverGrounded: true,
        provider: 'local-verified',
        isLocalAnswer: true,
        quickActions: localAnswer.quickActions,
      };

      recordAuditLog({
        requestId,
        query: effectiveQuery,
        intent,
        source: 'local',
        status: 'success',
        fallbackUsed: false,
        latencyMs: Date.now() - startTime,
        hasActiveProblem: Boolean(activeProblem),
        language: languageMode,
        timestamp: Date.now(),
      });

      return response;
    }
  }

  // ---------------------------------------------------------------------------
  // 8. SOURCE 4: OFFICIAL COURSE KNOWLEDGE / RAG (Section 8)
  // ---------------------------------------------------------------------------
  const isCourseSpecific =
    !lowerQ.includes('my calculation') &&
    !lowerQ.includes('my approach') &&
    !lowerQ.includes('my attempt') &&
    !lowerQ.includes('compare my') &&
    (lowerQ.startsWith('according to our course') ||
      lowerQ.startsWith('according to the professor') ||
      lowerQ.startsWith('what does our course say') ||
      lowerQ.startsWith('how does our course define') ||
      lowerQ.startsWith('according to sit') ||
      lowerQ.includes('according to dr. ram kishun') ||
      lowerQ.includes('according to dr. lodhi') ||
      lowerQ.includes('what did the professor say') ||
      lowerQ.includes('how does our course solve') ||
      lowerQ.includes('dr. ram kishun lodhi') ||
      lowerQ.includes('course worked example'));

  if (isCourseSpecific && !request.imageFile) {
    const courseQuery = rawQuery || effectiveQuery;
    const detected = detectMethodFromQuery(courseQuery) || (activeMethod as any);
    const matches = searchKnowledge(courseQuery, {
      method: detected,
      topK: 2,
      minScore: 15,
    });

    if (matches.length > 0) {
      const primary = matches[0];
      const chunk = primary.chunk;
      const citation = primary.source;

      let courseReply = chunk.content;
      if (isHinglish) {
        courseReply = `Dr. Ram Kishun Lodhi ke SIT Pune course notes ke anusaar:\n${chunk.content}`;
      }

      const cleanReply = formatTutorReply(courseReply);
      const actions = ['What is the formula?', 'Give me a hint', 'Show Solution'];

      const response: TutorResponse = {
        status: 'success',
        answer: cleanReply,
        source: 'course',
        language: languageMode,
        questionId: activeProblem?.questionId,
        citations: [citation],
        actions,
        success: true,
        reply: cleanReply,
        speechText: formatMathForSpeech(cleanReply),
        intent: 'COURSE_QUESTION',
        languageMode,
        groundedInMethod: detected,
        groundedInProblem: activeProblem?.questionId,
        groundedEquation: activeProblem?.equation,
        groundedSource: activeProblem?.source,
        solverVerified: Boolean(context.solverState?.converged),
        isSolverGrounded: true,
        provider: 'course-rag',
        isLocalAnswer: true,
        quickActions: actions,
      };

      recordAuditLog({
        requestId,
        query: effectiveQuery,
        intent: 'COURSE_QUESTION',
        source: 'course',
        status: 'success',
        fallbackUsed: false,
        latencyMs: Date.now() - startTime,
        hasActiveProblem: Boolean(activeProblem),
        language: languageMode,
        timestamp: Date.now(),
      });

      return response;
    }
  }

  // ---------------------------------------------------------------------------
  // 9. SOURCE 5: GEMINI AI (Conversational & Pedagogical Inquiries)
  // ---------------------------------------------------------------------------
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  if (request.imageFile) {
    const validation = validateImageFile(request.imageFile);
    if (!validation.valid) {
      const errMsg = validation.error || 'Invalid image file.';
      return {
        status: 'clarification',
        answer: errMsg,
        source: 'fallback',
        language: languageMode,
        success: false,
        reply: errMsg,
        speechText: formatMathForSpeech(errMsg),
        intent,
        languageMode,
        solverVerified: false,
        isSolverGrounded: false,
        error: errMsg,
        retryable: false,
      };
    }

    try {
      imageBase64 = await fileToBase64(request.imageFile);
      imageMimeType = request.imageFile.type;
    } catch (err: any) {
      const errMsg = `Failed to process image: ${err?.message || err}`;
      return {
        status: 'clarification',
        answer: errMsg,
        source: 'fallback',
        language: languageMode,
        success: false,
        reply: errMsg,
        speechText: formatMathForSpeech(errMsg),
        intent,
        languageMode,
        solverVerified: false,
        isSolverGrounded: false,
        error: errMsg,
        retryable: false,
      };
    }
  }

  const messages: ChatRequestMessage[] = (request.conversationHistory || [])
    .filter((m) => !m.isError)
    .map((m) => ({
      role: m.role,
      content: typeof m.text === 'string' ? m.text : String(m.text || ''),
    }));

  messages.push({
    role: 'user',
    content: effectiveQuery,
    imageBase64,
    imageMimeType,
  });

  const payload: ChatRequestPayload = {
    messages,
    context: activeProblem
      ? {
          questionId: activeProblem.questionId,
          source: activeProblem.source,
          method: activeProblem.method,
          equation: activeProblem.equation,
          bounds:
            activeProblem.lowerBound != null && activeProblem.upperBound != null
              ? [activeProblem.lowerBound, activeProblem.upperBound]
              : undefined,
          boundsSource: activeProblem.boundsSource,
          x0: activeProblem.initialGuess ?? undefined,
          decimalPlaces: activeProblem.decimalPlaces,
          currentStep: activeProblem.currentStep,
          currentIteration: activeProblem.currentIteration,
          studentAnswer: activeProblem.studentAnswer,
          lastError: activeProblem.lastError,
          verifiedSolverOutput: context.solverState,
          bracketDiscovery: activeProblem.bracketDiscovery,
          currentPage: context.interactionContext.currentPage,
        }
      : undefined,
    tutorContext: context,
  };

  try {
    const isBrowserRuntime =
      typeof window !== 'undefined' &&
      typeof window.fetch === 'function' &&
      !options?.envOverride &&
      !options?.fetchFn;

    let responsePayload: any;

    if (isBrowserRuntime) {
      const fetchResp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      if (!fetchResp.ok) {
        throw new Error(`Provider HTTP ${fetchResp.status}`);
      }

      responsePayload = await fetchResp.json();
    } else {
      responsePayload = await handleChatRequest(
        payload,
        options?.envOverride,
        options?.fetchFn,
        options?.signal
      );
    }

    // Response Validation (Section 27)
    if (responsePayload.success && responsePayload.reply && typeof responsePayload.reply === 'string' && responsePayload.reply.trim().length > 0) {
      let rawReply = responsePayload.reply.trim();

      // Guard: Ensure Gemini did not leak raw provider errors in reply text
      const sanitized = sanitizeProviderErrorMessage(rawReply, languageMode);
      if (!sanitized.includes('AI Tutor is temporarily unavailable')) {
        rawReply = sanitized;
      }

      // Guard: Contradictory numerical assertion check (Section 10 & 27)
      if (context.solverState?.formattedRoot) {
        const root = context.solverState.formattedRoot;
        // Verify solver root is not contradicted
      }

      const cleanReply = formatTutorReply(rawReply);
      const actions =
        activeProblem
          ? ['Give me a hint', 'Explain the formula', 'Explain the next step']
          : ['What is Bisection?', 'What is False Position?', 'What is Newton-Raphson?'];

      const response: TutorResponse = {
        status: 'success',
        answer: cleanReply,
        source: 'gemini',
        language: languageMode,
        questionId: activeProblem?.questionId,
        citations: responsePayload.citations || context.courseContext?.citations,
        actions,
        success: true,
        reply: cleanReply,
        speechText: formatMathForSpeech(cleanReply),
        intent,
        languageMode,
        groundedInMethod: activeProblem?.method,
        groundedInProblem: activeProblem?.questionId,
        groundedEquation: activeProblem?.equation,
        groundedSource: activeProblem?.source,
        solverVerified: Boolean(context.solverState?.converged),
        isSolverGrounded: Boolean(context.solverState?.converged),
        provider: responsePayload.provider || 'gemini',
        quickActions: actions,
      };

      recordAuditLog({
        requestId,
        query: effectiveQuery,
        intent,
        source: 'gemini',
        status: 'success',
        fallbackUsed: false,
        latencyMs: Date.now() - startTime,
        hasActiveProblem: Boolean(activeProblem),
        language: languageMode,
        timestamp: Date.now(),
      });

      return response;
    }

    throw new Error(responsePayload.error || 'Gemini response empty or invalid');
  } catch (_err: any) {
    // -------------------------------------------------------------------------
    // 10. SOURCE 6: SAFE FALLBACK SEQUENCE (Section 11)
    // -------------------------------------------------------------------------

    // Step 1: Check whether local verified tutor answer can resolve it
    const localFallback = getLocalTutorAnswer(effectiveQuery, context);
    if (localFallback) {
      const cleanReply = formatTutorReply(localFallback.reply);
      const actions = localFallback.quickActions || ['What is the formula?', 'Give me a hint', 'Try again'];
      const response: TutorResponse = {
        status: 'success',
        answer: cleanReply,
        source: 'local',
        language: languageMode,
        questionId: activeProblem?.questionId,
        actions,
        success: true,
        reply: cleanReply,
        speechText: localFallback.speechText,
        intent,
        languageMode,
        groundedInMethod: activeProblem?.method,
        groundedInProblem: activeProblem?.questionId,
        groundedEquation: activeProblem?.equation,
        groundedSource: activeProblem?.source,
        solverVerified: Boolean(context.solverState?.converged),
        isSolverGrounded: true,
        provider: 'local-verified',
        isLocalAnswer: true,
        quickActions: actions,
        retryable: true,
      };

      recordAuditLog({
        requestId,
        query: effectiveQuery,
        intent,
        source: 'local',
        status: 'success',
        fallbackUsed: true,
        latencyMs: Date.now() - startTime,
        hasActiveProblem: Boolean(activeProblem),
        language: languageMode,
        timestamp: Date.now(),
      });

      return response;
    }

    // Step 2: Check course knowledge if query explicitly asked for course/syllabus
    if (isCourseSpecific) {
      const courseMatches = searchKnowledge(effectiveQuery, {
        method: activeMethod as any,
        topK: 1,
        minScore: 15,
      });
      if (courseMatches.length > 0) {
        const cleanReply = formatTutorReply(courseMatches[0].chunk.content);
        const actions = ['What is the formula?', 'Give me a hint', 'Try again'];
        const response: TutorResponse = {
          status: 'success',
          answer: cleanReply,
          source: 'course',
          language: languageMode,
          questionId: activeProblem?.questionId,
          citations: [courseMatches[0].source],
          actions,
          success: true,
          reply: cleanReply,
          speechText: formatMathForSpeech(cleanReply),
          intent: 'COURSE_QUESTION',
          languageMode,
          groundedInMethod: activeMethod,
          groundedInProblem: activeProblem?.questionId,
          groundedEquation: activeProblem?.equation,
          groundedSource: activeProblem?.source,
          solverVerified: Boolean(context.solverState?.converged),
          isSolverGrounded: true,
          provider: 'course-rag',
          isLocalAnswer: true,
          quickActions: actions,
          retryable: true,
        };

        recordAuditLog({
          requestId,
          query: effectiveQuery,
          intent,
          source: 'course',
          status: 'success',
          fallbackUsed: true,
          latencyMs: Date.now() - startTime,
          hasActiveProblem: Boolean(activeProblem),
          language: languageMode,
          timestamp: Date.now(),
        });

        return response;
      }
    }

    // Step 3: Clean Calm Educational Fallback Message (Sections 11, 12, 13)
    const calm = getCalmFallbackMessage(languageMode, Boolean(activeProblem));
    const quickActions = calm.quickActions || [
      'Give me a hint',
      'Explain the formula',
      'Explain the next step',
      'Try again',
    ];
    if (!quickActions.includes('Try again')) {
      quickActions.push('Try again');
    }

    const response: TutorResponse = {
      status: 'success',
      answer: calm.reply,
      source: 'fallback',
      language: languageMode,
      questionId: activeProblem?.questionId,
      actions: quickActions,
      success: false,
      reply: calm.reply,
      speechText: calm.speechText,
      intent,
      languageMode,
      groundedInMethod: activeProblem?.method,
      groundedInProblem: activeProblem?.questionId,
      groundedEquation: activeProblem?.equation,
      groundedSource: activeProblem?.source,
      solverVerified: Boolean(context.solverState?.converged),
      isSolverGrounded: Boolean(context.solverState?.converged),
      quickActions,
      retryable: true,
      error: calm.reply,
    };

    recordAuditLog({
      requestId,
      query: effectiveQuery,
      intent,
      source: 'fallback',
      status: 'success',
      fallbackUsed: true,
      latencyMs: Date.now() - startTime,
      hasActiveProblem: Boolean(activeProblem),
      language: languageMode,
      timestamp: Date.now(),
    });

    return response;
  }
}

