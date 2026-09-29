import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-border-soft dark:border-border-dark py-10 text-xs text-charcoal-muted dark:text-charcoal-subtle">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-charcoal dark:text-charcoal-light">MathEngineer</span>
          <span className="text-border-soft dark:text-border-dark">•</span>
          <span>Designed for undergraduate engineering students</span>
        </div>
        <div className="flex items-center gap-4 text-charcoal-muted dark:text-charcoal-subtle">
          <span>Numerical Techniques</span>
          <span>•</span>
          <span className="italic">Learn → Attempt → Hint → Understand</span>
        </div>
      </div>
    </footer>
  );
};

