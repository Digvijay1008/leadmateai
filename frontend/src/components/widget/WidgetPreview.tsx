'use client';

import React from 'react';
import { VoiceWidget } from '@/components/widget/VoiceWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WidgetConfig, WidgetTheme, WidgetPosition, DEFAULT_WIDGET_CONFIG } from '@/types/widget';

interface WidgetPreviewProps {
  config: Partial<WidgetConfig>;
  onPositionChange: (updates: Partial<WidgetPosition>) => void;
}

export function WidgetPreview({ config, onPositionChange }: WidgetPreviewProps) {
  return (
    <Card className="bg-slate-50 dark:bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Live Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[500px] bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your Website</h3>
              <p className="text-slate-500">This is how your widget will appear on your website.</p>
            </div>
          </div>
          <VoiceWidget
            tenantId={config.tenantId ?? 'demo-tenant'}
            config={config}
            embedded
          />
        </div>

        {/* Position picker */}
        <div className="mt-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Widget Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => onPositionChange({ corner: pos })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  config.position?.corner === pos
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
