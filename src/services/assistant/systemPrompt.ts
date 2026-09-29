/**
 * Authoritative System Instructions for MathEngineer Conversational Tutor
 * 
 * Sourced from course guidelines and Dr. Ram Kishun Lodhi's materials (SIT Pune).
 */

import { AssistantSolverContext } from './types.ts';

export function formatMethodName(method?: string): string {
  if (!method) return 'Numerical Techniques';
  const m = method.toLowerCase();
  if (m === 'false-position' || m === 'false position' || m === 'regula-falsi' || m === 'regula falsi') {
    return 'False Position';
  }
  if (m === 'bisection') return 'Bisection';
  if (m === 'newton-raphson' || m === 'newton raphson') return 'Newton-Raphson';
  return method;
}

export function buildSystemPrompt(context?: AssistantSolverContext): string {
  let contextBlock = '';
  if (context) {
    const parts: string[] = [];
    if (context.source === 'image') {
      parts.push(`Active Problem Source: Uploaded Image Question (High Priority Context)`);
    } else if (context.source === 'practice') {
      parts.push(`Active Problem Source: Practice Question Bank`);
    }

    if (context.questionId) {
      if (context.source === 'image') {
        parts.push(`Active Image Question ID: ${context.questionId}`);
      } else {
        parts.push(`Active Practice Question ID: ${context.questionId}`);
      }
    }
    if (context.rawExtractedText) parts.push(`Original Problem Text: ${context.rawExtractedText}`);
    if (context.method) parts.push(`Active Method: ${formatMethodName(context.method)}`);
    if (context.equation) parts.push(`Active Equation: ${context.equation}`);
    if (context.bounds) parts.push(`Active Interval: [${context.bounds[0]}, ${context.bounds[1]}]`);
    if (context.boundsSource) parts.push(`Interval Source: ${context.boundsSource}`);
    if (context.x0 !== undefined) parts.push(`Initial Guess x₀: ${context.x0}`);
    if (context.decimalPlaces !== undefined) parts.push(`Target Accuracy: ${context.decimalPlaces} decimal places`);
    if (context.currentStep) parts.push(`Current Student Step: ${context.currentStep}`);
    if (context.currentIteration !== undefined) parts.push(`Current Iteration: ${context.currentIteration}`);
    if (context.studentAnswer !== undefined) parts.push(`Student's Current Answer: ${context.studentAnswer}`);
    if (context.lastError) parts.push(`Student's Last Error / Mistake: ${context.lastError}`);
    if (context.currentLessonSection) parts.push(`Current Lesson Section: ${context.currentLessonSection}`);
    if (context.currentPage) parts.push(`Current Page: ${context.currentPage}`);

    if (parts.length > 0) {
      contextBlock = `\n\nCURRENT APPLICATION & SOLVER CONTEXT:\n` + parts.map((p) => `- ${p}`).join('\n');
    }

    if (context.bracketDiscovery) {
      const disc = context.bracketDiscovery;
      const steps = disc.explanation && disc.explanation.length > 0
        ? disc.explanation.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')
        : `  - f(${disc.a}) = ${disc.fa}\n  - f(${disc.b}) = ${disc.fb}\n  - Signs are opposite, therefore [${disc.a}, ${disc.b}] is a valid starting interval.`;

      contextBlock += `\n\nINTERVAL DISCOVERY (INTERMEDIATE VALUE THEOREM):\n${steps}`;
    }

    if (context.verifiedSolverOutput && context.verifiedSolverOutput.converged) {
      contextBlock += `\n\n============================================================\nVERIFIED DETERMINISTIC SOLVER DATA (SOURCE OF NUMERICAL TRUTH):\n============================================================\nEquation: ${context.equation}\nMethod: ${formatMethodName(context.method)}\n${context.bounds ? `Initial Interval: [${context.bounds[0]}, ${context.bounds[1]}]\n` : ''}${context.x0 !== undefined ? `Initial Guess x₀: ${context.x0}\n` : ''}Target Accuracy: ${context.decimalPlaces ?? 3} decimal places\n\nVerified Solver Iterations:\n${context.verifiedSolverOutput.iterationsSummary}\n\nFinal Verified Result:\nRoot: ${context.verifiedSolverOutput.formattedRoot || context.verifiedSolverOutput.root} (correct to ${context.decimalPlaces ?? 3} decimal places)\nIterations count: ${context.verifiedSolverOutput.iterationsCount}\n\nSTRICT INSTRUCTION FOR THE ASSISTANT:\nExplain this problem step by step using the verified deterministic solver data above.\nDO NOT recalculate or invent different iteration numbers or different formulas.\nUse the exact trial values and iteration values provided above.`;
    }
  }

  return `You are MathEngineer's intelligent mathematics tutor, embedded in an undergraduate engineering learning application.
Your role is to guide students patiently, explain mathematical concepts, clarify steps, diagnose mistakes, and unpack formulas in undergraduate numerical methods.

COURSE SOURCE AUTHORITY:
You are grounded in the university course "Numerical Techniques" (Unit: Numerical solution of algebraic and transcendental equations) taught by Dr. Ram Kishun Lodhi at Symbiosis Institute of Technology (SIT), Pune.

COURSE PRINCIPLES:
1. Root of an Equation: A number α is a root of f(x) = 0 if f(α) = 0.
2. Continuity & Sign Change: If f(x) is continuous on [a, b] and f(a) · f(b) < 0, at least one real root lies in (a, b).
3. Bisection Method:
   - Repeatedly halves the interval trapping the root: x_(n+1) = (a_n + b_n) / 2.
   - Retains the half-interval that preserves opposite signs.
   - Stopping rule: interval endpoints and midpoint agree to requested decimal places.
4. False Position Method (Regula Falsi):
   - Replaces the curve over [a, b] with the chord line joining (a, f(a)) and (b, f(b)).
   - Formula: x = [a · f(b) - b · f(a)] / [f(b) - f(a)].
   - Interval rule: If f(x) has the same sign as f(a), replace a with x. If it has the same sign as f(b), replace b with x.
   - Stopping rule: successive approximations agree to requested decimal places.
5. Newton-Raphson Method (Tangent Method):
   - Tangent line to y = f(x) at (x_n, f(x_n)): y - f(x_n) = f'(x_n) · (x - x_n).
   - Formula: x_(n+1) = x_n - f(x_n) / f'(x_n).
   - Initial guess rule: When [a, b] is given with opposite signs, select x₀ where |f(x₀)| = min(|f(a)|, |f(b)|).
   - Stopping rule: consecutive approximations agree to requested decimal places.

NON-NEGOTIABLE TUTOR RULES:
- THE DETERMINISTIC SOLVER IS THE SINGLE SOURCE OF NUMERICAL TRUTH:
  When solver values are present in the context, refer to those exact numbers. Never fabricate competing iteration numbers, and never contradict the verified calculations.
- EXPLAIN RATHER THAN MERELY PROVIDING ANSWERS:
  Help the student understand *why* an endpoint is replaced, *why* the derivative is in the denominator, or *why* a particular formula is used.
- EDUCATIONAL FORMATTING & PRESENTATION:
  * HUMAN-READABLE OUTPUT: Write natural, educational prose that reads like a clean textbook or teacher explanation.
  * NO ASTERISK BOLDING: Do NOT use markdown bold asterisks (avoid **text**). Use plain text or clear phrasing for emphasis.
  * NO RAW JSON: Do NOT output raw JSON, escaped JSON, or internal key-value schemas.
  * NO INTERNAL METADATA LABELS: Never output internal tags such as NOT_SPECIFIED_BY_COURSE, chunk IDs, or database keys. If something is not in the course notes, simply state: "The official course notes do not specify this."
  * STRUCTURE: Use short readable paragraphs (2-3 sentences), numbered steps (1., 2., 3.) for procedures, and readable mathematical notation (e.g. f(x) = x^4 - 32).${contextBlock}`;
}

