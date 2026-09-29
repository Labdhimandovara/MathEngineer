import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { DemoBadge } from '../components/ui/DemoBadge.tsx';
import {
  UploadCloud,
  PenTool,
  Lightbulb,
  Eye,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Camera,
  RotateCcw,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { QuestionLaunchConfig } from '../types/index.ts';
import { ProblemImageModal } from '../components/solver/ProblemImageModal.tsx';
import {
  extractProblemFromImage,
  extractProblemFromImageLocal,
  extractProblemFromImageGemini,
  validateProblemImageFile,
} from '../services/problemImage/problemImageService.ts';
import {
  ExtractedProblem,
  SupportedMethod,
  BoundsSource,
  ImageUploadState,
} from '../services/problemImage/problemImageTypes.ts';
import {
  recordQuestionAttempt,
  recordSolveWithMeCompleted,
} from '../services/progress/progressStore.ts';
import {
  startAttempt,
  completeAttempt,
} from '../services/learning/index.ts';
import { registerImageProblem } from '../services/problem/imageProblemRegistry.ts';
import {
  setActiveProblem,
  clearActiveProblem,
  setActiveImageProblem,
  clearActiveImageProblem,
  updateActiveImageSolverResult,
  setActivePracticeProblem,
  useActiveProblem,
} from '../services/problem/activeProblemStore.ts';
import { runDeterministicSolver } from '../services/problem/deterministicSolverAdapter.ts';
import { solveBisection, BisectionResult } from '../math/bisection/index.ts';
import { solveFalsePosition, FalsePositionResult } from '../math/falsePosition/index.ts';
import { solveNewtonRaphson, NewtonRaphsonResult } from '../math/newtonRaphson/index.ts';
import { SolveWithMeBisection } from '../components/solver/SolveWithMeBisection.tsx';
import { SolveWithMeFalsePosition } from '../components/solver/SolveWithMeFalsePosition.tsx';
import { SolveWithMeNewtonRaphson } from '../components/solver/SolveWithMeNewtonRaphson.tsx';
import { ExplainedSolutionBisection } from '../components/solver/ExplainedSolutionBisection.tsx';
import { ExplainedSolutionFalsePosition } from '../components/solver/ExplainedSolutionFalsePosition.tsx';
import { ExplainedSolutionNewtonRaphson } from '../components/solver/ExplainedSolutionNewtonRaphson.tsx';
import { generateDeterministicSolution, DeterministicSolutionResult } from '../services/problem/solutionService.ts';
import { findInitialBracket } from '../math/bracketSearch/index.ts';
import { IntervalConvergenceVisualizer } from '../components/solver/IntervalConvergenceVisualizer.tsx';

interface SolveProps {
  initialAction?: 'none' | 'myself' | 'hints' | 'solution';
  initialMethod?: 'bisection' | 'false-position' | 'newton-raphson';
  questionConfig?: QuestionLaunchConfig | null;
}

export const Solve: React.FC<SolveProps> = ({
  initialAction = 'none',
  initialMethod = 'bisection',
  questionConfig = null,
}) => {
  const [activeQuestion, setActiveQuestion] = useState<QuestionLaunchConfig | null>(
    questionConfig ?? null
  );
  const [uploadState, setUploadState] = useState<ImageUploadState>('idle');
  const [extractedProblem, setExtractedProblem] = useState<ExtractedProblem | null>(null);
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | null>(null);
  const [imageExtractionError, setImageExtractionError] = useState<string | null>(null);
  const [importedImageThumbnail, setImportedImageThumbnail] = useState<string | null>(null);
  const [importedQuestionText, setImportedQuestionText] = useState<string | null>(null);
  const [importedExplanation, setImportedExplanation] = useState<string[] | null>(null);
  const [importedBoundsSource, setImportedBoundsSource] = useState<BoundsSource | null>(null);
  const imageAbortControllerRef = React.useRef<AbortController | null>(null);
  const currentUploadedFileRef = React.useRef<File | null>(null);
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);
  const isExtractingImage = uploadState === 'uploading' || uploadState === 'extracting';
  const [selectedMethod, setSelectedMethod] = useState<'bisection' | 'false-position' | 'newton-raphson'>(
    questionConfig?.method ?? initialMethod
  );
  const [customEquation, setCustomEquation] = useState<string>(
    questionConfig?.equation ??
      (initialMethod === 'false-position'
        ? 'cos(x) - x*exp(x) = 0'
        : initialMethod === 'newton-raphson'
        ? 'x^4 - x - 10 = 0'
        : 'x^3 - 9x + 1 = 0')
  );
  const [lowerBound, setLowerBound] = useState<string>(
    questionConfig
      ? String(questionConfig.lowerBound)
      : initialMethod === 'false-position'
      ? '0'
      : initialMethod === 'newton-raphson'
      ? '1'
      : '2'
  );
  const [upperBound, setUpperBound] = useState<string>(
    questionConfig
      ? String(questionConfig.upperBound)
      : initialMethod === 'false-position'
      ? '1'
      : initialMethod === 'newton-raphson'
      ? '2'
      : '3'
  );
  const [initialGuess, setInitialGuess] = useState<string>(
    questionConfig?.initialGuess !== undefined
      ? String(questionConfig.initialGuess)
      : '2'
  );
  const [decimalPlaces, setDecimalPlaces] = useState<number>(
    questionConfig?.decimalPlaces ??
      (initialMethod === 'false-position' ? 4 : initialMethod === 'newton-raphson' ? 3 : 2)
  );
  const [activeAction, setActiveAction] = useState<'none' | 'myself' | 'hints' | 'solution'>(initialAction);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAction && initialAction !== 'none') {
      setActiveAction(initialAction);
    }
  }, [initialAction]);

  const centralProblem = useActiveProblem();
  const lastLoadedQuestionIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (questionConfig) {
      if (lastLoadedQuestionIdRef.current !== questionConfig.questionId) {
        lastLoadedQuestionIdRef.current = questionConfig.questionId;
        setActiveQuestion(questionConfig);
        setSelectedMethod(questionConfig.method);
        setCustomEquation(questionConfig.equation);
        setLowerBound(String(questionConfig.lowerBound));
        setUpperBound(String(questionConfig.upperBound));
        setInitialGuess(
          questionConfig.initialGuess !== undefined
            ? String(questionConfig.initialGuess)
            : String(questionConfig.lowerBound)
        );
        setDecimalPlaces(questionConfig.decimalPlaces);
        setActiveAttemptId(null);

        setActiveProblem({
          questionId: questionConfig.questionId,
          source: questionConfig.source ?? (questionConfig.questionId.startsWith('img_') ? 'image' : 'practice'),
          equation: questionConfig.equation,
          method: questionConfig.method,
          lowerBound: questionConfig.lowerBound,
          upperBound: questionConfig.upperBound,
          initialGuess: questionConfig.initialGuess,
          decimalPlaces: questionConfig.decimalPlaces,
          title: questionConfig.title,
          boundsSource: questionConfig.boundsSource,
          rawExtractedText: questionConfig.rawExtractedText,
          imageThumbnailUrl: questionConfig.imageThumbnailUrl,
        });

        if (initialAction && initialAction !== 'none') {
          setActiveAction(initialAction);
        }
      }
    } else if (centralProblem && !activeQuestion) {
      setSelectedMethod(centralProblem.method);
      setCustomEquation(centralProblem.equation);
      if (centralProblem.lowerBound !== null && centralProblem.lowerBound !== undefined) {
        setLowerBound(String(centralProblem.lowerBound));
      }
      if (centralProblem.upperBound !== null && centralProblem.upperBound !== undefined) {
        setUpperBound(String(centralProblem.upperBound));
      }
      if (centralProblem.initialGuess !== null && centralProblem.initialGuess !== undefined) {
        setInitialGuess(String(centralProblem.initialGuess));
      }
      setDecimalPlaces(centralProblem.decimalPlaces);
      setActiveQuestion({
        questionId: centralProblem.questionId,
        method: centralProblem.method,
        equation: centralProblem.equation,
        lowerBound: centralProblem.lowerBound ?? 0,
        upperBound: centralProblem.upperBound ?? 1,
        initialGuess: centralProblem.initialGuess ?? undefined,
        decimalPlaces: centralProblem.decimalPlaces,
        title: centralProblem.title || (centralProblem.source === 'image' ? 'Image Problem' : 'Active Problem'),
        source: centralProblem.source,
        boundsSource: centralProblem.boundsSource,
        rawExtractedText: centralProblem.rawExtractedText,
        imageThumbnailUrl: centralProblem.imageThumbnailUrl,
      });
    }
  }, [questionConfig, initialAction, centralProblem]);

  // Start learning attempt when solving a practice or image question independently
  useEffect(() => {
    if (activeAction === 'myself' && activeQuestion?.questionId && !activeAttemptId) {
      const att = startAttempt({
        questionId: activeQuestion.questionId,
        method: selectedMethod,
        topic: activeQuestion.title,
        decimalPlaces,
        equation: activeQuestion.equation,
        lowerBound: activeQuestion.lowerBound,
        upperBound: activeQuestion.upperBound,
        initialGuess: activeQuestion.initialGuess,
        source: activeQuestion.source ?? (activeQuestion.questionId.startsWith('img_') ? 'image' : 'practice'),
        boundsSource: activeQuestion.boundsSource ?? importedBoundsSource ?? undefined,
        rawExtractedText: activeQuestion.rawExtractedText ?? importedQuestionText ?? undefined,
        imageThumbnailUrl: activeQuestion.imageThumbnailUrl ?? importedImageThumbnail ?? undefined,
      });
      setActiveAttemptId(att.id);
    }
  }, [activeAction, activeQuestion, selectedMethod, decimalPlaces, activeAttemptId, importedBoundsSource, importedQuestionText, importedImageThumbnail]);

  // Record attempt and update solved state when student views complete solution
  // Note: viewing solution does NOT set correct = true; solutionViewed is descriptive evidence
  useEffect(() => {
    if (activeAction === 'solution' && activeQuestion?.questionId) {
      if (activeAttemptId) {
        completeAttempt(activeAttemptId, {
          correct: false,
          solutionViewed: true,
          durationSeconds: 30,
        });
        setActiveAttemptId(null);
      } else {
        const att = startAttempt({
          questionId: activeQuestion.questionId,
          method: selectedMethod,
          topic: activeQuestion.title,
          decimalPlaces,
          equation: activeQuestion.equation,
          lowerBound: activeQuestion.lowerBound,
          upperBound: activeQuestion.upperBound,
          initialGuess: activeQuestion.initialGuess,
          source: activeQuestion.source ?? (activeQuestion.questionId.startsWith('img_') ? 'image' : 'practice'),
          boundsSource: activeQuestion.boundsSource ?? importedBoundsSource ?? undefined,
          rawExtractedText: activeQuestion.rawExtractedText ?? importedQuestionText ?? undefined,
          imageThumbnailUrl: activeQuestion.imageThumbnailUrl ?? importedImageThumbnail ?? undefined,
        });
        completeAttempt(att.id, {
          correct: false,
          solutionViewed: true,
          durationSeconds: 30,
        });
      }
    }
  }, [activeAction, activeQuestion, selectedMethod, decimalPlaces, activeAttemptId, importedBoundsSource, importedQuestionText, importedImageThumbnail]);

  useEffect(() => {
    // Only apply generic defaults if no active question
    if (!questionConfig && !activeQuestion && initialMethod) {
      setSelectedMethod(initialMethod);
      if (initialMethod === 'false-position') {
        setCustomEquation('cos(x) - x*exp(x) = 0');
        setLowerBound('0');
        setUpperBound('1');
        setDecimalPlaces(4);
      } else if (initialMethod === 'newton-raphson') {
        setCustomEquation('x^4 - x - 10 = 0');
        setLowerBound('1');
        setUpperBound('2');
        setInitialGuess('2');
        setDecimalPlaces(3);
      } else if (initialMethod === 'bisection') {
        setCustomEquation('x^3 - 9x + 1 = 0');
        setLowerBound('2');
        setUpperBound('3');
        setDecimalPlaces(2);
      }
    }
  }, [initialMethod, questionConfig, activeQuestion]);

  useEffect(() => {
    return () => {
      if (imageAbortControllerRef.current) {
        imageAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleResetProblem = () => {
    if (activeQuestion) {
      setSelectedMethod(activeQuestion.method);
      setCustomEquation(activeQuestion.equation);
      setLowerBound(String(activeQuestion.lowerBound));
      setUpperBound(String(activeQuestion.upperBound));
      setInitialGuess(
        activeQuestion.initialGuess !== undefined
          ? String(activeQuestion.initialGuess)
          : String(activeQuestion.lowerBound)
      );
      setDecimalPlaces(activeQuestion.decimalPlaces);
    } else {
      if (selectedMethod === 'false-position') {
        setCustomEquation('cos(x) - x*exp(x) = 0');
        setLowerBound('0');
        setUpperBound('1');
        setDecimalPlaces(4);
      } else if (selectedMethod === 'newton-raphson') {
        setCustomEquation('x^4 - x - 10 = 0');
        setLowerBound('1');
        setUpperBound('2');
        setInitialGuess('2');
        setDecimalPlaces(3);
      } else {
        setCustomEquation('x^3 - 9x + 1 = 0');
        setLowerBound('2');
        setUpperBound('3');
        setDecimalPlaces(2);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateProblemImageFile(file);
    if (!validation.valid) {
      setUploadState('error');
      setImageExtractionError(validation.error || 'Invalid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (imageAbortControllerRef.current) {
      imageAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    imageAbortControllerRef.current = controller;

    const previewUrl = URL.createObjectURL(file);
    currentUploadedFileRef.current = file;
    setUploadedImagePreviewUrl(previewUrl);
    setImageExtractionError(null);
    setUploadState('uploading');

    try {
      setUploadState('extracting');
      const result = await extractProblemFromImage(file, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      if (!result.success || !result.problem) {
        setUploadState('error');
        setImageExtractionError(
          result.error ||
            'We could not confidently read the equation. Please check or enter it manually.'
        );
      } else {
        setUploadState('confirmation');
        setExtractedProblem(result.problem);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setUploadState('error');
        setImageExtractionError(
          err?.message ||
            'We could not confidently read the equation. Please check or enter it manually.'
        );
      }
    } finally {
      if (imageAbortControllerRef.current === controller) {
        imageAbortControllerRef.current = null;
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTryAiExtraction = async () => {
    const file = currentUploadedFileRef.current;
    if (!file) return;

    if (imageAbortControllerRef.current) {
      imageAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    imageAbortControllerRef.current = controller;

    setIsAiExtracting(true);
    try {
      const result = await extractProblemFromImageGemini(file, controller.signal);
      if (controller.signal.aborted) return;

      if (result.success && result.problem) {
        setExtractedProblem(result.problem);
        setImageExtractionError(null);
      } else {
        setImageExtractionError(result.error || 'AI extraction could not read the image.');
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setImageExtractionError(err?.message || 'Failed to extract problem with AI.');
      }
    } finally {
      if (imageAbortControllerRef.current === controller) {
        imageAbortControllerRef.current = null;
      }
      setIsAiExtracting(false);
    }
  };

  const handleConfirmProblem = (confirmed: {
    id: string;
    equation: string;
    method: SupportedMethod;
    lowerBound: number;
    upperBound: number;
    initialGuess?: number;
    decimalPlaces: number;
    questionText: string;
    boundsSource?: BoundsSource;
    discoveredExplanation?: string[];
  }) => {
    setSelectedMethod(confirmed.method);
    setCustomEquation(confirmed.equation);
    setLowerBound(String(confirmed.lowerBound));
    setUpperBound(String(confirmed.upperBound));
    if (confirmed.initialGuess !== undefined && confirmed.initialGuess !== null) {
      setInitialGuess(String(confirmed.initialGuess));
    } else {
      setInitialGuess(String(confirmed.upperBound));
    }
    setDecimalPlaces(confirmed.decimalPlaces || 3);

    // Save image preview and extracted question text
    setImportedImageThumbnail(uploadedImagePreviewUrl);
    setImportedQuestionText(confirmed.questionText || null);
    setImportedExplanation(confirmed.discoveredExplanation || null);
    setImportedBoundsSource(confirmed.boundsSource || null);

    // Preserve exact question identity across extraction -> solver -> solution -> learning history
    const stableQuestionId =
      confirmed.id || `img_q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const imageQuestionConfig: QuestionLaunchConfig = {
      questionId: stableQuestionId,
      method: confirmed.method,
      equation: confirmed.equation,
      lowerBound: confirmed.lowerBound,
      upperBound: confirmed.upperBound,
      initialGuess: confirmed.initialGuess,
      decimalPlaces: confirmed.decimalPlaces,
      title: confirmed.questionText || `Image Problem (${confirmed.method})`,
    };

    setActiveQuestion(imageQuestionConfig);

    // Sync to activeProblemStore as the single source of truth for the assistant
    setActiveImageProblem({
      questionId: stableQuestionId,
      source: 'image',
      rawExtractedText: confirmed.questionText,
      equation: confirmed.equation,
      method: confirmed.method,
      lowerBound: confirmed.lowerBound,
      upperBound: confirmed.upperBound,
      boundsSource: confirmed.boundsSource,
      decimalPlaces: confirmed.decimalPlaces,
      initialGuess: confirmed.initialGuess,
      bracketDiscovery: confirmed.discoveredExplanation
        ? {
            a: confirmed.lowerBound,
            b: confirmed.upperBound,
            fa: parseFloat(
              confirmed.discoveredExplanation
                .find((s) => s.startsWith(`f(${confirmed.lowerBound}) = `))
                ?.split('=')[1]
                ?.trim() || '0'
            ),
            fb: parseFloat(
              confirmed.discoveredExplanation
                .find((s) => s.startsWith(`f(${confirmed.upperBound}) = `))
                ?.split('=')[1]
                ?.trim() || '0'
            ),
            explanation: confirmed.discoveredExplanation,
          }
        : undefined,
    });

    // Register image problem in persistent registry for review and replay
    registerImageProblem({
      questionId: stableQuestionId,
      source: 'image',
      method: confirmed.method,
      equation: confirmed.equation,
      lowerBound: confirmed.lowerBound,
      upperBound: confirmed.upperBound,
      boundsSource: confirmed.boundsSource,
      initialGuess: confirmed.initialGuess,
      decimalPlaces: confirmed.decimalPlaces,
      rawExtractedText: confirmed.questionText,
      imageThumbnailUrl: uploadedImagePreviewUrl || undefined,
      discoveredExplanation: confirmed.discoveredExplanation,
    });

    // Close modal and set active action to 'myself'
    setUploadState('success');
    setExtractedProblem(null);
    setImageExtractionError(null);
    setActiveAction('myself');
  };

  const handleCancelExtraction = () => {
    if (imageAbortControllerRef.current) {
      imageAbortControllerRef.current.abort();
      imageAbortControllerRef.current = null;
    }
    setUploadState('idle');
    setExtractedProblem(null);
    setImageExtractionError(null);
    if (activeQuestion?.questionId.startsWith('img_q_')) {
      clearActiveImageProblem();
    }
  };

  const handleTryAnother = () => {
    if (imageAbortControllerRef.current) {
      imageAbortControllerRef.current.abort();
      imageAbortControllerRef.current = null;
    }
    setUploadState('selecting');
    setExtractedProblem(null);
    setImageExtractionError(null);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleClearImported = () => {
    setImportedImageThumbnail(null);
    setImportedQuestionText(null);
    setImportedExplanation(null);
    setImportedBoundsSource(null);
    setUploadedImagePreviewUrl(null);
    setUploadState('idle');
    clearActiveImageProblem();
    if (activeQuestion?.questionId.startsWith('img_q_')) {
      setActiveQuestion(null);
    }
  };

  const handleSolveComplete = (
    method: 'bisection' | 'false-position' | 'newton-raphson',
    stats: { hintsUsed: number; stepsCompleted: number }
  ) => {
    recordSolveWithMeCompleted(method);
    if (activeQuestion?.questionId) {
      if (activeAttemptId) {
        completeAttempt(activeAttemptId, {
          correct: true,
          hintsUsed: stats.hintsUsed,
          mistakeCategories: [],
          durationSeconds: 60,
        });
        setActiveAttemptId(null);
      } else {
        const att = startAttempt({
          questionId: activeQuestion.questionId,
          method,
          topic: activeQuestion.title,
          decimalPlaces,
          equation: activeQuestion.equation,
          lowerBound: activeQuestion.lowerBound,
          upperBound: activeQuestion.upperBound,
          initialGuess: activeQuestion.initialGuess,
          source: activeQuestion.source ?? (activeQuestion.questionId.startsWith('img_') ? 'image' : 'practice'),
          boundsSource: activeQuestion.boundsSource ?? importedBoundsSource ?? undefined,
          rawExtractedText: activeQuestion.rawExtractedText ?? importedQuestionText ?? undefined,
          imageThumbnailUrl: activeQuestion.imageThumbnailUrl ?? importedImageThumbnail ?? undefined,
        });
        completeAttempt(att.id, {
          correct: true,
          hintsUsed: stats.hintsUsed,
          mistakeCategories: [],
          durationSeconds: 60,
        });
      }
    }
  };

  const methodDetails = {
    'bisection': {
      name: 'Bisection Method',
      tag: 'Numerical Techniques' as const,
      isAvailable: true,
    },
    'false-position': {
      name: 'False Position Method',
      tag: 'Numerical Techniques' as const,
      isAvailable: true,
    },
    'newton-raphson': {
      name: 'Newton-Raphson Method',
      tag: 'Numerical Techniques' as const,
      isAvailable: true,
    },
  };

  const current = methodDetails[selectedMethod];

  // Run the canonical deterministic solution engine
  const deterministicSolution: DeterministicSolutionResult = useMemo(() => {
    const numLower = lowerBound.trim() ? parseFloat(lowerBound) : undefined;
    const numUpper = upperBound.trim() ? parseFloat(upperBound) : undefined;
    const numGuess = initialGuess.trim() ? parseFloat(initialGuess) : undefined;

    return generateDeterministicSolution({
      questionId: activeQuestion?.questionId,
      equation: customEquation,
      method: selectedMethod,
      lowerBound: isNaN(numLower as any) ? undefined : numLower,
      upperBound: isNaN(numUpper as any) ? undefined : numUpper,
      initialGuess: isNaN(numGuess as any) ? undefined : numGuess,
      decimalPlaces,
      boundsSource: (importedBoundsSource || activeQuestion?.boundsSource) as BoundsSource,
    });
  }, [
    activeQuestion?.questionId,
    activeQuestion?.boundsSource,
    importedBoundsSource,
    customEquation,
    selectedMethod,
    lowerBound,
    upperBound,
    initialGuess,
    decimalPlaces,
  ]);

  const bisectionResult = deterministicSolution.rawBisectionResult || null;
  const falsePositionResult = deterministicSolution.rawFalsePositionResult || null;
  const newtonResult = deterministicSolution.rawNewtonResult || null;

  const activeEngineResult =
    selectedMethod === 'bisection'
      ? bisectionResult
      : selectedMethod === 'false-position'
      ? falsePositionResult
      : newtonResult;

  // Auto-populate input bounds when bracket discovery succeeds on empty bounds
  useEffect(() => {
    if (deterministicSolution.bracketDiscovery && (!lowerBound.trim() || !upperBound.trim())) {
      setLowerBound(String(deterministicSolution.bracketDiscovery.a));
      setUpperBound(String(deterministicSolution.bracketDiscovery.b));
      setImportedBoundsSource('discovered');
    }
  }, [deterministicSolution.bracketDiscovery]);

  // Sync user-edited parameters to activeProblemStore immediately (Section 6)
  useEffect(() => {
    const qId = activeQuestion?.questionId || `solve-${selectedMethod}-${Date.now()}`;
    const numLower = lowerBound.trim()
      ? parseFloat(lowerBound)
      : (deterministicSolution.bracketDiscovery?.a ?? undefined);
    const numUpper = upperBound.trim()
      ? parseFloat(upperBound)
      : (deterministicSolution.bracketDiscovery?.b ?? undefined);
    const numGuess = initialGuess.trim() ? parseFloat(initialGuess) : undefined;

    setActiveProblem({
      questionId: qId,
      source: activeQuestion?.source || (qId.startsWith('img_') ? 'image' : qId.startsWith('pq-') ? 'practice' : 'solve-manual'),
      title: activeQuestion?.title || `${current.name} Problem`,
      equation: customEquation,
      method: selectedMethod,
      lowerBound: isNaN(numLower as any) ? undefined : numLower,
      upperBound: isNaN(numUpper as any) ? undefined : numUpper,
      initialGuess: isNaN(numGuess as any) ? undefined : numGuess,
      decimalPlaces,
      boundsSource: (importedBoundsSource || activeQuestion?.boundsSource || (deterministicSolution.bracketDiscovery ? 'discovered' : 'given')) as BoundsSource,
      verifiedSolverOutput: deterministicSolution.success ? {
        converged: deterministicSolution.convergence,
        root: deterministicSolution.root,
        formattedRoot: deterministicSolution.formattedRoot,
        iterationsCount: deterministicSolution.iterationsCount,
        iterationsSummary: deterministicSolution.iterationsSummary,
        stoppingReason: deterministicSolution.stoppingReason,
        bracketDiscovery: deterministicSolution.bracketDiscovery,
      } : undefined,
    });
  }, [
    customEquation,
    selectedMethod,
    lowerBound,
    upperBound,
    initialGuess,
    decimalPlaces,
    deterministicSolution.success,
    deterministicSolution.root,
    deterministicSolution.convergence,
    deterministicSolution.iterationsCount,
  ]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Method Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-soft dark:border-border-dark">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-muted dark:text-charcoal-subtle uppercase tracking-wider font-semibold">
              Numerical Techniques
            </span>
            <span className="text-xs text-charcoal-muted dark:text-charcoal-subtle">•</span>
            <Badge variant="cream">{current.tag}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal dark:text-charcoal-light font-sans">
            Problem Solver Workspace
          </h1>
        </div>

        {/* Method Switcher Dropdown */}
        <div className="relative">
          <label htmlFor="method-select" className="sr-only">Select Method</label>
          <div className="relative inline-block w-full sm:w-auto">
            <select
              id="method-select"
              value={selectedMethod}
              onChange={(e) => {
                const nextMethod = e.target.value as 'bisection' | 'false-position' | 'newton-raphson';
                setSelectedMethod(nextMethod);
                setActiveAction('none');
                if (activeQuestion && activeQuestion.method !== nextMethod) {
                  setActiveQuestion(null);
                  clearActiveProblem();
                }
                if (nextMethod === 'false-position') {
                  setCustomEquation('cos(x) - x*exp(x) = 0');
                  setLowerBound('0');
                  setUpperBound('1');
                  setDecimalPlaces(4);
                } else if (nextMethod === 'newton-raphson') {
                  setCustomEquation('x^4 - x - 10 = 0');
                  setLowerBound('1');
                  setUpperBound('2');
                  setInitialGuess('2');
                  setDecimalPlaces(3);
                } else if (nextMethod === 'bisection') {
                  setCustomEquation('x^3 - 9x + 1 = 0');
                  setLowerBound('2');
                  setUpperBound('3');
                  setDecimalPlaces(2);
                }
              }}
              className="appearance-none bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark text-charcoal dark:text-charcoal-light text-sm font-medium py-2 pl-3.5 pr-9 rounded-me shadow-subtle hover:border-lavender-dusty focus-ring cursor-pointer transition-calm"
            >
              <option value="bisection">Bisection Method (Active)</option>
              <option value="false-position">False Position Method (Active)</option>
              <option value="newton-raphson">Newton-Raphson Method (Active)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-charcoal-muted dark:text-charcoal-subtle absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Practice Question Mode Banner */}
      {activeQuestion && (
        <div className="bg-lavender-light dark:bg-[#1E1430] border border-lavender-dusty/80 dark:border-[#4B3B6E] rounded-me p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn shadow-subtle">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="lavender">Practice Question</Badge>
            <span className="font-semibold text-charcoal dark:text-[#F3F0FA] text-sm">
              {activeQuestion.title || activeQuestion.questionId}
            </span>
            <span className="font-mono text-charcoal-muted dark:text-[#B0A7C2] text-[11px] bg-bg-surface dark:bg-[#251A38] px-2 py-0.5 rounded border border-border-soft dark:border-[#382952]">
              {activeQuestion.questionId}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetProblem}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>Reset Problem</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveQuestion(null);
                clearActiveProblem();
              }}
              className="text-xs text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA]"
            >
              <span>Exit Practice Mode</span>
            </Button>
          </div>
        </div>
      )}

      {/* Problem Definition Card */}
      <Card variant="surface" className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-charcoal tracking-wide uppercase">
            Problem Definition
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetProblem}
              className="text-xs text-charcoal-muted hover:text-charcoal"
              title={activeQuestion ? 'Reset to practice question values' : 'Reset to default method values'}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
            <DemoBadge label="Deterministic Engine Active" />
          </div>
        </div>

        {/* Problem text input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-charcoal-muted block">
            Equation f(x) = 0
          </label>
          <div className="relative">
            <input
              type="text"
              value={customEquation}
              onChange={(e) => setCustomEquation(e.target.value)}
              placeholder="e.g. x^3 - 9x + 1 = 0"
              className="w-full bg-bg-primary/60 dark:bg-bg-darkDeep/80 border border-border-soft dark:border-border-dark rounded-me px-4 py-3 text-sm text-charcoal dark:text-charcoal-light placeholder:text-charcoal-subtle focus-ring transition-calm font-mono"
            />
          </div>
        </div>

        {/* Interval bounds and precision configuration */}
        <div className={`grid grid-cols-1 ${selectedMethod === 'newton-raphson' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 pt-1`}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle block">
              Lower Bound (a)
            </label>
            <input
              type="number"
              step="any"
              value={lowerBound}
              onChange={(e) => setLowerBound(e.target.value)}
              className="w-full bg-bg-primary/60 dark:bg-bg-darkDeep/80 border border-border-soft dark:border-border-dark rounded-me px-3 py-2 text-sm text-charcoal dark:text-charcoal-light focus-ring transition-calm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle block">
              Upper Bound (b)
            </label>
            <input
              type="number"
              step="any"
              value={upperBound}
              onChange={(e) => setUpperBound(e.target.value)}
              className="w-full bg-bg-primary/60 dark:bg-bg-darkDeep/80 border border-border-soft dark:border-border-dark rounded-me px-3 py-2 text-sm text-charcoal dark:text-charcoal-light focus-ring transition-calm font-mono"
            />
          </div>

          {selectedMethod === 'newton-raphson' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle block">
                Initial Guess (x₀)
              </label>
              <input
                type="number"
                step="any"
                value={initialGuess}
                onChange={(e) => setInitialGuess(e.target.value)}
                className="w-full bg-bg-primary/60 dark:bg-bg-darkDeep/80 border border-border-soft dark:border-border-dark rounded-me px-3 py-2 text-sm text-charcoal dark:text-charcoal-light focus-ring transition-calm font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle block">
              Decimal Places
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(Math.max(1, parseInt(e.target.value) || 2))}
              className="w-full bg-bg-primary/60 dark:bg-bg-darkDeep/80 border border-border-soft dark:border-border-dark rounded-me px-3 py-2 text-sm text-charcoal dark:text-charcoal-light focus-ring transition-calm font-mono"
            />
          </div>
        </div>

        {/* Deterministic interval discovery helper for Bisection and False Position */}
        {(selectedMethod === 'bisection' || selectedMethod === 'false-position') && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-bg-surface border border-border-soft rounded-me text-xs">
            <span className="text-[11px] text-charcoal-muted">
              Need starting bounds? Let the deterministic IVT engine search for a sign-changing bracket [a, b].
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const bracket = findInitialBracket(customEquation);
                if (bracket.found) {
                  setLowerBound(String(bracket.a));
                  setUpperBound(String(bracket.b));
                  setImportedBoundsSource('discovered');
                }
              }}
              className="text-xs shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-lavender-deep" />
              <span>Find Valid Interval</span>
            </Button>
          </div>
        )}

        {/* Real photo upload trigger card */}
        <div className="space-y-3">
          <div className="border border-dashed border-border-soft rounded-me p-4 bg-bg-cream/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-me bg-bg-surface border border-border-soft flex items-center justify-center text-charcoal-muted shrink-0">
                {isExtractingImage ? (
                  <Loader2 className="w-4 h-4 text-lavender-deep animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4 text-lavender-deep" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-charcoal flex items-center gap-1.5 justify-center sm:justify-start">
                  <span>Upload Question Photo / Handwritten Problem</span>
                  {isExtractingImage && (
                    <span className="text-[11px] text-lavender-deep font-normal animate-pulse">
                      (Reading with Gemini Vision...)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-charcoal-muted">
                  {isExtractingImage
                    ? 'Extracting equation, method, bounds, and decimal places. Please wait a moment...'
                    : 'Select an exam problem or textbook image (JPG, PNG, WEBP) to import into the solver.'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                disabled={isExtractingImage}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingImage}
                className="text-xs"
              >
                {isExtractingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Select Photo</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Extraction Error Alert */}
          {imageExtractionError && (
            <div className="p-3 bg-status-danger-bg/50 border border-status-danger/30 rounded-me flex items-start justify-between gap-2 text-xs text-status-danger animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Problem Extraction Notice</span>
                  <p className="leading-relaxed mt-0.5">{imageExtractionError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImageExtractionError(null)}
                className="text-charcoal-muted hover:text-charcoal p-1 transition-calm"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Imported Image Reference Banner */}
          {importedImageThumbnail && (
            <div className="p-3 bg-lavender-mist/30 border border-lavender-deep/20 rounded-me flex items-center justify-between gap-3 text-xs animate-fadeIn">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={importedImageThumbnail}
                  alt="Imported reference"
                  className="w-10 h-10 object-cover rounded border border-border-soft shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-charcoal">Imported from photo</span>
                    <Badge variant="lavender" size="sm">
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      Active Problem
                    </Badge>
                  </div>
                  {importedQuestionText && (
                    <p className="text-[11px] text-charcoal-muted truncate max-w-sm sm:max-w-md mt-0.5">
                      "{importedQuestionText}"
                    </p>
                  )}
                  {importedBoundsSource === 'discovered' && (
                    <span className="text-[10px] text-status-success font-medium block mt-0.5">
                      Starting interval [{lowerBound}, {upperBound}] discovered via deterministic IVT bracket search.
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearImported}
                className="text-[11px] text-charcoal-muted hover:text-charcoal shrink-0"
              >
                Clear reference
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Active Question Display Card */}
      <Card variant="cream" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-lavender-deep dark:text-lavender-accent uppercase tracking-wider">
            {activeQuestion ? `Practice Problem • ${activeQuestion.questionId}` : 'Active Problem'}
          </span>
          <Badge variant="lavender">{current.name}</Badge>
        </div>

        <div className="space-y-2">
          <div className="font-serif text-lg sm:text-xl text-charcoal dark:text-charcoal-light leading-relaxed">
            Solve the equation{' '}
            <span className="font-mono text-base px-2 py-0.5 bg-bg-surface dark:bg-bg-darkDeep rounded border border-border-soft/70 dark:border-border-dark/70 text-charcoal dark:text-charcoal-light">
              {customEquation}
            </span>{' '}
            {selectedMethod === 'newton-raphson' ? (
              <>
                for the root starting near <span className="font-mono font-semibold">x₀ = {initialGuess}</span> (interval [{lowerBound}, {upperBound}]). Answer correct to {decimalPlaces} decimal places.
              </>
            ) : (
              <>
                for the root lying between {lowerBound} and {upperBound}. Answer correct to {decimalPlaces} decimal places.
              </>
            )}
          </div>
          <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle">
            {activeQuestion
              ? `${activeQuestion.title || 'Practice Question'} • Numerical Techniques`
              : 'Numerical Techniques • Course Example Problem'}
          </p>
        </div>
      </Card>

      {/* Real Numerical Interval Convergence Visualizer (Section 16) */}
      {deterministicSolution.success && deterministicSolution.root !== undefined && (
        <IntervalConvergenceVisualizer
          method={selectedMethod}
          lowerBound={lowerBound.trim() ? parseFloat(lowerBound) : undefined}
          upperBound={upperBound.trim() ? parseFloat(upperBound) : undefined}
          initialGuess={initialGuess.trim() ? parseFloat(initialGuess) : undefined}
          root={deterministicSolution.root}
          converged={deterministicSolution.convergence}
          decimalPlaces={decimalPlaces}
          iterationsCount={deterministicSolution.iterationsCount}
          stoppingReason={deterministicSolution.stoppingReason}
        />
      )}

      {/* Core Learning Philosophy Action Choice */}
      <section className="space-y-4 pt-2">
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-base font-semibold text-charcoal dark:text-charcoal-light font-sans">
            How do you want to proceed?
          </h2>
          <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle">
            MathEngineer encourages attempting solutions independently before checking hints.
          </p>
        </div>

        {/* 3 Actions with "Try it myself" prominent */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action 1: Try it myself (Primary & Prominent) */}
          <button
            onClick={() => setActiveAction('myself')}
            className={`p-5 rounded-me-lg border text-left transition-calm relative flex flex-col justify-between h-full space-y-3 btn-press ${
              activeAction === 'myself'
                ? 'bg-lavender-deep dark:bg-lavender-deep text-white border-lavender-deep shadow-card'
                : 'bg-bg-surface dark:bg-bg-darkSurface border-lavender-dusty/80 dark:border-border-dark hover:border-lavender-deep dark:hover:border-lavender-accent shadow-subtle'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div
                  className={`w-8 h-8 rounded-me flex items-center justify-center ${
                    activeAction === 'myself'
                      ? 'bg-white/20 text-white'
                      : 'bg-lavender-light dark:bg-bg-darkAccent text-lavender-deep dark:text-lavender-accent'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded ${
                    activeAction === 'myself'
                      ? 'bg-white/25 text-white'
                      : 'bg-lavender-light dark:bg-bg-darkAccent text-lavender-deep dark:text-lavender-soft'
                  }`}
                >
                  Recommended
                </span>
              </div>
              <h3
                className={`text-base font-semibold font-sans ${
                  activeAction === 'myself' ? 'text-white' : 'text-charcoal dark:text-charcoal-light'
                }`}
              >
                Try it myself
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  activeAction === 'myself' ? 'text-white/80' : 'text-charcoal-muted dark:text-charcoal-subtle'
                }`}
              >
                {selectedMethod === 'false-position'
                  ? 'Step-by-step calculation with False Position chord formula verification.'
                  : selectedMethod === 'newton-raphson'
                  ? 'Step-by-step tangent line iterations with derivative verification.'
                  : 'Step-by-step independent calculation with midpoint verification.'}
              </p>
            </div>
            <div
              className={`text-xs font-medium pt-1 ${
                activeAction === 'myself' ? 'text-white' : 'text-lavender-deep dark:text-lavender-accent'
              }`}
            >
              Start self-attempt →
            </div>
          </button>

          {/* Action 2: Give me hints */}
          <button
            onClick={() => setActiveAction('hints')}
            className={`p-5 rounded-me-lg border text-left transition-calm relative flex flex-col justify-between h-full space-y-3 btn-press ${
              activeAction === 'hints'
                ? 'bg-lavender-light dark:bg-bg-darkCard border-lavender-dusty dark:border-border-dark text-charcoal dark:text-charcoal-light'
                : 'bg-bg-surface dark:bg-bg-darkSurface border-border-soft dark:border-border-dark hover:border-lavender-soft dark:hover:border-lavender-accent text-charcoal dark:text-charcoal-light'
            }`}
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-me bg-bg-cream dark:bg-bg-darkCard flex items-center justify-center text-status-warning">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-charcoal dark:text-charcoal-light font-sans">
                Give me hints
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
                Receive tiered conceptual guidance without revealing the answer.
              </p>
            </div>
            <div className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle pt-1">
              Inspect hints →
            </div>
          </button>

          {/* Action 3: Show solution */}
          <button
            onClick={() => setActiveAction('solution')}
            className={`p-5 rounded-me-lg border text-left transition-calm relative flex flex-col justify-between h-full space-y-3 btn-press ${
              activeAction === 'solution'
                ? 'bg-bg-neutral dark:bg-bg-darkCard border-border-soft dark:border-border-dark text-charcoal dark:text-charcoal-light'
                : 'bg-bg-surface dark:bg-bg-darkSurface border-border-soft/70 dark:border-border-dark/70 hover:border-border-soft text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light'
            }`}
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-me bg-bg-neutral dark:bg-bg-darkCard flex items-center justify-center text-charcoal-muted dark:text-charcoal-subtle">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-charcoal dark:text-charcoal-light font-sans">
                Show solution
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
                Review complete educational explanation and iteration table.
              </p>
            </div>
            <div className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle pt-1">
              Inspect solution →
            </div>
          </button>
        </div>
      </section>

      {/* Visual Workspace Canvas */}
      <Card variant="flat" className="space-y-4 border border-border-soft dark:border-border-dark">
        <div className="flex items-center justify-between text-xs text-charcoal-muted">
          <span>Solving Workspace Area</span>
          <DemoBadge label="Deterministic Engine" />
        </div>

        {activeAction === 'none' && (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-medium text-charcoal">
              Select an action above to initialize your workspace
            </p>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              You can attempt the calculation yourself, inspect hints, or view the complete deterministic step-by-step explained solution.
            </p>
          </div>
        )}

        {/* Action: Try it myself */}
        {activeAction === 'myself' && selectedMethod === 'bisection' && bisectionResult && (
          <SolveWithMeBisection
            bisectionResult={bisectionResult}
            problemExpression={customEquation}
            onShowSolution={() => setActiveAction('solution')}
            onComplete={(stats) => handleSolveComplete('bisection', stats)}
          />
        )}

        {activeAction === 'myself' && selectedMethod === 'false-position' && falsePositionResult && (
          <SolveWithMeFalsePosition
            falsePositionResult={falsePositionResult}
            problemExpression={customEquation}
            onShowSolution={() => setActiveAction('solution')}
            onComplete={(stats) => handleSolveComplete('false-position', stats)}
          />
        )}

        {activeAction === 'myself' && selectedMethod === 'newton-raphson' && newtonResult && (
          <SolveWithMeNewtonRaphson
            newtonResult={newtonResult}
            problemExpression={customEquation}
            onShowSolution={() => setActiveAction('solution')}
            onComplete={(stats) => handleSolveComplete('newton-raphson', stats)}
          />
        )}

        {/* Action: Give me hints */}
        {activeAction === 'hints' && (
          <div className="p-4 bg-bg-cream/40 rounded-me border border-border-soft space-y-3 text-xs animate-fadeIn">
            <span className="font-semibold text-charcoal">Progressive Hint Guidance:</span>
            <p className="text-charcoal-muted leading-relaxed">
              {selectedMethod === 'newton-raphson'
                ? 'Newton-Raphson uses 3-level hints: 1. Tangent Concept → 2. Derivative & Substitution → 3. Direct Formula Step. Click "Try it myself" below to experience step-by-step guidance.'
                : selectedMethod === 'false-position'
                ? 'False Position uses 3-level hints: 1. Chord Concept → 2. Secant Intercept Formula → 3. Interval Replacement Rule. Click "Try it myself" below to start.'
                : 'Bisection uses 3-level hints: 1. Bisection Concept → 2. Midpoint & Substitution → 3. Sign Selection Rule. Click "Try it myself" below to start.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveAction('myself')}
              className="text-xs"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Launch Solve With Me for {current.name}</span>
            </Button>
          </div>
        )}

        {/* Action: Show solution */}
        {activeAction === 'solution' && selectedMethod === 'bisection' && bisectionResult && (
          <ExplainedSolutionBisection
            bisectionResult={bisectionResult}
            problemExpression={customEquation}
            decimalPlaces={decimalPlaces}
          />
        )}

        {activeAction === 'solution' && selectedMethod === 'false-position' && falsePositionResult && (
          <ExplainedSolutionFalsePosition
            falsePositionResult={falsePositionResult}
            problemExpression={customEquation}
            decimalPlaces={decimalPlaces}
          />
        )}

        {activeAction === 'solution' && selectedMethod === 'newton-raphson' && newtonResult && (
          <ExplainedSolutionNewtonRaphson
            newtonResult={newtonResult}
            problemExpression={customEquation}
            decimalPlaces={decimalPlaces}
          />
        )}

        {/* Fallback if solver parameters are invalid */}
        {(activeAction === 'myself' || activeAction === 'solution') && !activeEngineResult && (
          <div className="p-4 bg-status-danger-bg/40 border border-status-danger/30 rounded-me text-xs text-status-danger flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {deterministicSolution.error ||
                'Could not solve with the current equation and parameters. Please verify that the equation is valid, interval bounds are defined with a < b, and values are numerical.'}
            </span>
          </div>
        )}
      </Card>

      {/* Problem Image Confirmation & Editing Modal */}
      {extractedProblem && (
        <ProblemImageModal
          isOpen={true}
          problem={extractedProblem}
          imagePreviewUrl={uploadedImagePreviewUrl || undefined}
          isAiExtracting={isAiExtracting}
          onTryAiExtraction={handleTryAiExtraction}
          onConfirm={handleConfirmProblem}
          onCancel={handleCancelExtraction}
          onTryAnother={handleTryAnother}
        />
      )}
    </div>
  );
};

