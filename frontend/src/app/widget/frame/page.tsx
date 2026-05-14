'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VoiceWidget } from '@/components/widget/VoiceWidget';
import { WidgetState } from '@/types/widget';

function EmbeddedWidgetContent() {
  const searchParams = useSearchParams();
  const widgetKey = searchParams.get('widgetKey');
  const themeParam = searchParams.get('theme') || 'light';
  const positionParam = searchParams.get('position') || 'bottom-right';
  const welcomeMessageParam = searchParams.get('welcomeMessage') || 'Hello! I am your AI agent. How can I assist you?';
  const hostOrigin = searchParams.get('hostOrigin') || '';

  const [expanded, setExpanded] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tenantId, setTenantId] = useState('');

  const parentTarget = hostOrigin || '*';

  useEffect(() => {
    // Notify the parent window to resize the iframe
    const width = expanded ? '400px' : '100px';
    const height = expanded ? '650px' : '100px';
    window.parent.postMessage({ type: 'LEADMATE_WIDGET_RESIZE', width, height }, parentTarget);

    // Track analytics for opening/closing
    if (expanded) {
      window.parent.postMessage({ type: 'LEADMATE_WIDGET_ANALYTICS', event: 'WIDGET_OPENED' }, parentTarget);
    }
  }, [expanded, parentTarget]);

  useEffect(() => {
    let cancelled = false;

    async function validateWidget() {
      if (!widgetKey || !hostOrigin) {
        setAuthError(true);
        setIsValidating(false);
        return;
      }

      try {
        const apiBase = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`;
        const response = await fetch(`${apiBase}/v1/voice/sessions/widget/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widget_key: widgetKey,
            host_origin: hostOrigin,
          }),
        });

        if (!response.ok) {
          throw new Error('Widget validation failed');
        }

        const data = await response.json();
        if (!cancelled) {
          setTenantId(data.tenant_id);
          setAuthError(false);
        }
      } catch {
        if (!cancelled) setAuthError(true);
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    }

    validateWidget();

    return () => {
      cancelled = true;
    };
  }, [widgetKey, hostOrigin]);

  const handleStateChange = (state: WidgetState) => {
    if (state === WidgetState.CONNECTED) {
      window.parent.postMessage({ type: 'LEADMATE_WIDGET_ANALYTICS', event: 'CALL_STARTED' }, parentTarget);
    } else if (state === WidgetState.ENDED) {
      window.parent.postMessage({ type: 'LEADMATE_WIDGET_ANALYTICS', event: 'CALL_ENDED' }, parentTarget);
    }
  };

  if (isValidating) {
    return null;
  }

  if (!widgetKey || authError) {
    return (
      <div className="w-full h-full p-2 flex items-end justify-end">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center shadow-lg border-2 border-red-200" title="Widget configuration error">
          <span className="material-symbols-outlined text-red-500">error</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 flex items-end justify-end">
      <div className={`transition-all duration-300 ease-in-out origin-bottom-right ${expanded ? 'w-full h-full' : 'w-16 h-16'}`}>
        <VoiceWidget 
          tenantId={tenantId}
          config={{ 
            agentId: widgetKey,
            hostOrigin,
            theme: { 
              primaryColor: '#6366f1', 
              backgroundColor: themeParam === 'dark' ? '#1e293b' : '#ffffff', 
              textColor: themeParam === 'dark' ? '#f8fafc' : '#1e293b', 
              borderRadius: 24, 
              accentStyle: 'gradient' 
            },
            position: { 
              corner: positionParam as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left', 
              offsetX: 0, 
              offsetY: 0, 
              size: 'medium' 
            },
            welcomeMessage: welcomeMessageParam,
            isEnabled: true,
            allowedDomains: [] 
          }}
          embedded={true}
          onExpandToggle={setExpanded}
          onStateChange={handleStateChange}
        />
      </div>
    </div>
  );
}

export default function EmbeddedWidgetPage() {
  return (
    <Suspense fallback={null}>
      <EmbeddedWidgetContent />
    </Suspense>
  );
}
