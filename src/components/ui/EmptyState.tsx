import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-card border border-border/60 shadow-soft my-3">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-foreground mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 active:scale-95 transition-all shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ count = 3, height = 'h-16' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`w-full ${height} bg-muted/60 rounded-2xl`} />
      ))}
    </div>
  );
}
