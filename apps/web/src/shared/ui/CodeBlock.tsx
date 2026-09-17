import React, { useState, useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import {
  Check,
  Copy,
  Download,
  Code as CodeIcon,
  Eye,
  ChevronDown,
  ChevronUp,
  FileCode,
} from 'lucide-react';
import CodeSandboxPreview from './CodeSandboxPreview';
import { isRunnableLanguage } from '../lib/codeSandboxUtils';

interface CodeBlockProps {
  language?: string;
  value: string;
  className?: string;
}

interface LanguageMeta {
  displayName: string;
  extension: string;
  badgeClass: string;
}

const LANGUAGE_MAP: Record<string, LanguageMeta> = {
  tsx: {
    displayName: 'TSX',
    extension: 'tsx',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  },
  ts: {
    displayName: 'TypeScript',
    extension: 'ts',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  },
  typescript: {
    displayName: 'TypeScript',
    extension: 'ts',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  },
  jsx: {
    displayName: 'JSX',
    extension: 'jsx',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  js: {
    displayName: 'JavaScript',
    extension: 'js',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  javascript: {
    displayName: 'JavaScript',
    extension: 'js',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  py: {
    displayName: 'Python',
    extension: 'py',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  },
  python: {
    displayName: 'Python',
    extension: 'py',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  },
  cpp: {
    displayName: 'C++',
    extension: 'cpp',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  },
  c: {
    displayName: 'C',
    extension: 'c',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  },
  cs: {
    displayName: 'C#',
    extension: 'cs',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  csharp: {
    displayName: 'C#',
    extension: 'cs',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  rs: {
    displayName: 'Rust',
    extension: 'rs',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  },
  rust: {
    displayName: 'Rust',
    extension: 'rs',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  },
  go: {
    displayName: 'Go',
    extension: 'go',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  },
  golang: {
    displayName: 'Go',
    extension: 'go',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  },
  html: {
    displayName: 'HTML',
    extension: 'html',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  },
  htm: {
    displayName: 'HTML',
    extension: 'html',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  },
  svg: {
    displayName: 'SVG',
    extension: 'svg',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  css: {
    displayName: 'CSS',
    extension: 'css',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  },
  scss: {
    displayName: 'SCSS',
    extension: 'scss',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  },
  json: {
    displayName: 'JSON',
    extension: 'json',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  yaml: {
    displayName: 'YAML',
    extension: 'yaml',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
  },
  yml: {
    displayName: 'YAML',
    extension: 'yml',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
  },
  sql: {
    displayName: 'SQL',
    extension: 'sql',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
  },
  sh: {
    displayName: 'Bash',
    extension: 'sh',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  bash: {
    displayName: 'Bash',
    extension: 'sh',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  zsh: {
    displayName: 'Zsh',
    extension: 'zsh',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  shell: {
    displayName: 'Shell',
    extension: 'sh',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  java: {
    displayName: 'Java',
    extension: 'java',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-400/30',
  },
  kt: {
    displayName: 'Kotlin',
    extension: 'kt',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  },
  kotlin: {
    displayName: 'Kotlin',
    extension: 'kt',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  },
  md: {
    displayName: 'Markdown',
    extension: 'md',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  },
  markdown: {
    displayName: 'Markdown',
    extension: 'md',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  },
  diff: {
    displayName: 'Diff',
    extension: 'diff',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  patch: {
    displayName: 'Patch',
    extension: 'patch',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
};

function getLanguageMeta(rawLang?: string): LanguageMeta {
  const normalized = (rawLang || '').toLowerCase().trim();
  if (normalized && LANGUAGE_MAP[normalized]) {
    return LANGUAGE_MAP[normalized];
  }
  const fallbackName = normalized ? normalized.toUpperCase() : 'CODE';
  return {
    displayName: fallbackName,
    extension: normalized || 'txt',
    badgeClass: 'bg-white/10 text-purple-300 border-white/10',
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const COLLAPSE_LINE_THRESHOLD = 25;

export default function CodeBlock({ language = '', value, className = '' }: CodeBlockProps) {
  const rawCode = useMemo(() => (value || '').trimEnd(), [value]);
  const lines = useMemo(() => rawCode.split('\n'), [rawCode]);
  const lineCount = lines.length;
  const byteSize = useMemo(() => new Blob([rawCode]).size, [rawCode]);

  const langMeta = useMemo(() => getLanguageMeta(language), [language]);
  const runnable = useMemo(() => isRunnableLanguage(language), [language]);

  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldCollapse = lineCount > COLLAPSE_LINE_THRESHOLD;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rawCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = rawCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = new Blob([rawCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `snippet.${langMeta.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download snippet:', err);
    }
  };

  return (
    <div
      className={`group/codeblock relative my-2.5 w-full min-w-0 max-w-full rounded-xl overflow-hidden bg-[#101118]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-200 select-text ${className}`}
    >
      {/* Header Bar (~32px) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161722]/95 border-b border-white/10 text-xs font-mono select-none">
        {/* Left: macOS Window Controls & Language Badge & Metrics */}
        <div className="flex items-center gap-2 min-w-0">
          {/* macOS window control dots */}
          <div className="flex items-center gap-1.5 mr-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90 border border-[#e0443e]/40 shadow-xs" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90 border border-[#dea123]/40 shadow-xs" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90 border border-[#1aab29]/40 shadow-xs" />
          </div>

          {/* Language Pill */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold border ${langMeta.badgeClass}`}
          >
            <FileCode size={11} className="stroke-[2.2]" />
            <span>{langMeta.displayName}</span>
          </span>

          {/* Metrics */}
          <span className="hidden sm:inline-block text-[10.5px] text-white/40 font-mono tracking-tight truncate">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {formatBytes(byteSize)}
          </span>
        </div>

        {/* Right: Actions (Run/Code toggle, Copy, Download) */}
        <div className="flex items-center gap-1.5">
          {runnable && (
            <div className="flex items-center rounded-lg bg-black/40 border border-white/10 p-0.5 mr-1">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-sans font-medium transition-colors cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-purple-600/60 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <CodeIcon size={11} />
                <span>Code</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-sans font-medium transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-emerald-600/60 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye size={11} />
                <span>Preview</span>
              </button>
            </div>
          )}

          {/* Download snippet */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={`Download as snippet.${langMeta.extension}`}
          >
            <Download size={13} />
          </button>

          {/* Copy snippet button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-medium transition-all cursor-pointer ${
              isCopied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
            title="Copy raw code"
          >
            {isCopied ? (
              <>
                <Check size={12} className="text-emerald-400 stroke-[2.5]" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Area (Code vs Preview) */}
      {activeTab === 'preview' && runnable ? (
        <CodeSandboxPreview code={rawCode} language={language || 'html'} />
      ) : (
        <div className="relative">
          {/* Syntax Highlighting Container */}
          <div
            className={`w-full min-w-0 max-w-full overflow-x-auto p-3 text-[12.5px] font-mono leading-relaxed select-text custom-scrollbar ${
              shouldCollapse && !isExpanded ? 'max-h-85 overflow-hidden' : ''
            }`}
          >
            <Highlight
              theme={themes.nightOwl}
              code={rawCode}
              language={(language || 'typescript').toLowerCase()}
            >
              {({ tokens, getLineProps, getTokenProps }) => {
                const isDiff =
                  (language || '').toLowerCase().trim() === 'diff' ||
                  (language || '').toLowerCase().trim() === 'patch';

                return (
                  <pre className="m-0 p-0 bg-transparent font-mono text-[12.5px] leading-relaxed select-text">
                    {tokens.map((line, i) => {
                      const { key: _lineKey, ...lineProps } = getLineProps({ line });
                      const lineContent = line.map((t) => t.content).join('');

                      let diffRowClass = '';
                      if (isDiff) {
                        if (lineContent.startsWith('+') && !lineContent.startsWith('+++')) {
                          diffRowClass =
                            'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500';
                        } else if (lineContent.startsWith('-') && !lineContent.startsWith('---')) {
                          diffRowClass = 'bg-rose-500/10 text-rose-300 border-l-2 border-rose-500';
                        } else if (lineContent.startsWith('@@')) {
                          diffRowClass = 'text-purple-400 font-semibold bg-purple-500/10';
                        }
                      }

                      return (
                        <div
                          key={i}
                          {...lineProps}
                          className={`table-row leading-relaxed ${diffRowClass}`}
                        >
                          {/* Non-selectable Line Number (Copy Fidelity Guarantee) */}
                          <span className="table-cell pr-3.5 select-none pointer-events-none text-white/20 font-mono text-[11px] text-right user-select-none min-w-8">
                            {i + 1}
                          </span>
                          {/* Pure Code Content */}
                          <span className="table-cell select-text break-normal whitespace-pre">
                            {line.map((token, key) => {
                              const { key: _tokenKey, ...tokenProps } = getTokenProps({ token });
                              return <span key={key} {...tokenProps} />;
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </pre>
                );
              }}
            </Highlight>
          </div>

          {/* Expand / Collapse gradient overlay */}
          {shouldCollapse && (
            <div
              className={`relative z-10 ${
                !isExpanded
                  ? 'pt-10 -mt-10 bg-linear-to-t from-[#101118] via-[#101118]/80 to-transparent'
                  : 'border-t border-white/5 bg-[#12131c]/60'
              }`}
            >
              <div className="flex items-center justify-center p-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-purple-200 hover:text-white font-medium transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp size={13} />
                      <span>Collapse code</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} />
                      <span>Show full code ({lineCount} lines)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
