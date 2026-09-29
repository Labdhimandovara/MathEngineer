import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className = '',
  size = 'sm'
}) => {
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full bg-lavender-light/60 dark:bg-bg-darkCard/80 rounded-full overflow-hidden ${heightClass} ${className}`}>
      <div
        className="bg-lavender-deep dark:bg-lavender-accent h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
