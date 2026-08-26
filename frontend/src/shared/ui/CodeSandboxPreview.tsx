import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  RotateCw,
  Terminal,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';

export interface ConsoleMessage {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  text: string;
  timestamp: number;
}

interface CodeSandboxPreviewProps {
  code: string;
  language: string;
  title?: string;
  className?: string;
}

const RUNNABLE_LANGS = new Set([
  'html',
  'htm',
  'xhtml',
  'svg',
  'xml',
  'javascript',
  'js',
  'jsx',
  'typescript',
  'ts',
  'tsx',
  'css',
]);

export function isRunnableLanguage(lang: string): boolean {
  const normalized = lang.toLowerCase().trim();
  return RUNNABLE_LANGS.has(normalized);
}

function buildSandboxHtml(rawCode: string, language: string, instanceId: string): string {
  const lang = language.toLowerCase().trim();
  const escapedCode = JSON.stringify(rawCode);

  const consoleInterceptor = `
    <script>
      (function() {
        const INSTANCE_ID = ${JSON.stringify(instanceId)};
        function sendToParent(level, args) {
          try {
            const text = Array.from(args).map(function(arg) {
              if (arg instanceof Error) return arg.stack || arg.message;
              if (typeof arg === 'object' && arg !== null) {
                try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
              }
              return String(arg);
            }).join(' ');
            window.parent.postMessage({
              type: 'SANDBOX_CONSOLE_LOG',
              instanceId: INSTANCE_ID,
              level: level,
              text: text,
              timestamp: Date.now()
            }, '*');
          } catch (e) {}
        }

        const _log = console.log;
        const _warn = console.warn;
        const _error = console.error;
        const _info = console.info;

        console.log = function() { _log.apply(console, arguments); sendToParent('log', arguments); };
        console.warn = function() { _warn.apply(console, arguments); sendToParent('warn', arguments); };
        console.error = function() { _error.apply(console, arguments); sendToParent('error', arguments); };
        console.info = function() { _info.apply(console, arguments); sendToParent('info', arguments); };

        window.onerror = function(message, source, lineno, colno, error) {
          const errText = error ? (error.stack || error.message) : (message + ' (' + lineno + ':' + colno + ')');
          sendToParent('error', [errText]);
          return false;
        };

        window.addEventListener('unhandledrejection', function(event) {
          const reason = event.reason;
          const errText = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
          sendToParent('error', ['Unhandled Promise Rejection: ' + errText]);
        });
      })();
    </script>
  `;

  // HTML or SVG snippet
  if (lang === 'html' || lang === 'htm' || lang === 'svg' || lang === 'xml') {
    if (rawCode.includes('<html') || rawCode.includes('<!DOCTYPE') || rawCode.includes('<body')) {
      // Full document: inject interceptor in head
      if (rawCode.includes('<head>')) {
        return rawCode.replace('<head>', '<head>' + consoleInterceptor);
      }
      return consoleInterceptor + rawCode;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              color: #f3f4f6;
              background-color: #0f1015;
            }
          </style>
          ${consoleInterceptor}
        </head>
        <body>
          ${rawCode}
        </body>
      </html>
    `;
  }

  // CSS snippet
  if (lang === 'css') {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>CSS Preview</title>
          ${consoleInterceptor}
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: system-ui, -apple-system, sans-serif;
              color: #f3f4f6;
              background-color: #0f1015;
            }
            ${rawCode}
          </style>
        </head>
        <body>
          <div class="demo-container">
            <h2>CSS Demo Canvas</h2>
            <p>Applied style preview container</p>
            <button class="btn">Demo Button</button>
            <div class="card">Card Component</div>
          </div>
        </body>
      </html>
    `;
  }

  // React JSX / TSX snippet
  if (
    lang === 'jsx' ||
    lang === 'tsx' ||
    rawCode.includes('import React') ||
    rawCode.includes('export default')
  ) {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>React Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: system-ui, -apple-system, sans-serif;
              color: #f3f4f6;
              background-color: #0f1015;
            }
          </style>
          ${consoleInterceptor}
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            (function() {
              try {
                let code = ${escapedCode};
                
                // Clean up imports and export default
                code = code.replace(/import\\s+.*?from\\s+['"].*?['"];?/g, '');
                code = code.replace(/export\\s+default\\s+function\\s+([A-Za-z0-9_]+)/g, 'function $1');
                code = code.replace(/export\\s+default\\s+/g, 'const __DefaultComponent = ');
                
                // Transpile and evaluate
                const transformed = Babel.transform(code, {
                  presets: ['react', 'env'],
                  filename: 'snippet.tsx'
                }).code;

                // Execute in safe local scope
                const exports = {};
                const module = { exports };
                
                const fn = new Function('React', 'ReactDOM', 'exports', 'module', transformed + '; return typeof App !== "undefined" ? App : (typeof __DefaultComponent !== "undefined" ? __DefaultComponent : Object.values(exports)[0]);');
                const Component = fn(React, ReactDOM, exports, module);

                if (Component) {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(Component));
                } else {
                  document.getElementById('root').innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:8px;">Component rendered or executed successfully.</div>';
                }
              } catch (err) {
                console.error(err);
                document.getElementById('root').innerHTML = '<div style="color:#f87171;background:rgba(239,68,68,0.1);padding:12px;border-radius:8px;font-family:monospace;font-size:12px;border:1px solid rgba(239,68,68,0.2);">' + err.message + '</div>';
              }
            })();
          </script>
        </body>
      </html>
    `;
  }

  // Pure JavaScript / TypeScript execution snippet
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>JS Sandbox</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            color: #f3f4f6;
            background-color: #0f1015;
          }
        </style>
        ${consoleInterceptor}
      </head>
      <body>
        <div id="output" style="font-family: ui-monospace, monospace; font-size: 13px;"></div>
        <script>
          (function() {
            try {
              ${rawCode}
            } catch (err) {
              console.error(err);
            }
          })();
        </script>
      </body>
    </html>
  `;
}

export default function CodeSandboxPreview({
  code,
  language,
  className = '',
}: CodeSandboxPreviewProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const instanceIdRef = useRef<string>(`sandbox-${Math.random().toString(36).slice(2, 9)}`);

  const handleReload = () => {
    setConsoleMessages([]);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (
        data &&
        data.type === 'SANDBOX_CONSOLE_LOG' &&
        data.instanceId === instanceIdRef.current
      ) {
        setConsoleMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-${Math.random()}`,
            level: data.level || 'log',
            text: data.text || '',
            timestamp: data.timestamp || Date.now(),
          },
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const srcDoc = useMemo(() => {
    return buildSandboxHtml(code, language, instanceIdRef.current);
  }, [code, language, reloadKey]);

  const errorCount = consoleMessages.filter((m) => m.level === 'error').length;

  return (
    <div
      className={`flex flex-col w-full rounded-b-xl overflow-hidden bg-[#0c0d12] border-t border-white/10 ${className}`}
    >
      {/* Sandbox Header / Action Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12131b] border-b border-white/5 text-xs text-gray-400 select-none">
        <div className="flex items-center gap-1.5 font-medium">
          <Play size={11} className="text-emerald-400 fill-emerald-400/30" />
          <span className="text-[11px] text-gray-300 font-mono">
            Live Sandbox ({language.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Console Output Toggle Button */}
          <button
            type="button"
            onClick={() => setIsConsoleOpen((open) => !open)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors text-[11px] cursor-pointer ${
              errorCount > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                : consoleMessages.length > 0
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
                  : 'hover:bg-white/10 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Console Output"
          >
            <Terminal size={12} />
            <span>Console</span>
            {consoleMessages.length > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-white/15 font-mono">
                {consoleMessages.length}
              </span>
            )}
            {isConsoleOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Reload Sandbox */}
          <button
            type="button"
            onClick={handleReload}
            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Reload sandbox preview"
          >
            <RotateCw size={12} />
          </button>
        </div>
      </div>

      {/* 100% Isolated Safe IFrame (No allow-same-origin, No allow-top-navigation) */}
      <div className="relative w-full h-52 sm:h-64 bg-[#0a0b0e]">
        <iframe
          key={reloadKey}
          title="Code Sandbox Preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="w-full h-full border-0 bg-[#0f1015]"
        />
      </div>

      {/* Collapsible Sleek Dark Console Output Panel */}
      {isConsoleOpen && (
        <div className="flex flex-col max-h-48 border-t border-white/10 bg-[#0a0a10]/95 backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between px-3 py-1 bg-white/[0.03] border-b border-white/5 text-[10.5px] font-mono text-gray-400">
            <span className="flex items-center gap-1.5">
              <Terminal size={11} className="text-purple-400" />
              <span>Console Output ({consoleMessages.length})</span>
            </span>
            {consoleMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setConsoleMessages([])}
                className="flex items-center gap-1 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear console"
              >
                <Trash2 size={10} />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="p-2 overflow-y-auto custom-scrollbar font-mono text-[11.5px] space-y-1">
            {consoleMessages.length === 0 ? (
              <div className="text-gray-600 italic py-1 px-1">No console output recorded yet.</div>
            ) : (
              consoleMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-1.5 px-2 py-1 rounded border leading-relaxed select-text ${
                    msg.level === 'error'
                      ? 'bg-rose-950/40 border-rose-800/40 text-rose-200'
                      : msg.level === 'warn'
                        ? 'bg-amber-950/40 border-amber-800/40 text-amber-200'
                        : msg.level === 'info'
                          ? 'bg-sky-950/40 border-sky-800/40 text-sky-200'
                          : 'bg-white/[0.02] border-white/5 text-gray-300'
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {msg.level === 'error' && <AlertCircle size={12} className="text-rose-400" />}
                    {msg.level === 'warn' && <AlertTriangle size={12} className="text-amber-400" />}
                    {msg.level === 'info' && <Info size={12} className="text-sky-400" />}
                    {msg.level === 'log' && <span className="text-gray-500 text-[10px]">›</span>}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{msg.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
