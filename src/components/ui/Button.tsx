import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm font-medium',
  };

  const variantStyles = {
    primary:
      'bg-lavender-deep text-white hover:bg-lavender-deep/90 active:bg-lavender-deep/95 shadow-subtle border border-transparent dark:bg-lavender-deep dark:hover:bg-lavender-dusty dark:active:bg-lavender-dark',
    secondary:
      'bg-lavender-light text-lavender-deep hover:bg-lavender-soft/40 border border-lavender-soft/40 dark:bg-bg-darkCard dark:text-lavender-soft dark:border-border-dark dark:hover:bg-bg-darkAccent',
    outline:
      'bg-transparent text-charcoal hover:bg-bg-neutral/80 border border-border-soft hover:border-lavender-dusty/60 dark:text-charcoal-light dark:border-border-dark dark:hover:bg-bg-darkCard dark:hover:border-lavender-dusty/40',
    ghost:
      'bg-transparent text-charcoal-muted hover:text-charcoal hover:bg-bg-neutral/60 dark:text-charcoal-subtle dark:hover:text-charcoal-light dark:hover:bg-bg-darkCard/60 border border-transparent',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-me font-medium transition-calm btn-press focus-ring disabled:opacity-50 disabled:pointer-events-none select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

