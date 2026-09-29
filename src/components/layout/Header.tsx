import React, { useState, useRef, useEffect } from 'react';
import { PageId } from '../../types/index.ts';
import { useProgress, getActiveStreak } from '../../services/progress/index.ts';
import {
  Flame,
  Compass,
  BookOpen,
  PenTool,
  BarChart3,
  Home as HomeIcon,
  RotateCcw,
  Award,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isChallengeMode?: boolean;
  onToggleChallengeMode?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  isChallengeMode,
  onToggleChallengeMode,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const progress = useProgress();
  const streakDays = getActiveStreak(progress);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Exactly 5 Primary Navigation Destinations
  const primaryNavItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <HomeIcon className="w-4 h-4 transition-transform group-hover:scale-105" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-4 h-4 transition-transform group-hover:scale-105" /> },
    { id: 'practice', label: 'Practice', icon: <Compass className="w-4 h-4 transition-transform group-hover:scale-105" /> },
    { id: 'solve', label: 'Solve', icon: <PenTool className="w-4 h-4 transition-transform group-hover:scale-105" /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-4 h-4 transition-transform group-hover:scale-105" /> },
  ];

  // Secondary Destinations in compact "More" menu
  const secondaryNavItems: { id: PageId; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'review',
      label: 'Review',
      icon: <RotateCcw className="w-4 h-4 text-lavender-deep dark:text-lavender-accent" />,
      desc: 'Attempt history, mistake advice, and retry',
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <Award className="w-4 h-4 text-status-warning" />,
      desc: 'Timed assessments and mastery checks',
    },
  ];

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === currentPage);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  return (
    <header className="sticky top-0 z-40 bg-bg-primary/95 dark:bg-bg-dark/95 backdrop-blur-md border-b border-border-soft dark:border-border-dark transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group select-none btn-press"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('home')}
          aria-label="MathEngineer Home"
        >
          <div className="w-9 h-9 rounded-me bg-gradient-to-br from-lavender-deep to-lavender-dark text-white flex items-center justify-center text-lg font-serif font-medium shadow-subtle group-hover:from-lavender-dark group-hover:to-lavender-deep transition-all duration-300">
            M
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-charcoal dark:text-charcoal-light flex items-center gap-1.5 font-sans">
              MathEngineer
            </span>
            <span className="text-[11px] text-charcoal-muted dark:text-charcoal-subtle tracking-wide font-normal -mt-0.5">
              Engineering Mathematics
            </span>
          </div>
        </div>

        {/* Desktop Navigation: Exactly 5 Primary Items + Secondary "More" Menu */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          {primaryNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsMoreOpen(false);
                  onNavigate(item.id);
                }}
                className={`group relative px-3.5 py-1.5 rounded-me text-sm font-medium transition-calm btn-press flex items-center gap-1.5 ${
                  isActive
                    ? 'text-charcoal dark:text-charcoal-light bg-lavender-light/75 dark:bg-bg-darkCard shadow-subtle font-semibold border border-lavender-soft/40 dark:border-border-dark'
                    : 'text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light hover:bg-bg-neutral/60 dark:hover:bg-bg-darkCard/50 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {isActive && (
                  <span className="sr-only">(current page)</span>
                )}
              </button>
            );
          })}

          {/* Compact "More" Menu Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              aria-expanded={isMoreOpen}
              aria-haspopup="true"
              className={`relative px-3 py-1.5 rounded-me text-sm font-medium transition-calm btn-press flex items-center gap-1.5 ${
                isSecondaryActive
                  ? 'text-charcoal dark:text-charcoal-light bg-lavender-light/75 dark:bg-bg-darkCard shadow-subtle font-semibold border border-lavender-soft/40 dark:border-border-dark'
                  : 'text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light hover:bg-bg-neutral/60 dark:hover:bg-bg-darkCard/50 border border-transparent'
              }`}
            >
              <span>More</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isMoreOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isMoreOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-me-lg bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark shadow-modal p-1.5 space-y-1 animate-fadeIn z-50"
              >
                {secondaryNavItems.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      role="menuitem"
                      onClick={() => {
                        setIsMoreOpen(false);
                        onNavigate(item.id);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-me text-xs transition-calm flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-lavender-light/80 dark:bg-bg-darkCard text-charcoal dark:text-charcoal-light font-semibold border border-lavender-soft/40 dark:border-border-dark'
                          : 'hover:bg-bg-neutral/70 dark:hover:bg-bg-darkCard/50 text-charcoal dark:text-charcoal-light border border-transparent'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{item.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-charcoal dark:text-charcoal-light flex items-center justify-between">
                          <span>{item.label}</span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep dark:bg-lavender-accent" />
                          )}
                        </div>
                        <div className="text-[11px] text-charcoal-muted dark:text-charcoal-subtle leading-tight font-normal mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right Section: Streak & Theme switcher & Energy mode toggle */}
        <div className="flex items-center gap-2.5">
          {/* Truthful student streak indicator */}
          <div
            title={`Active learning streak: ${streakDays} day${streakDays === 1 ? '' : 's'}`}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-me bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark text-xs text-charcoal dark:text-charcoal-light"
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                streakDays > 0 ? 'text-status-warning fill-amber-500' : 'text-charcoal-muted dark:text-charcoal-subtle'
              }`}
            />
            <span className="font-medium">{streakDays}d</span>
          </div>

          {/* Dark / Light Theme Toggle */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-1.5 rounded-me text-xs text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light hover:bg-bg-neutral/70 dark:hover:bg-bg-darkCard border border-border-soft dark:border-border-dark transition-calm btn-press"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-lavender-deep" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

