import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (error: unknown) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'invisible';
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  size?: 'normal' | 'compact' | 'invisible';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const Turnstile: React.FC<TurnstileProps> = ({
  onVerify,
  onError,
  onExpire,
  size = 'invisible',
  theme = 'dark',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Cloudflare test key: Always Passes

  useEffect(() => {
    let isMounted = true;
    const scriptId = 'cf-turnstile-script';

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const checkAndRender = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup error
        }
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            if (isMounted) {
              onVerify(token);
            }
          },
          'error-callback': () => {
            if (isMounted) {
              onError?.();
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              onExpire?.();
              if (widgetIdRef.current) {
                window.turnstile?.reset(widgetIdRef.current);
              }
            }
          },
        });
        widgetIdRef.current = id;
      } catch {
        // Fallback for offline/mock environments
      }
    };

    const intervalId = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        clearInterval(intervalId);
        checkAndRender();
      }
    }, 100);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      // If Turnstile failed to load within 3 seconds, pass dummy fallback in development
      if (!widgetIdRef.current && import.meta.env.DEV) {
        onVerify('dev-turnstile-bypass-token');
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, theme, size, onVerify, onError, onExpire]);

  if (size === 'invisible') {
    return <div ref={containerRef} className="hidden" aria-hidden="true" />;
  }

  return <div ref={containerRef} className={className} />;
};
