import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 border border-primary/20',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/20',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-500/20',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-500/20',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-lg font-medium',
    md: 'text-xs px-2.5 py-1 rounded-xl font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 ${variantStyles} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
}
