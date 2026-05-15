'use client';

import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`} />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );
}
