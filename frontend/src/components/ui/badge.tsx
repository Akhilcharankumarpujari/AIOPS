import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground shadow',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
    outline: 'text-foreground',
    success: 'border-transparent bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20',
    warning: 'border-transparent bg-amber-500/15 text-amber-500 dark:bg-amber-500/20',
    info: 'border-transparent bg-sky-500/15 text-sky-500 dark:bg-sky-500/20',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className || ''}`}
      {...props}
    />
  );
}