/**
 * Post-processes model responses to guarantee clean, human-readable educational text:
 * - Strips **bold markdown**
 * - Eliminates raw JSON blocks
 * - Eliminates internal metadata labels like NOT_SPECIFIED_BY_COURSE
 */
export function formatEducationalReply(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Remove raw JSON blocks if the model enclosed response in ```json ... ```
  if (cleaned.includes('```json')) {
    cleaned = cleaned.replace(/```json\s*([\s\S]*?)\s*```/g, (_match, group) => {
      try {
        const parsed = JSON.parse(group);
        if (typeof parsed.reply === 'string') return parsed.reply;
        if (typeof parsed.explanation === 'string') return parsed.explanation;
        if (typeof parsed.message === 'string') return parsed.message;
        if (typeof parsed.content === 'string') return parsed.content;
      } catch {
        // Not parseable JSON
      }
      return group;
    });
  }

  // 2. Remove remaining code fences around plain JSON
  if (cleaned.trim().startsWith('{') && cleaned.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned.trim());
      if (typeof parsed.reply === 'string') cleaned = parsed.reply;
      else if (typeof parsed.explanation === 'string') cleaned = parsed.explanation;
      else if (typeof parsed.message === 'string') cleaned = parsed.message;
    } catch {
      // ignore
    }
  }

  // 3. Remove markdown bold asterisks (**bold** -> bold)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

  // 4. Clean internal metadata labels
  cleaned = cleaned.replace(/\bNOT_SPECIFIED_BY_COURSE\b/g, 'The official course notes do not specify this.');

  return cleaned.trim();
}

/**
 * Builds a course-grounded system instruction incorporating retrieved course excerpts
 */
export function buildGroundedSystemPrompt(
  context?: AssistantSolverContext,
  groundedChunks?: { chunk: any; source: string; confidence: string }[]
): string {
  const basePrompt = buildSystemPrompt(context);

  if (!groundedChunks || groundedChunks.length === 0) {
    return basePrompt;
  }

  const excerpts = groundedChunks
    .map(
      (m, idx) =>
        `### Excerpt ${idx + 1} ${m.source}:\n` +
        `Topic: ${m.chunk.topic} | Section: ${m.chunk.section}\n` +
        `${m.chunk.content}\n`
    )
    .join('\n\n');

  return `${basePrompt}

============================================================
OFFICIAL COURSE MATERIAL GROUNDING (AUTHORITATIVE):
============================================================
You are answering a student using the supplied official MathEngineer course material from Dr. Ram Kishun Lodhi (Department of Applied Science, Symbiosis Institute of Technology Pune).

STRICT GROUNDING RULES:
1. Use the supplied course context as the primary source of truth for course-specific claims.
2. Do NOT invent or fabricate course-specific rules.
3. If the supplied material does NOT answer the question or states "NOT_SPECIFIED_BY_COURSE" (such as handling f'(x) = 0 or quadratic convergence proofs), explicitly say:
   "The official course notes do not specify this."
   Then you may provide general mathematical context while clearly stating it is general mathematical knowledge beyond the course notes.
4. You may explain the supplied material clearly, but do not silently replace its conventions with a different textbook convention.
5. When citing course material, reference the source citation provided (e.g., "According to the course notes (Unit-I, Page X)...").

OFFICIAL COURSE EXCERPTS:
${excerpts}`;
}

