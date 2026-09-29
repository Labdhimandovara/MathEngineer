import React, { useState, useEffect, useRef } from 'react';
import { CHALLENGE_QUESTIONS } from '../../services/challenge/challengeQuestions.ts';
import {
  ChallengeQuestion,
  BattleDifficulty,
  BattleFormat,
} from '../../services/challenge/challengeTypes.ts';
import { BOT_PROFILES } from '../../services/challenge/challengeQuestions.ts';
import { simulateBotAnswer, BotSimulationResult } from '../../services/challenge/battleBot.ts';
import { recordBattleResult, useProgress } from '../../services/progress/index.ts';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  Swords,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { PageId } from '../../types/index.ts';

interface BattleModeProps {
  onNavigate: (page: PageId) => void;
  onSwitchToSprint?: () => void;
}

export const BattleMode: React.FC<BattleModeProps> = ({ onNavigate, onSwitchToSprint }) => {
  const [battleState, setBattleState] = useState<'setup' | 'battling' | 'concluded'>('setup');
  const [difficulty, setDifficulty] = useState<BattleDifficulty>('medium');
  const [format, setFormat] = useState<BattleFormat>('best_of_3');

  const [playerScore, setPlayerScore] = useState<number>(0);
  const [botScore, setBotScore] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [roundWinner, setRoundWinner] = useState<'player' | 'bot' | 'none' | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<ChallengeQuestion | null>(null);
  const [botStatus, setBotStatus] = useState<string>('Thinking...');
  const [numericInput, setNumericInput] = useState<string>('');

  const targetWins = format === 'quick' ? 1 : format === 'best_of_3' ? 2 : 3;
  const botProfile = BOT_PROFILES[difficulty];

  const shuffledQuestions = useRef<ChallengeQuestion[]>([]);
  const questionCursor = useRef<number>(0);
  const botTimeoutRef = useRef<number | null>(null);
  const roundResolvedRef = useRef<boolean>(false);

  // Initialize a new match
  const startMatch = () => {
    shuffledQuestions.current = [...CHALLENGE_QUESTIONS].sort(() => Math.random() - 0.5);
    questionCursor.current = 0;
    setPlayerScore(0);
    setBotScore(0);
    setRoundNumber(1);
    setRoundWinner(null);
    setBattleState('battling');
    loadNextRound();
  };

  const loadNextRound = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    roundResolvedRef.current = false;
    setRoundWinner(null);
    setNumericInput('');

    const nextQ =
      shuffledQuestions.current[questionCursor.current % shuffledQuestions.current.length];
    questionCursor.current += 1;
    setCurrentQuestion(nextQ);
    setBotStatus('Analyzing equation...');

    // Schedule MathBot's answer simulation
    const botSim: BotSimulationResult = simulateBotAnswer(nextQ, difficulty);

    botTimeoutRef.current = window.setTimeout(() => {
      if (roundResolvedRef.current) return;

      if (botSim.isCorrect) {
        // Bot got it right first!
        roundResolvedRef.current = true;
        setRoundWinner('bot');
        setBotStatus(`Submitted: "${botSim.answer}" (Correct!)`);
        setBotScore((prev) => prev + 1);
      } else {
        setBotStatus(`Guessed "${botSim.answer}" (Incorrect)`);
      }
    }, botSim.delayMs);
  };

  // Check match win condition
  useEffect(() => {
    if (battleState === 'battling') {
      if (playerScore >= targetWins || botScore >= targetWins) {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
        setBattleState('concluded');

        const result = playerScore > botScore ? 'win' : playerScore < botScore ? 'loss' : 'draw';
        recordBattleResult({
          opponentName: botProfile.name,
          difficulty,
          format,
          playerScore,
          opponentScore: botScore,
          result,
        });
      }
    }
  }, [playerScore, botScore, battleState, targetWins, botProfile.name, difficulty, format]);

  const handlePlayerSubmit = (answer: string) => {
    if (roundResolvedRef.current || !currentQuestion) return;

    let isCorrect = false;
    if (currentQuestion.type === 'multiple_choice') {
      isCorrect =
        answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    } else {
      const userVal = parseFloat(answer.trim());
      const correctVal = parseFloat(currentQuestion.correctAnswer);
      const tol = currentQuestion.tolerance || 0.02;
      isCorrect = !isNaN(userVal) && Math.abs(userVal - correctVal) <= tol;
    }

    if (isCorrect) {
      roundResolvedRef.current = true;
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      setRoundWinner('player');
      setPlayerScore((prev) => prev + 1);
    } else {
      // Wrong answer feedback
      setRoundWinner('none');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* State 1: Match Setup */}
      {battleState === 'setup' && (
        <Card variant="surface" className="border-border-soft p-8 max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-lavender-light text-lavender-deep flex items-center justify-center mx-auto border border-lavender-dusty/40 shadow-subtle">
              <Swords className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-charcoal">MathBot Battle Arena</h2>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-md mx-auto">
              Challenge our local numerical simulated opponents in a head-to-head race to solve calculation and concept questions.
            </p>
          </div>

          {/* Difficulty selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Choose Opponent Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((diff) => {
                const prof = BOT_PROFILES[diff];
                const isSelected = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`p-3 rounded-me text-left transition-calm border ${
                      isSelected
                        ? 'bg-lavender-light border-lavender-dusty shadow-subtle'
                        : 'bg-bg-primary/50 border-border-soft hover:bg-bg-surface'
                    }`}
                  >
                    <div className="font-semibold text-xs text-charcoal">{prof.name}</div>
                    <div className="text-[10px] text-charcoal-muted">{prof.title}</div>
                    <div className="text-[10px] text-lavender-deep font-medium mt-1">
                      {Math.round(prof.accuracyRate * 100)}% accuracy
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Match Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'quick', label: 'Quick Battle', target: 'First to 1' },
                { id: 'best_of_3', label: 'Best of 3', target: 'First to 2' },
                { id: 'best_of_5', label: 'Best of 5', target: 'First to 3' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id as any)}
                  className={`p-3 rounded-me text-left transition-calm border ${
                    format === f.id
                      ? 'bg-lavender-light border-lavender-dusty shadow-subtle'
                      : 'bg-bg-primary/50 border-border-soft hover:bg-bg-surface'
                  }`}
                >
                  <div className="font-semibold text-xs text-charcoal">{f.label}</div>
                  <div className="text-[10px] text-charcoal-muted">{f.target}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start CTA */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={startMatch}
              className="flex items-center justify-center gap-2"
            >
              <Swords className="w-4 h-4" />
              <span>Enter Arena</span>
            </Button>
            {onSwitchToSprint && (
              <Button variant="outline" size="lg" onClick={onSwitchToSprint}>
                <span>Play 60s Sprint</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* State 2: Active Battling */}
      {battleState === 'battling' && currentQuestion && (
        <Card variant="surface" className="border-border-soft max-w-2xl mx-auto space-y-6 p-6">
          {/* Head to Head Scoreboard */}
          <div className="flex items-center justify-between p-4 rounded-me bg-bg-primary/80 border border-border-soft/60">
            {/* Player */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lavender-deep text-white flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-charcoal">You (Engineer)</div>
                <div className="text-2xl font-extrabold text-charcoal font-mono">
                  {playerScore} <span className="text-xs font-normal text-charcoal-muted">/ {targetWins}</span>
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="text-center px-4">
              <Badge variant="cream">Round {roundNumber}</Badge>
              <div className="text-xs text-charcoal-muted font-mono mt-1">First to {targetWins}</div>
            </div>

            {/* Bot */}
            <div className="flex items-center gap-3 flex-row-reverse text-right">
              <div className="w-10 h-10 rounded-full bg-charcoal text-white flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-charcoal">{botProfile.name}</div>
                <div className="text-2xl font-extrabold text-charcoal font-mono">
                  {botScore} <span className="text-xs font-normal text-charcoal-muted">/ {targetWins}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bot thinking status bar */}
          <div className="flex items-center justify-between text-xs text-charcoal-muted px-1">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-lavender-deep" />
              <span>{botProfile.name}: {botStatus}</span>
            </span>
          </div>

          {/* Question card */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <Badge variant="neutral">{currentQuestion.topic.toUpperCase()}</Badge>
              <span className="text-xs text-charcoal-muted">Quick Fire</span>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-charcoal min-h-[48px] leading-relaxed">
              {currentQuestion.question}
            </h3>

            {/* If Round ended, show winner & Next Round button */}
            {roundWinner ? (
              <div className="p-4 rounded-me bg-bg-surface border border-border-soft space-y-3 animate-fadeIn text-center">
                <div
                  className={`text-sm font-bold flex items-center justify-center gap-1.5 ${
                    roundWinner === 'player'
                      ? 'text-status-success'
                      : roundWinner === 'bot'
                      ? 'text-status-error'
                      : 'text-status-warning'
                  }`}
                >
                  {roundWinner === 'player' && (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>You answered correctly first! (+1 Point)</span>
                    </>
                  )}
                  {roundWinner === 'bot' && (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{botProfile.name} answered correctly first!</span>
                    </>
                  )}
                  {roundWinner === 'none' && (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Incorrect answer. Try again or wait for next round!</span>
                    </>
                  )}
                </div>

                <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                  {currentQuestion.explanation}
                </p>

                {playerScore < targetWins && botScore < targetWins && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setRoundNumber((prev) => prev + 1);
                      loadNextRound();
                    }}
                    className="mx-auto flex items-center gap-1.5"
                  >
                    <span>Next Round</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Multiple Choice Options */}
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePlayerSubmit(opt)}
                        className="p-3.5 rounded-me text-left text-xs font-medium border border-border-soft bg-bg-primary/60 hover:bg-lavender-light hover:border-lavender-dusty text-charcoal transition-all active:scale-[0.98]"
                      >
                        <span className="font-semibold text-lavender-deep mr-2">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Numeric Input */}
                {currentQuestion.type === 'numeric' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (numericInput.trim()) {
                        handlePlayerSubmit(numericInput);
                      }
                    }}
                    className="flex items-center gap-2 pt-2"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={numericInput}
                      onChange={(e) => setNumericInput(e.target.value)}
                      placeholder="Enter numeric answer..."
                      className="flex-1 px-4 py-2 text-xs font-mono rounded-me border border-border-soft bg-bg-surface focus:outline-none focus:border-lavender-dusty"
                    />
                    <Button type="submit" variant="primary" size="sm">
                      Submit Answer
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* State 3: Match Concluded */}
      {battleState === 'concluded' && (
        <Card variant="surface" className="border-border-soft p-8 max-w-xl mx-auto text-center space-y-6 animate-fadeIn">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-subtle ${
              playerScore > botScore
                ? 'bg-status-success-bg text-status-success border-status-success/30'
                : 'bg-status-error-bg text-status-error border-status-error/30'
            }`}
          >
            {playerScore > botScore ? <Trophy className="w-8 h-8" /> : <Swords className="w-8 h-8" />}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-charcoal">
              {playerScore > botScore ? 'Victory!' : 'Defeat'}
            </h2>
            <p className="text-xs text-charcoal-muted">
              {playerScore > botScore
                ? `You defeated ${botProfile.name} in ${format.replace('_', ' ')}!`
                : `${botProfile.name} won the match. Practice and try again!`}
            </p>
          </div>

          {/* Final Score Breakdown */}
          <div className="p-4 rounded-me bg-bg-primary/80 border border-border-soft/60 flex items-center justify-around">
            <div>
              <div className="text-xs text-charcoal-muted">Your Score</div>
              <div className="text-3xl font-bold text-charcoal">{playerScore}</div>
            </div>
            <div className="text-charcoal-muted font-bold text-lg">-</div>
            <div>
              <div className="text-xs text-charcoal-muted">{botProfile.name}</div>
              <div className="text-3xl font-bold text-charcoal">{botScore}</div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={startMatch} className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              <span>Rematch</span>
            </Button>
            <Button variant="outline" onClick={() => setBattleState('setup')}>
              <span>Change Settings</span>
            </Button>
            <Button variant="outline" onClick={() => onNavigate('progress')}>
              <span>View Progress</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
