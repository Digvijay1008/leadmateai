'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6">
        <span className="material-symbols-outlined text-4xl">{icon}</span>
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 font-bold py-2.5 px-5 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {actionLabel}
        </button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 font-bold py-2.5 px-5 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}