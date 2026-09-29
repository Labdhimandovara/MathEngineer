import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'surface' | 'cream' | 'flat';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'surface',
  onClick,
}) => {
  const variantStyles = {
    surface: 'bg-bg-surface border border-border-soft shadow-subtle dark:bg-bg-darkSurface dark:border-border-dark dark:shadow-dark-subtle',
    cream: 'bg-bg-cream/50 border border-border-soft/80 shadow-subtle dark:bg-bg-darkCard dark:border-border-dark dark:shadow-dark-subtle',
    flat: 'bg-bg-neutral/40 border border-border-soft/60 dark:bg-bg-darkCard/40 dark:border-border-dark/60',
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:border-lavender-dusty/60 hover:shadow-card hover:-translate-y-0.5 transition-calm dark:hover:border-lavender-accent/50 dark:hover:shadow-dark-card'
    : '';

  return (
    <div
      onClick={onClick}
      className={`rounded-me-lg p-6 sm:p-7 ${variantStyles[variant]} ${interactiveClasses} ${className}`}
    >
      {children}
    </div>
  );
};

