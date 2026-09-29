import React, { useState, useMemo, useEffect } from 'react';
import { PageId, QuestionLaunchConfig } from '../types/index.ts';
import { useLearningAttempts, recordSolutionView } from '../services/learning/index.ts';
import { useAssessmentHistory } from '../services/assessment/index.ts';
import { detectWeakTopics } from '../services/adaptive/index.ts';
import {
  getGroupedReviewQuestions,
  filterAndSortReviewQuestions,
} from '../services/review/reviewService.ts';
import {
  GroupedReviewQuestion,
  ReviewFilterStatus,
  ReviewFilterMethod,
  ReviewFilterSource,
  ReviewSortOption,
} from '../services/review/reviewTypes.ts';
import {
  setActiveReviewProblem,
  clearActiveReviewProblem,
  setActiveProblem,
} from '../services/problem/activeProblemStore.ts';
import { findInitialBracket } from '../math/bracketSearch/index.ts';
import { getImageProblem, updateRegisteredImageProblem } from '../services/problem/imageProblemRegistry.ts';
import { ReviewQuestionCard } from '../components/review/ReviewQuestionCard.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import {
  History,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface ReviewProps {
  onNavigate: (
    page: PageId,
    options?: {
      method?: string;
      action?: 'none' | 'myself' | 'hints' | 'solution';
      questionConfig?: QuestionLaunchConfig;
    }
  ) => void;
  initialQuestionId?: string;
  initialFilter?: ReviewFilterStatus;
}

