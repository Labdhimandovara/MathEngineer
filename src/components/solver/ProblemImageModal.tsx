import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  ExtractedProblem,
  SupportedMethod,
  BoundsSource,
} from '../../services/problemImage/problemImageTypes.ts';
import { validateExtractedProblem } from '../../services/problemImage/problemImageValidation.ts';
import { findInitialBracket } from '../../math/bracketSearch/index.ts';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  X,
  FileCheck,
  ChevronDown,
  Sparkles,
  Compass,
  Loader2,
} from 'lucide-react';

interface ProblemImageModalProps {
  isOpen: boolean;
  problem: ExtractedProblem;
  imagePreviewUrl?: string;
  isAiExtracting?: boolean;
  onTryAiExtraction?: () => void;
  onConfirm: (confirmed: {
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
    extractionSource?: 'local-ocr' | 'gemini-fallback';
  }) => void;
  onCancel: () => void;
  onTryAnother: () => void;
}

export const ProblemImageModal: React.FC<ProblemImageModalProps> = ({
  isOpen,
  problem,
  imagePreviewUrl,
  isAiExtracting = false,
  onTryAiExtraction,
  onConfirm,
  onCancel,
  onTryAnother,
}) => {
  const [questionText, setQuestionText] = useState(problem.questionText || '');
  const [equation, setEquation] = useState(problem.equation || '');
  const [method, setMethod] = useState<SupportedMethod | ''>(
    problem.method || 'bisection'
  );
  const [lowerBound, setLowerBound] = useState<string>(
    problem.lowerBound != null ? String(problem.lowerBound) : ''
  );
  const [upperBound, setUpperBound] = useState<string>(
    problem.upperBound != null ? String(problem.upperBound) : ''
  );
  const [initialGuess, setInitialGuess] = useState<string>(
    problem.initialGuess != null
      ? String(problem.initialGuess)
      : problem.upperBound != null
      ? String(problem.upperBound)
      : ''
  );
  const [decimalPlaces, setDecimalPlaces] = useState<number>(
    problem.decimalPlaces != null ? problem.decimalPlaces : 3
  );

  const [boundsSource, setBoundsSource] = useState<BoundsSource>(
    problem.boundsSource ||
      (problem.lowerBound != null && problem.upperBound != null ? 'supplied' : 'missing')
  );
  const [discoveredExplanation, setDiscoveredExplanation] = useState<string[] | null>(
    problem.discoveredExplanation || null
  );
  const [bracketSearchError, setBracketSearchError] = useState<string | null>(null);

  // Sync when problem prop changes
  useEffect(() => {
    setQuestionText(problem.questionText || '');
    setEquation(problem.equation || '');
    setMethod(problem.method || 'bisection');
    setLowerBound(problem.lowerBound != null ? String(problem.lowerBound) : '');
    setUpperBound(problem.upperBound != null ? String(problem.upperBound) : '');
    setInitialGuess(
      problem.initialGuess != null
        ? String(problem.initialGuess)
        : problem.upperBound != null
        ? String(problem.upperBound)
        : ''
    );
    setDecimalPlaces(problem.decimalPlaces != null ? problem.decimalPlaces : 3);
    setBoundsSource(
      problem.boundsSource ||
        (problem.lowerBound != null && problem.upperBound != null ? 'supplied' : 'missing')
    );
    setDiscoveredExplanation(problem.discoveredExplanation || null);
    setBracketSearchError(null);
  }, [problem]);

  if (!isOpen) return null;

  const parsedLower = parseFloat(lowerBound);
  const parsedUpper = parseFloat(upperBound);
  const parsedGuess = parseFloat(initialGuess);

  // Validation run
  const validation = validateExtractedProblem(
    {
      equation,
      lowerBound: isNaN(parsedLower) ? undefined : parsedLower,
      upperBound: isNaN(parsedUpper) ? undefined : parsedUpper,
      initialGuess: isNaN(parsedGuess) ? undefined : parsedGuess,
      decimalPlaces,
    },
    (method as SupportedMethod) || null
  );

  const handleFindInterval = () => {
    setBracketSearchError(null);
    const searchRes = findInitialBracket(equation);
    if (searchRes.found) {
      setLowerBound(String(searchRes.a));
      setUpperBound(String(searchRes.b));
      setBoundsSource('discovered');
      setDiscoveredExplanation(searchRes.explanation);
      setBracketSearchError(null);
    } else {
      setBracketSearchError(searchRes.reason);
      setDiscoveredExplanation(null);
    }
  };

  const handleUseProblem = () => {
    if (!validation.isValid || !method) return;

    const stableId =
      problem.id || `img_q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    onConfirm({
      id: stableId,
      equation: equation.trim(),
      method: method as SupportedMethod,
      lowerBound: parsedLower,
      upperBound: parsedUpper,
      initialGuess: method === 'newton-raphson' ? parsedGuess : undefined,
      decimalPlaces,
      questionText: questionText.trim(),
      boundsSource,
      discoveredExplanation: discoveredExplanation || undefined,
      extractionSource: problem.extractionSource || 'local-ocr',
    });
  };

  const isIntervalMethod = method === 'bisection' || method === 'false-position';
  const hasMissingBounds = isIntervalMethod && (lowerBound === '' || upperBound === '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="problem-detected-title"
      className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-bg-surface border border-border-soft rounded-me-lg shadow-2xl max-w-xl w-full p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-soft">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-me bg-lavender-light text-lavender-deep flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="problem-detected-title"
                  className="text-base font-semibold text-charcoal"
                >
                  Problem Detected
                </h2>
                {/* Source indication: Extracted locally vs AI-assisted extraction */}
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                    problem.extractionSource === 'gemini-fallback'
                      ? 'bg-lavender-light text-lavender-deep border border-lavender-dusty'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {problem.extractionSource === 'gemini-fallback'
                    ? 'AI-assisted extraction'
                    : 'Extracted locally'}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                    problem.confidenceLabel === 'High'
                      ? 'bg-status-success-bg text-status-success border border-status-success/30'
                      : problem.confidenceLabel === 'Medium'
                      ? 'bg-status-warning-bg text-status-warning border border-status-warning/30'
                      : 'bg-status-error-bg text-status-error border border-status-error/30'
                  }`}
                >
                  Confidence: {problem.confidenceLabel}
                </span>
                {boundsSource === 'supplied' && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-lavender-light text-lavender-deep border border-lavender-dusty">
                    Bounds: Supplied
                  </span>
                )}
                {boundsSource === 'discovered' && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-status-success-bg text-status-success border border-status-success/30">
                    Bounds: Discovered
                  </span>
                )}
                {boundsSource === 'missing' && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-status-warning-bg text-status-warning border border-status-warning/30">
                    Bounds: Missing
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Review and verify the extracted problem before importing into the solver.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-charcoal-muted hover:text-charcoal hover:bg-bg-primary transition-calm"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Missing Fields Warning Banner */}
        {problem.missingFields && problem.missingFields.length > 0 && boundsSource === 'missing' && (
          <div className="p-3 rounded-me bg-status-warning-bg/70 border border-status-warning/40 text-charcoal text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-status-warning">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Review required before solving</span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Some problem parameters could not be identified from the image:{' '}
              <strong className="text-charcoal">{problem.missingFields.join(', ')}</strong>. Please verify or complete them below.
            </p>
          </div>
        )}

        {/* AI Fallback Option Banner */}
        {problem.extractionSource !== 'gemini-fallback' && onTryAiExtraction && (
          <div className="p-3 bg-lavender-mist/20 border border-lavender-dusty/60 rounded-me flex items-center justify-between gap-3 text-xs animate-fadeIn">
            <div>
              <span className="font-semibold text-charcoal flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-lavender-deep" />
                <span>Need help with this image?</span>
              </span>
              <p className="text-[11px] text-charcoal-muted mt-0.5">
                AI extraction can help interpret a difficult image.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTryAiExtraction}
              disabled={isAiExtracting}
              className="text-xs shrink-0"
            >
              {isAiExtracting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1 text-lavender-deep" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1 text-lavender-deep" />
                  <span>Try AI extraction</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Thumbnail Preview & Notes */}
        <div className="flex items-start gap-4 p-3 bg-bg-cream/40 rounded-me border border-border-soft">
          {imagePreviewUrl && (
            <div className="w-20 h-20 rounded bg-white border border-border-soft overflow-hidden shrink-0">
              <img
                src={imagePreviewUrl}
                alt="Source problem snippet"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 text-xs space-y-1">
            <span className="font-semibold text-charcoal block">Extracted Question Text:</span>
            <p className="text-charcoal-muted line-clamp-3 leading-relaxed font-sans">
              {questionText || 'No explicit problem narrative detected.'}
            </p>
            {problem.notes && (
              <p className="text-[11px] text-charcoal-subtle italic pt-0.5">
                Note: {problem.notes}
              </p>
            )}
          </div>
        </div>

        {/* Editable Fields Form */}
        <div className="space-y-4 text-xs">
          {/* Equation Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="extracted-equation" className="font-semibold text-charcoal">
                Equation f(x) = 0
              </label>
              {validation.equationError ? (
                <span className="text-[11px] text-status-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validation.equationError}
                </span>
              ) : (
                <span className="text-[11px] text-status-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Expression parses validly
                </span>
              )}
            </div>
            <input
              id="extracted-equation"
              type="text"
              value={equation}
              onChange={(e) => {
                setEquation(e.target.value);
                setBracketSearchError(null);
              }}
              placeholder="e.g. x^3 - 4*x - 9 = 0"
              className={`w-full font-mono text-sm px-3.5 py-2.5 rounded-me border bg-bg-primary/50 text-charcoal focus-ring transition-calm ${
                validation.equationError
                  ? 'border-status-error focus:border-status-error'
                  : 'border-border-soft'
              }`}
            />
          </div>

          {/* Method Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="extracted-method" className="font-semibold text-charcoal block">
              Numerical Method
            </label>
            <div className="relative">
              <select
                id="extracted-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as SupportedMethod);
                  setBracketSearchError(null);
                }}
                className="w-full appearance-none bg-bg-surface border border-border-soft rounded-me px-3.5 py-2 text-xs text-charcoal focus-ring transition-calm pr-8 cursor-pointer"
              >
                {!method && <option value="" disabled>Select a method...</option>}
                <option value="bisection">Bisection Method</option>
                <option value="false-position">False Position Method (Regula Falsi)</option>
                <option value="newton-raphson">Newton-Raphson Method</option>
              </select>
              <ChevronDown className="w-4 h-4 text-charcoal-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Missing Interval Banner & Discovery Option */}
          {hasMissingBounds && (
            <div className="p-3.5 rounded-me bg-lavender-mist/40 border border-lavender-dusty text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-charcoal">
                  <Compass className="w-4 h-4 text-lavender-deep" />
                  <span>Initial interval not provided</span>
                </div>
                <span className="text-[11px] bg-lavender-light text-lavender-deep px-2 py-0.5 rounded font-medium border border-lavender-dusty">
                  Sign-Change Search
                </span>
              </div>
              <p className="text-[11px] text-charcoal-muted leading-relaxed">
                The question does not supply a starting interval [a, b]. You can automatically search for a valid bracket where f(a) · f(b) &lt; 0, or enter bounds manually below.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFindInterval}
                className="text-xs font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                <span>Find a valid interval</span>
              </Button>
            </div>
          )}

          {/* Discovered Interval 5-Step Explanation */}
          {boundsSource === 'discovered' && discoveredExplanation && (
            <div className="p-3.5 rounded-me bg-status-success-bg/40 border border-status-success/30 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-status-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valid starting interval found: [{lowerBound}, {upperBound}]</span>
                </div>
                <Badge variant="success" size="sm">IVT Root Bracket</Badge>
              </div>
              <div className="p-2.5 bg-bg-surface rounded border border-border-soft space-y-1 font-mono text-[11px] text-charcoal">
                {discoveredExplanation.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="font-semibold text-lavender-deep shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-charcoal-muted">
                We can now apply the {method === 'false-position' ? 'False Position' : 'Bisection'} method.
              </p>
            </div>
          )}

          {/* Bracket Search Error Warning */}
          {bracketSearchError && (
            <div className="p-3 rounded-me bg-status-warning-bg/70 border border-status-warning/40 text-xs text-charcoal space-y-1 animate-fadeIn">
              <div className="font-semibold flex items-center gap-1.5 text-status-warning">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Automatic interval search could not find a bracket</span>
              </div>
              <p className="text-[11px] text-charcoal-muted leading-relaxed">
                {bracketSearchError} Please enter the interval [a, b] manually below.
              </p>
            </div>
          )}

          {/* Newton-Raphson Missing x0 Banner */}
          {method === 'newton-raphson' && !initialGuess && (
            <div className="p-3 rounded-me bg-lavender-mist/40 border border-lavender-dusty text-xs space-y-1 animate-fadeIn">
              <div className="font-semibold flex items-center gap-1.5 text-charcoal">
                <AlertCircle className="w-3.5 h-3.5 text-lavender-deep" />
                <span>Initial guess (x₀) required</span>
              </div>
              <p className="text-[11px] text-charcoal-muted leading-relaxed">
                Newton-Raphson requires a starting guess near the root. Please enter x₀ below to initialize iterations.
              </p>
            </div>
          )}

          {/* Bounds & Initial Guess Grid */}
          <div
            className={`grid grid-cols-1 ${
              method === 'newton-raphson' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
            } gap-3`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="extracted-lower" className="font-medium text-charcoal-muted block">
                  Lower Bound (a)
                </label>
                {boundsSource === 'discovered' && (
                  <span className="text-[10px] text-status-success font-medium">Discovered</span>
                )}
              </div>
              <input
                id="extracted-lower"
                type="number"
                step="any"
                value={lowerBound}
                onChange={(e) => {
                  setLowerBound(e.target.value);
                  setBoundsSource('manual');
                }}
                placeholder="e.g. 2"
                className="w-full font-mono text-xs px-3 py-1.5 rounded-me border border-border-soft bg-bg-primary/50 text-charcoal focus-ring"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="extracted-upper" className="font-medium text-charcoal-muted block">
                  Upper Bound (b)
                </label>
                {boundsSource === 'discovered' && (
                  <span className="text-[10px] text-status-success font-medium">Discovered</span>
                )}
              </div>
              <input
                id="extracted-upper"
                type="number"
                step="any"
                value={upperBound}
                onChange={(e) => {
                  setUpperBound(e.target.value);
                  setBoundsSource('manual');
                }}
                placeholder="e.g. 3"
                className="w-full font-mono text-xs px-3 py-1.5 rounded-me border border-border-soft bg-bg-primary/50 text-charcoal focus-ring"
              />
            </div>

            {method === 'newton-raphson' && (
              <div className="space-y-1">
                <label htmlFor="extracted-guess" className="font-medium text-charcoal-muted block">
                  Initial Guess (x₀)
                </label>
                <input
                  id="extracted-guess"
                  type="number"
                  step="any"
                  value={initialGuess}
                  onChange={(e) => setInitialGuess(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full font-mono text-xs px-3 py-1.5 rounded-me border border-border-soft bg-bg-primary/50 text-charcoal focus-ring"
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="extracted-decimal" className="font-medium text-charcoal-muted block">
                Decimal Places
              </label>
              <input
                id="extracted-decimal"
                type="number"
                min="1"
                max="6"
                value={decimalPlaces}
                onChange={(e) => setDecimalPlaces(Math.max(1, parseInt(e.target.value) || 3))}
                className="w-full font-mono text-xs px-3 py-1.5 rounded-me border border-border-soft bg-bg-primary/50 text-charcoal focus-ring"
              />
            </div>
          </div>

          {/* Validation Errors banner if invalid */}
          {!validation.isValid && (
            <div className="p-3 rounded-me bg-status-error-bg/60 border border-status-error/30 text-status-error text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Please correct the parameters:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {validation.equationError && <li>{validation.equationError}</li>}
                {validation.boundsError && <li>{validation.boundsError}</li>}
                {validation.initialGuessError && <li>{validation.initialGuessError}</li>}
                {validation.decimalPlacesError && <li>{validation.decimalPlacesError}</li>}
                {validation.methodError && <li>{validation.methodError}</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border-soft flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTryAnother}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>Try another photo</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs text-charcoal-muted hover:text-charcoal"
            >
              <span>Cancel</span>
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleUseProblem}
            disabled={!validation.isValid}
            className="text-xs font-semibold px-4"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Use this problem</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
