import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const OAuthCallbackHandler: React.FC<{ platform?: string }> = ({
  platform: propPlatform,
}) => {
  const params = useParams<{ platform?: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '';
  const error = searchParams.get('error') || searchParams.get('error_description');

  // Detect platform if not explicitly passed
  let effectivePlatform = propPlatform || params.platform || '';
  if (!effectivePlatform) {
    if (state.startsWith('twitch:')) {
      effectivePlatform = 'twitch';
    } else if (state.startsWith('youtube:')) {
      effectivePlatform = 'youtube';
    } else if (state.startsWith('spotify:')) {
      effectivePlatform = 'spotify';
    } else if (state.startsWith('github:')) {
      effectivePlatform = 'github';
    } else {
      const scope = searchParams.get('scope') || '';
      if (code?.startsWith('4/') || scope.includes('youtube') || scope.includes('google')) {
        effectivePlatform = 'youtube';
      } else if (scope.includes('user:read') || scope.includes('channel:read')) {
        effectivePlatform = 'twitch';
      } else if (state.includes('spotify') || searchParams.has('spotify')) {
        effectivePlatform = 'spotify';
      } else if (state.includes('github')) {
        effectivePlatform = 'github';
      } else {
        effectivePlatform = 'youtube';
      }
    }
  }

  useEffect(() => {
    if (error) {
      setStatus('error');
      setErrorMessage(error);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code was found in the response.');
      return;
    }

    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const baseBackendUrl = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

    // Notify parent window that code was received
    if (window.opener) {
      try {
        window.opener.postMessage(
          {
            type: 'OAUTH_CODE_RECEIVED',
            platform: effectivePlatform,
            code,
            state,
            search: window.location.search,
          },
          '*',
        );
      } catch (e) {
        console.error('Failed to post message to opener:', e);
      }
    }

    // Call exchange-code endpoint on backend
    const currentOrigin = window.location.origin;
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${baseBackendUrl}/integrations/${effectivePlatform}/exchange-code`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        code,
        state,
        redirectUri: currentOrigin,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
          const broadcast = () => {
            if (window.opener) {
              try {
                window.opener.postMessage(
                  { type: 'INTEGRATION_AUTH_SUCCESS', platform: effectivePlatform },
                  '*',
                );
              } catch {}
            }
          };
          broadcast();
          const timer = setInterval(broadcast, 300);
          setTimeout(() => {
            clearInterval(timer);
            broadcast();
            window.close();
          }, 1500);
        } else {
          // If direct API failed, fallback to native backend callback redirect
          const errData = await res.json().catch(() => ({}));
          console.warn('exchange-code failed, trying backend callback redirect:', errData);
          window.location.href = `${baseBackendUrl}/integrations/${effectivePlatform}/callback${window.location.search}`;
        }
      })
      .catch((err) => {
        console.warn('Network error calling exchange-code, redirecting to backend callback:', err);
        window.location.href = `${baseBackendUrl}/integrations/${effectivePlatform}/callback${window.location.search}`;
      });
  }, [code, effectivePlatform, error, state]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0e0e11] text-white p-6 select-none font-sans">
      <div className="text-center p-8 rounded-3xl bg-[#141417] border border-white/[0.1] shadow-2xl max-w-sm w-full flex flex-col items-center gap-4">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2]">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white capitalize">
                Connecting {effectivePlatform}...
              </h3>
              <p className="text-xs text-gray-400">
                Verifying authorization and syncing credentials.
              </p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <CheckCircle2 size={26} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white capitalize">
                {effectivePlatform} Connected!
              </h3>
              <p className="text-xs text-gray-400">
                Account successfully verified. Closing window...
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_24px_rgba(239,68,68,0.3)]">
              <AlertCircle size={26} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">Authentication Failed</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackHandler;
