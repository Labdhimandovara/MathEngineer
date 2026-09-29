/**
 * Review & Reinforcement Service for MathEngineer (Phase 9)
 * 
 * Provides deterministic grouping, filtering, sorting, and mistake advice
 * based exclusively on existing LearningAttempt history and problem registries.
 * Guarantees zero external API / AI quota usage.
 */

import { LearningAttempt, MistakeCategory } from '../../types/learning.ts';
import { GroupedReviewQuestion, ReviewFilterStatus, ReviewFilterMethod, ReviewFilterSource, ReviewSortOption, MistakeAdviceEntry } from './reviewTypes.ts';
import { getImageProblem } from '../problem/imageProblemRegistry.ts';
import { PRACTICE_QUESTIONS } from '../../data/practiceQuestions.ts';
import { detectWeakTopics } from '../learning/learningAnalytics.ts';

/**
 * Returns human-readable label for a diagnosed mistake category
 */
export function formatMistakeLabel(category: MistakeCategory): string {
  switch (category) {
    case 'wrong-bracket':
      return 'Bracketing Sign Error';
    case 'wrong-formula':
      return 'Formula Substitution Error';
    case 'wrong-function-evaluation':
      return 'Function Evaluation Error';
    case 'wrong-interval-selection':
      return 'Interval Selection Error';
    case 'arithmetic-error':
      return 'Arithmetic Error';
    case 'rounding-error':
      return 'Rounding Precision Error';
    case 'wrong-initial-guess':
      return 'Initial Guess Error';
    case 'derivative-error':
      return 'Derivative Calculation Error';
    case 'stopping-condition-error':
      return 'Stopping Condition Error';
    case 'unknown':
    default:
      return 'Mistake type was not determined.';
  }
}

/**
 * Returns deterministic "How to approach it next time" advice for a mistake category.
 * If unclassified or unknown, returns "Mistake type was not determined."
 */
export function getMistakeAdvice(category: MistakeCategory): string {
  switch (category) {
    case 'wrong-bracket':
      return 'Ensure f(a) and f(b) have opposite signs (f(a) · f(b) < 0) before beginning iterations. This guarantees a root is bracketed by the Intermediate Value Theorem.';
    case 'wrong-formula':
      return 'Review the exact iteration formula: Bisection uses c = (a+b)/2, False Position uses c = (a·f(b) - b·f(a))/(f(b) - f(a)), and Newton-Raphson uses xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ).';
    case 'wrong-function-evaluation':
      return 'Carefully evaluate signs and powers in f(x). Check operator precedence and parenthesize negative numbers carefully.';
    case 'wrong-interval-selection':
      return 'Update the subinterval by checking sign agreement: if f(a) · f(c) < 0, the root lies in [a, c]; otherwise if f(c) · f(b) < 0, the root lies in [c, b].';
    case 'arithmetic-error':
      return 'Double check intermediate calculation steps. Write down intermediate numerators and denominators separately.';
    case 'rounding-error':
      return 'Keep full calculator precision in memory during intermediate steps, and round only when writing the final answer to the required decimal places.';
    case 'wrong-initial-guess':
      return 'Choose an initial guess x₀ close to the root where the derivative f\'(x₀) ≠ 0 to prevent division by zero or divergence.';
    case 'derivative-error':
      return 'Carefully apply differentiation rules (power, product, chain rule) when computing f\'(x). Verify f\'(x) before substituting.';
    case 'stopping-condition-error':
      return 'Verify the tolerance or decimal match criterion (|xₙ₊₁ - xₙ| < ε) carefully before concluding iterations.';
    case 'unknown':
    default:
      return 'Mistake type was not determined.';
  }
}

/**
 * Deterministically aggregates raw learning attempts into grouped review questions.
 * Groups by exact questionId and preserves complete attempt histories.
 */
