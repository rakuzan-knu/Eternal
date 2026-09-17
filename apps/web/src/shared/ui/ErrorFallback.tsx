import React from 'react';

export interface ErrorFallbackProps {
  error: unknown;
  componentStack?: string | null;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  componentStack,
  resetError,
}) => {
  if (typeof console !== 'undefined' && console.error) {
    console.error('[ErrorFallback]:', error, componentStack);
  }

  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const errorStack = error instanceof Error ? error.stack : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0b0c] text-gray-200 p-4 font-sans antialiased">
      <div className="max-w-2xl w-full text-center space-y-4 p-8 bg-[#161618] rounded-xl border border-gray-800/80 shadow-2xl animate-fadeIn">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="text-sm text-gray-400">
          An unexpected error occurred in the application. Our team has already received an
          automated bug report.
        </p>
        {import.meta.env.DEV && (
          <div className="mt-4 text-left bg-[#0f0f11] p-4 rounded-lg border border-red-500/30 overflow-auto max-h-96 text-xs font-mono text-red-300">
            <div className="font-bold text-red-400 mb-2">DEV Diagnostic Info:</div>
            <div className="mb-2 font-semibold break-all">{errorMessage}</div>
            {errorStack && (
              <pre className="whitespace-pre-wrap text-gray-400 text-[11px] overflow-x-auto">
                {errorStack}
              </pre>
            )}
            {componentStack && (
              <details className="mt-2 text-gray-500">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Component Stack
                </summary>
                <pre className="whitespace-pre-wrap mt-1 text-[11px] overflow-x-auto">
                  {componentStack}
                </pre>
              </details>
            )}
          </div>
        )}
        <div className="pt-2">
          <button
            onClick={() => {
              resetError();
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};
