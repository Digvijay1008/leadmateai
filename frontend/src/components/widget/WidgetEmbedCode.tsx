'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WidgetConfig } from '@/types/widget';

interface WidgetEmbedCodeProps {
  config: Partial<WidgetConfig>;
}

function generateInstallCode(config: Partial<WidgetConfig>): string {
  return `<script>
  (function(w,d,s,o,f,js,fjs){
    w['LeadMateWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','lmw','https://cdn.leadmate.ai/widget.js'));
  lmw('init', { tenantId: '${config.tenantId ?? 'YOUR_TENANT_ID'}', agentId: '${config.agentId ?? 'YOUR_AGENT_ID'}' });
</script>`;
}

export function WidgetEmbedCode({ config }: WidgetEmbedCodeProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateInstallCode(config));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Installation Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto">
            <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">
              {generateInstallCode(config)}
            </pre>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleCopy} className="flex items-center gap-2">
              <span className="material-symbols-outlined">
                {copySuccess ? 'check' : 'content_copy'}
              </span>
              {copySuccess ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600">info</span>
              <div>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">How it works</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Paste this code just before the closing &lt;/body&gt; tag on your website.
                  The widget will automatically appear in the position you configured.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Integration Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Copy the install code', desc: 'Click the copy button above' },
              { step: 2, title: 'Paste into your website', desc: 'Add before </body> tag' },
              { step: 3, title: 'Test the widget', desc: 'Visit your site and click the widget button' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{title}</p>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