export function getGroupedReviewQuestions(attempts: LearningAttempt[]): GroupedReviewQuestion[] {
  if (!attempts || attempts.length === 0) {
    return [];
  }

  // Pre-calculate weak topics to support conservative "Needs Review" determination
  const weakTopics = detectWeakTopics(attempts);
  const weakTopicKeys = new Set(weakTopics.map((w) => `${w.method}:${w.topic}`));

  // Group attempts by exact questionId
  const byQuestionId = new Map<string, LearningAttempt[]>();
  for (const att of attempts) {
    const list = byQuestionId.get(att.questionId) || [];
    list.push(att);
    byQuestionId.set(att.questionId, list);
  }

  const results: GroupedReviewQuestion[] = [];

  for (const [questionId, qAttempts] of byQuestionId.entries()) {
    // Sort attempts newest first
    const sorted = [...qAttempts].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime() ||
        b.attemptNumber - a.attemptNumber
    );
    const latest = sorted[0];

    // Attempt statistics
    const completed = sorted.filter((a) => a.status === 'completed');
    const hasCorrectAttempt = completed.some((a) => a.correct === true);
    const latestIsCorrect = latest.status === 'completed' && latest.correct === true;
    const solutionViewed = sorted.some((a) => a.solutionViewed === true);
    const totalHintsUsed = sorted.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);

    // Collect distinct mistakes across all attempts
    const mistakeSet = new Set<MistakeCategory>();
    const mistakeCounts: Record<string, number> = {};
    for (const a of sorted) {
      for (const m of a.mistakeCategories || []) {
        mistakeSet.add(m);
        mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
      }
    }
    const mistakes = Array.from(mistakeSet);
    const hasRecurringMistake = Object.values(mistakeCounts).some((cnt) => cnt >= 2);

    // Build mistake advice entries
    const mistakeAdvice: MistakeAdviceEntry[] = mistakes.map((cat) => ({
      category: cat,
      categoryLabel: formatMistakeLabel(cat),
      advice: getMistakeAdvice(cat),
    }));

    // Conservative "Needs Review" determination:
    // 1. Latest completed attempt was incorrect, OR
    // 2. 2+ attempts without any correct completion, OR
    // 3. Recurring mistake category across attempts, OR
    // 4. Method/topic is flagged as weak topic and latest attempt is not correct
    const isWeakTopic = weakTopicKeys.has(`${latest.method}:${latest.topic}`);
    const needsReview =
      (latest.status === 'completed' && latest.correct === false) ||
      (!hasCorrectAttempt && completed.length >= 2) ||
      hasRecurringMistake ||
      (isWeakTopic && !latestIsCorrect);

    // Resolve question parameters from attempt replay fields, image registry, or practice bank
    const registeredImage = questionId.startsWith('img_') ? getImageProblem(questionId) : null;
    const practiceQuestion = questionId.startsWith('pq-')
      ? PRACTICE_QUESTIONS.find((q) => q.id === questionId)
      : null;

    const source: 'practice' | 'assessment' | 'image' | 'review' | 'solve-manual' =
      latest.source ||
      (registeredImage
        ? 'image'
        : practiceQuestion
        ? 'practice'
        : questionId.startsWith('img_')
        ? 'image'
        : 'solve-manual');

    const title =
      practiceQuestion?.title ||
      registeredImage?.rawExtractedText ||
      latest.rawExtractedText ||
      latest.topic ||
      `Problem ${questionId}`;

    const equation =
      latest.equation ||
      registeredImage?.equation ||
      practiceQuestion?.equation ||
      '';

    const equationDisplay =
      practiceQuestion?.equationDisplay ||
      (equation ? (equation.includes('=') ? equation : `${equation} = 0`) : '');

    const lowerBound =
      latest.lowerBound !== undefined && latest.lowerBound !== null
        ? latest.lowerBound
        : registeredImage?.lowerBound !== undefined && registeredImage?.lowerBound !== null
        ? registeredImage.lowerBound
        : practiceQuestion
        ? practiceQuestion.bounds[0]
        : null;

    const upperBound =
      latest.upperBound !== undefined && latest.upperBound !== null
        ? latest.upperBound
        : registeredImage?.upperBound !== undefined && registeredImage?.upperBound !== null
        ? registeredImage.upperBound
        : practiceQuestion
        ? practiceQuestion.bounds[1]
        : null;

    const boundsSource =
      latest.boundsSource ||
      registeredImage?.boundsSource ||
      (practiceQuestion ? 'supplied' : undefined);

    const initialGuess =
      latest.initialGuess !== undefined && latest.initialGuess !== null
        ? latest.initialGuess
        : registeredImage?.initialGuess !== undefined && registeredImage?.initialGuess !== null
        ? registeredImage.initialGuess
        : practiceQuestion?.x0;

    const decimalPlaces =
      latest.decimalPlaces ||
      registeredImage?.decimalPlaces ||
      practiceQuestion?.decimalPlaces ||
      3;

    const rawExtractedText =
      latest.rawExtractedText ||
      registeredImage?.rawExtractedText ||
      practiceQuestion?.description;

    const imageThumbnailUrl =
      latest.imageThumbnailUrl ||
      registeredImage?.imageThumbnailUrl;

    results.push({
      questionId,
      title,
      equation,
      equationDisplay,
      method: latest.method,
      source,
      lowerBound,
      upperBound,
      boundsSource,
      initialGuess,
      decimalPlaces,
      rawExtractedText,
      imageThumbnailUrl,
      totalAttempts: sorted.length,
      latestAttempt: latest,
      allAttempts: sorted,
      hasCorrectAttempt,
      latestIsCorrect,
      needsReview,
      solutionViewed,
      totalHintsUsed,
      lastAttemptedAt: latest.startedAt,
      mistakes,
      mistakeAdvice,
    });
  }

  return results;
}

