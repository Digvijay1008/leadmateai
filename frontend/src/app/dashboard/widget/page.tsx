'use client';

import React, { useState, useEffect } from 'react';
import { VoiceWidget } from '@/components/widget/VoiceWidget';
import { PageHeader } from '@/components/ui/status-badge';
import { authService } from '@/services/auth.service';

export default function WidgetPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [widgetKey, setWidgetKey] = useState('wk_123abc456def');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi there! How can I help you today?');
  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');

  useEffect(() => {
    authService.getCurrentUser().then((res: any) => {
      if (res && res.tenant && res.tenant.id) {
        setTenantId(res.tenant.id);
        if (res.tenant.widgetKey) setWidgetKey(res.tenant.widgetKey);
      } else if (res && res.id) {
        setTenantId(res.id);
        if (res.widgetKey) setWidgetKey(res.widgetKey);
      }
    }).catch(console.error);
  }, []);

  const embedCode = `<script src="https://cdn.leadmate.ai/widget/v1/widget.js"
        data-widget-key="${widgetKey}"
        data-theme="${theme}"
        data-position="${position}"
        data-welcome-message="${welcomeMessage}">
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto gap-6">
      <header className="shrink-0">
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Embeddable Widget</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Configure and integrate the LeadMate Voice SDK into your website.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Configuration Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Widget Key</label>
              <input 
                type="text" 
                value={widgetKey}
                onChange={(e) => setWidgetKey(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                placeholder="e.g. wk_123abc"
              />
              <p className="text-[10px] text-slate-400 mt-1">The public identifier mapped to your agent.</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Welcome Message</label>
              <input 
                type="text" 
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Message shown before starting the call"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Theme</label>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Light
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Dark
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Position</label>
              <select 
                value={position}
                onChange={(e: any) => setPosition(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Embed Code</h3>
            <p className="text-xs text-slate-500 mb-4">Copy and paste this snippet just before the closing &lt;/body&gt; tag of your website.</p>
            
            <div className="relative group">
              <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl text-xs overflow-x-auto border border-slate-800">
                <code>{embedCode}</code>
              </pre>
              <button 
                onClick={copyToClipboard}
                className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all backdrop-blur-sm"
              >
                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl relative overflow-hidden flex flex-col min-h-[600px] h-full shadow-inner">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Preview
            </h2>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>
          </div>
          
          <div className="flex-1 relative w-full h-full p-8 flex items-center justify-center">
            {/* Dummy Website Background */}
            <div className="w-full h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center opacity-50 relative">
              <p className="text-slate-400 dark:text-slate-500 font-headline font-bold text-xl">Your Website Content</p>
              
              {/* The Actual Widget Component in Absolute Positioning relative to this container */}
              <div className="absolute inset-4 pointer-events-none">
                <div className="pointer-events-auto w-full h-full relative">
                  {tenantId ? (
                    <VoiceWidget 
                      tenantId={tenantId}
                      embedded={false}
                      previewMode={true}
                      config={{
                        agentName: 'LeadMate Assistant',
                        welcomeMessage: welcomeMessage,
                        theme: { 
                          primaryColor: '#6366f1', 
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', 
                          textColor: theme === 'dark' ? '#f8fafc' : '#1e293b', 
                          borderRadius: 24, 
                          accentStyle: 'gradient' 
                        },
                        position: {
                          corner: position,
                          offsetX: 0,
                          offsetY: 0,
                          size: 'medium'
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
