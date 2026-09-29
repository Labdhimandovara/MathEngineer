import React, { useState } from 'react';
import { PageId } from '../../types/index.ts';
import {
  Home as HomeIcon,
  BookOpen,
  PenTool,
  Compass,
  BarChart3,
  RotateCcw,
  Award,
  MoreHorizontal,
  X,
} from 'lucide-react';

interface MobileNavProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Exactly 5 Primary Destinations matching Desktop
  const primaryItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <HomeIcon className="w-4 h-4" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'practice', label: 'Practice', icon: <Compass className="w-4 h-4" /> },
    { id: 'solve', label: 'Solve', icon: <PenTool className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const secondaryItems: { id: PageId; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'review',
      label: 'Review',
      icon: <RotateCcw className="w-4 h-4 text-lavender-deep" />,
      desc: 'Attempt history, mistake advice, and retry',
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <Award className="w-4 h-4 text-status-warning" />,
      desc: 'Timed assessments and mastery checks',
    },
  ];

  const isSecondaryActive = secondaryItems.some((item) => item.id === currentPage);

  return (
    <>
      {/* Mobile "More" Modal / Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div
            className="bg-bg-surface dark:bg-bg-darkSurface rounded-t-me-xl border-t border-border-soft dark:border-border-dark p-4 pb-6 space-y-3 shadow-modal max-w-lg mx-auto w-full animate-slideUp"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation destinations"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-soft dark:border-border-dark">
              <span className="text-sm font-semibold text-charcoal dark:text-charcoal-light">More Destinations</span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-me text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light hover:bg-bg-neutral dark:hover:bg-bg-darkCard transition-calm"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {secondaryItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsMoreOpen(false);
                      onNavigate(item.id);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-me text-xs transition-calm flex items-start gap-3 btn-press ${
                      isActive
                        ? 'bg-lavender-light dark:bg-bg-darkCard text-charcoal dark:text-charcoal-light font-semibold border border-lavender-dusty/40 dark:border-border-dark'
                        : 'hover:bg-bg-neutral dark:hover:bg-bg-darkCard/50 text-charcoal dark:text-charcoal-light border border-transparent'
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
                      <div className="text-[11px] text-charcoal-muted dark:text-charcoal-subtle font-normal mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-surface/95 dark:bg-bg-darkSurface/95 backdrop-blur-md border-t border-border-soft dark:border-border-dark px-2 py-1.5 flex items-center justify-around shadow-subtle safe-area-pb"
      >
        {primaryItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setIsMoreOpen(false);
                onNavigate(item.id);
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-me transition-calm text-[10px] btn-press ${
                isActive
                  ? 'text-lavender-deep dark:text-lavender-accent font-semibold'
                  : 'text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light'
              }`}
            >
              <div className={`p-1 rounded-me ${isActive ? 'bg-lavender-light dark:bg-bg-darkCard' : ''}`}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* More trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-me transition-calm text-[10px] btn-press ${
            isSecondaryActive
              ? 'text-lavender-deep dark:text-lavender-accent font-semibold'
              : 'text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light'
          }`}
          aria-label="More options"
        >
          <div className={`p-1 rounded-me ${isSecondaryActive ? 'bg-lavender-light dark:bg-bg-darkCard' : ''}`}>
            <MoreHorizontal className="w-4 h-4" />
          </div>
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
