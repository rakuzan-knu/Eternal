import React from 'react';
import { Code, FileText, X, Sparkles } from 'lucide-react';
import { DetectedCodeSnippet } from '../lib/smartCodeDetection';

interface SmartCodePasteBannerProps {
  snippet: DetectedCodeSnippet;
  onFormatMarkdown: () => void;
  onAttachAsFile: () => void;
  onDismiss: () => void;
}

export default function SmartCodePasteBanner({
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
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-inner">
          <Code size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-white truncate">
            <Sparkles size={12} className="text-amber-400 flex-shrink-0" />
            <span>Code snippet detected</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/30 text-purple-200 border border-purple-400/30">
              {langLabel}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {snippet.lineCount} lines • Format with syntax highlighting or attach as file
          </p>
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onFormatMarkdown}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md transition-all active:scale-95 cursor-pointer"
          title={`Wrap in \`\`\`${snippet.language}`}
        >
          <Code size={12} />
          <span>Format</span>
        </button>

        <button
          type="button"
          onClick={onAttachAsFile}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-gray-200 hover:text-white font-medium transition-all active:scale-95 cursor-pointer"
          title={`Convert to snippet.${snippet.extension} file`}
        >
          <FileText size={12} />
          <span>As file</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
