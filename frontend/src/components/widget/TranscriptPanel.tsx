'use client';

import React from 'react';
import { WidgetTheme } from '@/types/widget';

interface TranscriptEntry {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  theme: WidgetTheme;
  maxMessages?: number;
}

export function TranscriptPanel({ transcript, theme, maxMessages = 50 }: TranscriptPanelProps) {
  const recentTranscript = transcript.slice(-maxMessages);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
      {recentTranscript.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <span className="material-symbols-outlined text-3xl mb-2">chat_bubble_outline</span>
          <p className="text-sm">Conversation will appear here</p>
        </div>
      ) : (
        recentTranscript.map((entry) => (
          <div
            key={entry.id}
            className={`
              flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}
            `}
          >
            <div
              className={`
                max-w-[85%] p-3 rounded-2xl text-sm font-medium
                ${entry.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    entry.role === 'user' ? 'text-white/70' : 'text-slate-500'
                  }`}
                >
                  {entry.role === 'user' ? 'You' : 'AI'}
                </span>
              </div>
              <p>{entry.text}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}