/**
 * Filters and sorts grouped review questions deterministically.
 */
export function filterAndSortReviewQuestions(
  questions: GroupedReviewQuestion[],
  options: {
    status?: ReviewFilterStatus;
    method?: ReviewFilterMethod;
    source?: ReviewFilterSource;
    sort?: ReviewSortOption;
    search?: string;
  }
): GroupedReviewQuestion[] {
  const {
    status = 'all',
    method = 'all',
    source = 'all',
    sort = 'recent',
    search = '',
  } = options;

  let filtered = [...questions];

  // 1. Status Filter
  if (status === 'incorrect') {
    filtered = filtered.filter((q) => !q.latestIsCorrect);
  } else if (status === 'correct') {
    filtered = filtered.filter((q) => q.latestIsCorrect || q.hasCorrectAttempt);
  } else if (status === 'needs-review') {
    filtered = filtered.filter((q) => q.needsReview);
  } else if (status === 'recent') {
    // Recently attempted within last 7 days (or all if empty)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((q) => new Date(q.lastAttemptedAt).getTime() >= sevenDaysAgo);
  }

  // 2. Method Filter
  if (method !== 'all') {
    filtered = filtered.filter((q) => q.method === method);
  }

  // 3. Source Filter
  if (source !== 'all') {
    filtered = filtered.filter((q) => q.source === source);
  }

  // 4. Text Search Filter (local, deterministic)
  const trimmed = search.trim().toLowerCase();
  if (trimmed) {
    filtered = filtered.filter((q) => {
      const matchTitle = q.title.toLowerCase().includes(trimmed);
      const matchEq = q.equation.toLowerCase().includes(trimmed);
      const matchMethod = q.method.toLowerCase().includes(trimmed);
      const matchId = q.questionId.toLowerCase().includes(trimmed);
      const matchRaw = q.rawExtractedText ? q.rawExtractedText.toLowerCase().includes(trimmed) : false;
      return matchTitle || matchEq || matchMethod || matchId || matchRaw;
    });
  }

  // 5. Deterministic Sorting
  filtered.sort((a, b) => {
    if (sort === 'attempts') {
      if (b.totalAttempts !== a.totalAttempts) {
        return b.totalAttempts - a.totalAttempts;
      }
      return new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime();
    }

    if (sort === 'needs-review') {
      if (a.needsReview !== b.needsReview) {
        return a.needsReview ? -1 : 1;
      }
      return new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime();
    }

    // Default 'recent': newest attempted first
    return new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime();
  });

  return filtered;
}
