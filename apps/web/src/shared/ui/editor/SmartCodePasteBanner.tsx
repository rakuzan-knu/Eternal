import React from 'react';
import { Code, FileText, X, Sparkles } from 'lucide-react';
import { DetectedCodeSnippet } from '@/shared/lib/editor/smartCodeDetection';

export interface SmartCodePasteBannerProps {
  snippet: DetectedCodeSnippet;
  onFormatMarkdown: () => void;
  onAttachAsFile: () => void;
  onDismiss: () => void;
}

export function SmartCodePasteBanner({
  snippet,
  onFormatMarkdown,
  onAttachAsFile,
  onDismiss,
}: SmartCodePasteBannerProps) {
  const langLabel = snippet.language ? snippet.language.toUpperCase() : 'CODE';

  return (
    <div className="mx-4 mb-2 p-2.5 rounded-2xl bg-[#141522]/95 border border-purple-500/30 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] animate-popIn flex items-center justify-between gap-3 text-xs">
      {/* Left: Info icon and description */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
          <Code size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-white truncate">
            <Sparkles size={12} className="text-amber-400 shrink-0" />
            <span>Code snippet detected</span>
            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-[10px] font-mono border border-purple-400/30 font-bold">
              {langLabel}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            {snippet.lineCount} lines pasted. Format neatly into your message?
          </div>
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Markdown format button */}
        <button
          type="button"
          onClick={onFormatMarkdown}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-medium transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <Code size={13} />
          <span>Format</span>
        </button>

        {/* Attach as snippet file */}
        <button
          type="button"
          onClick={onAttachAsFile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-medium transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <FileText size={13} />
          <span>Snippet (.txt)</span>
        </button>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default SmartCodePasteBanner;