export const Review: React.FC<ReviewProps> = ({
  onNavigate,
  initialQuestionId,
  initialFilter = 'all',
}) => {
  const attempts = useLearningAttempts();
  const assessments = useAssessmentHistory();
  const weakTopics = detectWeakTopics(attempts, assessments);

  const [statusFilter, setStatusFilter] = useState<ReviewFilterStatus>(initialFilter);
  const [methodFilter, setMethodFilter] = useState<ReviewFilterMethod>('all');
  const [sourceFilter, setSourceFilter] = useState<ReviewFilterSource>('all');
  const [sortOption, setSortOption] = useState<ReviewSortOption>('recent');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuestionId || '');

  // 1. Group attempts deterministically by exact questionId
  const groupedQuestions = useMemo(() => {
    return getGroupedReviewQuestions(attempts);
  }, [attempts]);

  // 2. Filter & sort grouped questions locally
  const filteredQuestions = useMemo(() => {
    return filterAndSortReviewQuestions(groupedQuestions, {
      status: statusFilter,
      method: methodFilter,
      source: sourceFilter,
      sort: sortOption,
      search: searchQuery,
    });
  }, [groupedQuestions, statusFilter, methodFilter, sourceFilter, sortOption, searchQuery]);

  // Clear active review problem on unmount
  useEffect(() => {
    return () => {
      clearActiveReviewProblem();
    };
  }, []);

  // Sync initial question to activeReviewProblem if supplied
  useEffect(() => {
    if (initialQuestionId) {
      const match = groupedQuestions.find((q) => q.questionId === initialQuestionId);
      if (match) {
        const method = match.method === 'mixed' ? 'bisection' : match.method;
        setActiveReviewProblem({
          questionId: match.questionId,
          source: match.source as any,
          rawExtractedText: match.rawExtractedText,
          equation: match.equation,
          method: method as any,
          lowerBound: match.lowerBound,
          upperBound: match.upperBound,
          boundsSource: match.boundsSource,
          decimalPlaces: match.decimalPlaces,
          initialGuess: match.initialGuess,
        });
      }
    }
  }, [initialQuestionId, groupedQuestions]);

  // Summary statistics
  const totalQuestions = groupedQuestions.length;
  const needsReviewCount = groupedQuestions.filter((q) => q.needsReview).length;
  const solvedCount = groupedQuestions.filter((q) => q.hasCorrectAttempt).length;

  const handleTryAgain = (question: GroupedReviewQuestion) => {
    const launchMethod =
      question.method === 'mixed' ? 'bisection' : (question.method as 'bisection' | 'false-position' | 'newton-raphson');

    let aVal = question.lowerBound;
    let bVal = question.upperBound;
    let bSource = question.boundsSource;

    if (
      (aVal === null || aVal === undefined || bVal === null || bVal === undefined) &&
      (launchMethod === 'bisection' || launchMethod === 'false-position') &&
      question.equation
    ) {
      // Check if bracket was discovered in image registry or discover it deterministically
      const reg = question.questionId.startsWith('img_') ? getImageProblem(question.questionId) : null;
      if (reg && reg.lowerBound !== null && reg.upperBound !== null) {
        aVal = reg.lowerBound;
        bVal = reg.upperBound;
        bSource = reg.boundsSource || 'discovered';
      } else {
        const bracket = findInitialBracket(question.equation, { method: launchMethod });
        if (bracket.found) {
          aVal = bracket.a;
          bVal = bracket.b;
          bSource = 'discovered';
          if (question.questionId.startsWith('img_')) {
            updateRegisteredImageProblem(question.questionId, {
              lowerBound: aVal,
              upperBound: bVal,
              boundsSource: 'discovered',
              discoveredExplanation: bracket.explanation,
            });
          }
        }
      }
    }

    const config: QuestionLaunchConfig = {
      questionId: question.questionId,
      method: launchMethod,
      equation: question.equation,
      lowerBound: aVal !== null && aVal !== undefined ? aVal : 0,
      upperBound: bVal !== null && bVal !== undefined ? bVal : 1,
      initialGuess: question.initialGuess !== null && question.initialGuess !== undefined ? question.initialGuess : undefined,
      decimalPlaces: question.decimalPlaces,
      title: question.title,
      source: question.source,
      boundsSource: bSource,
      rawExtractedText: question.rawExtractedText,
      imageThumbnailUrl: question.imageThumbnailUrl,
    };

    setActiveProblem({
      questionId: question.questionId,
      source: question.source ?? (question.questionId.startsWith('img_') ? 'image' : 'practice'),
      equation: question.equation,
      method: launchMethod,
      lowerBound: config.lowerBound,
      upperBound: config.upperBound,
      initialGuess: config.initialGuess,
      decimalPlaces: question.decimalPlaces,
      title: question.title,
      boundsSource: bSource,
      rawExtractedText: question.rawExtractedText,
      imageThumbnailUrl: question.imageThumbnailUrl,
    });

    onNavigate('solve', {
      action: 'myself',
      method: launchMethod,
      questionConfig: config,
    });
  };

  const handleSolutionViewed = (attemptId: string) => {
    recordSolutionView(attemptId);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <section className="space-y-2 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cream">Revision & Reinforcement</Badge>
            {totalQuestions > 0 && (
              <Badge variant="neutral">
                {totalQuestions} problem{totalQuestions === 1 ? '' : 's'} attempted
              </Badge>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA] mt-2">
            Review Solved Questions
          </h1>
          <p className="text-charcoal-muted dark:text-[#B0A7C2] text-base max-w-2xl leading-relaxed">
            Revisit past problems, examine step-by-step solutions, reflect on diagnosed mistakes, and reinforce your numerical foundations.
          </p>
        </div>

        {totalQuestions > 0 && (
          <div className="flex items-center gap-2 bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] p-1.5 rounded-me text-xs text-charcoal-muted dark:text-[#B0A7C2] self-start sm:self-center shrink-0">
            <span className="px-2 py-0.5 font-medium text-charcoal dark:text-[#F3F0FA]">
              {solvedCount} Solved
            </span>
            <span>•</span>
            <span className={`px-2 py-0.5 rounded font-medium ${needsReviewCount > 0 ? 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'text-charcoal-muted dark:text-[#B0A7C2]'}`}>
              {needsReviewCount} Needs Review
            </span>
          </div>
        )}
      </section>

      {/* Empty State when student has no attempts */}
      {totalQuestions === 0 ? (
        <Card variant="surface" className="p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto border-border-soft">
          <div className="w-12 h-12 rounded-full bg-lavender-light flex items-center justify-center mx-auto text-lavender-deep">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-charcoal">
              No Question Attempts Yet
            </h3>
            <p className="text-sm text-charcoal-muted max-w-md mx-auto leading-relaxed">
              Your reviewed questions will appear here after you solve a problem in Practice, Solve, or through an image question.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('practice')}
              className="inline-flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Start Practice</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Recommended to Review (Phase 11) */}
          {(needsReviewCount > 0 || weakTopics.length > 0) && (
            <Card variant="cream" className="p-4 sm:p-5 border-2 border-lavender-dusty/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-lavender-deep" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-lavender-deep">
                      Recommended To Review
                    </span>
                    <Badge variant="cream">Diagnostic Recommendation</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-charcoal">
                    {weakTopics.length > 0
                      ? `Focus Review: ${weakTopics[0].topic}`
                      : `${needsReviewCount} question(s) flagged for concept reinforcement`}
                  </h3>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {weakTopics.length > 0
                      ? weakTopics[0].reasons[0]
                      : 'Recent problem attempts show recurring calculation errors or failed convergence. Review the step-by-step solutions below.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('needs-review');
                      if (weakTopics.length > 0) {
                        setMethodFilter(weakTopics[0].method);
                      }
                    }}
                    className="text-xs text-charcoal-muted hover:text-charcoal"
                  >
                    Filter Focus Questions
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Controls Bar: Filters, Method, Source, Search, Sort */}
          <Card variant="surface" className="p-4 space-y-4 border-border-soft">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft/60 dark:border-[#382952] pb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'needs-review', label: 'Needs Review' },
                    { id: 'incorrect', label: 'Incorrect' },
                    { id: 'correct', label: 'Correct' },
                    { id: 'recent', label: 'Recently Attempted' },
                  ] as { id: ReviewFilterStatus; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`btn-press px-3 py-1.5 rounded-me text-xs font-medium transition-calm ${
                      statusFilter === tab.id
                        ? 'bg-lavender-light dark:bg-[#34244E] text-charcoal dark:text-[#F3F0FA] shadow-subtle'
                        : 'text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA] hover:bg-bg-neutral dark:hover:bg-[#251A38]'
                    }`}
                  >
                    {tab.label}
                    {tab.id === 'needs-review' && needsReviewCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 font-bold">
                        {needsReviewCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-charcoal-muted dark:text-[#B0A7C2]">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as ReviewSortOption)}
                  className="bg-bg-primary dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] rounded-me px-2.5 py-1 text-xs text-charcoal dark:text-[#F3F0FA] focus:outline-none focus:ring-1 focus:ring-lavender-dusty"
                >
                  <option value="recent">Most Recently Attempted</option>
                  <option value="attempts">Most Attempts</option>
                  <option value="needs-review">Needs Review First</option>
                </select>
              </div>
            </div>

            {/* Second Row: Method, Source, and Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Method Filter */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-muted dark:text-[#B0A7C2] mb-1">
                  Method
                </label>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value as ReviewFilterMethod)}
                  className="w-full bg-bg-primary dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] rounded-me px-2.5 py-1.5 text-xs text-charcoal dark:text-[#F3F0FA] focus:outline-none focus:ring-1 focus:ring-lavender-dusty"
                >
                  <option value="all">All Numerical Methods</option>
                  <option value="bisection">Bisection Method</option>
                  <option value="false-position">False Position Method</option>
                  <option value="newton-raphson">Newton-Raphson Method</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-muted dark:text-[#B0A7C2] mb-1">
                  Question Source
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as ReviewFilterSource)}
                  className="w-full bg-bg-primary dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] rounded-me px-2.5 py-1.5 text-xs text-charcoal dark:text-[#F3F0FA] focus:outline-none focus:ring-1 focus:ring-lavender-dusty"
                >
                  <option value="all">All Sources</option>
                  <option value="practice">Practice Question Bank</option>
                  <option value="image">Uploaded Image Questions</option>
                </select>
              </div>

              {/* Local Search Input */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-muted dark:text-[#B0A7C2] mb-1">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search equation, title, ID..."
                    className="w-full bg-bg-primary dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] rounded-me pl-8 pr-3 py-1.5 text-xs text-charcoal dark:text-[#F3F0FA] placeholder:text-charcoal-muted/60 dark:placeholder:text-[#B0A7C2]/50 focus:outline-none focus:ring-1 focus:ring-lavender-dusty"
                  />
                  <Search className="w-3.5 h-3.5 text-charcoal-muted dark:text-[#B0A7C2] absolute left-2.5 top-2.5" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-[10px] text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Questions List */}
          {filteredQuestions.length === 0 ? (
            <Card variant="surface" className="p-8 text-center space-y-3 border-border-soft">
              <p className="text-sm text-charcoal-muted">
                No reviewed questions match your current filter criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setMethodFilter('all');
                  setSourceFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs"
              >
                Reset All Filters
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q) => (
                <ReviewQuestionCard
                  key={q.questionId}
                  question={q}
                  onTryAgain={handleTryAgain}
                  onSolutionViewed={handleSolutionViewed}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
