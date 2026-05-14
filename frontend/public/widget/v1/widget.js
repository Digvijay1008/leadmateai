(function() {
  if (window.LeadmateWidget) return;

  const LeadmateWidget = {
    init: function(config) {
      this.config = config;
      this.render();
      this.trackAnalytics('WIDGET_LOADED');
    },
    trackAnalytics: function(event) {
      // Send an analytics event
      const origin = new URL(document.currentScript?.src || 'https://app.leadmate.ai').origin;
      try {
        const body = new URLSearchParams({
          event,
          widgetKey: this.config.widgetKey,
          host: window.location.origin
        });
        fetch(`${origin}/api/v1/analytics/widget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body,
          mode: 'no-cors' // Fire and forget
        });
      } catch (e) {
        // Ignore analytics failure
      }
    },
    render: function() {
      if (document.getElementById('leadmate-widget-frame')) return;

      const iframe = document.createElement('iframe');
      iframe.id = 'leadmate-widget-frame';
      
      const currentScript = document.currentScript;
      let origin = 'https://app.leadmate.ai';
      if (currentScript && currentScript.src) {
        origin = new URL(currentScript.src).origin;
      }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        origin = 'http://localhost:3000';
      }
      
      const queryParams = new URLSearchParams({
        widgetKey: this.config.widgetKey || '',
        theme: this.config.theme || 'light',
        position: this.config.position || 'bottom-right',
        welcomeMessage: this.config.welcomeMessage || '',
        hostOrigin: window.location.origin // pass the origin for backend domain check
      });
      
      iframe.src = `${origin}/widget/frame?${queryParams.toString()}`;
      
      // Isolation styling
      iframe.style.position = 'fixed';
      iframe.style.border = 'none';
      iframe.style.zIndex = '2147483647';
      iframe.style.backgroundColor = 'transparent';
      iframe.allow = 'microphone';
      iframe.title = 'Leadmate Voice Widget';
      
      const corner = this.config.position || 'bottom-right';
      const offsetX = '24px';
      const offsetY = '24px';
      
      if (corner.includes('bottom')) iframe.style.bottom = offsetY;
      else iframe.style.top = offsetY;
      if (corner.includes('right')) iframe.style.right = offsetX;
      else iframe.style.left = offsetX;

      iframe.style.width = '100px';
      iframe.style.height = '100px';

      document.body.appendChild(iframe);

      window.addEventListener('message', (event) => {
        if (event.origin !== origin) return;
        
        if (event.data?.type === 'LEADMATE_WIDGET_RESIZE') {
          iframe.style.width = event.data.width;
          iframe.style.height = event.data.height;
        } else if (event.data?.type === 'LEADMATE_WIDGET_ANALYTICS') {
          this.trackAnalytics(event.data.event);
        }
      });
    }
  };

  window.LeadmateWidget = LeadmateWidget;

  const scriptTag = document.currentScript;
  if (scriptTag) {
    const widgetKey = scriptTag.getAttribute('data-widget-key');
    if (widgetKey) {
      LeadmateWidget.init({
        widgetKey: widgetKey,
        theme: scriptTag.getAttribute('data-theme') || 'light',
        position: scriptTag.getAttribute('data-position') || 'bottom-right',
        welcomeMessage: scriptTag.getAttribute('data-welcome-message') || ''
      });
    }
  }
})();
