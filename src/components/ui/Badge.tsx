import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'lavender' | 'cream' | 'success' | 'warning';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const variantStyles = {
    neutral: 'bg-bg-neutral text-charcoal-muted border-border-soft dark:bg-bg-darkCard dark:text-charcoal-subtle dark:border-border-dark',
    lavender: 'bg-lavender-light text-lavender-deep border-lavender-soft/40 dark:bg-bg-darkAccent/50 dark:text-lavender-soft dark:border-lavender-darkest',
    cream: 'bg-bg-cream text-charcoal border-border-soft dark:bg-bg-darkCard dark:text-charcoal-light dark:border-border-dark',
    success: 'bg-status-success-bg text-status-success border-status-success/20 dark:bg-[#1A2E20] dark:text-[#76B885] dark:border-[#2E5938]/40',
    warning: 'bg-status-warning-bg text-status-warning border-status-warning/20 dark:bg-[#2E2619] dark:text-[#E6A85C] dark:border-[#594320]/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

