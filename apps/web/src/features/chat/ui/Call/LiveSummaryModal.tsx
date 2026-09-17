import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Clock, Users, RefreshCw, Copy, Check, X, Bot } from 'lucide-react';
import {
  globalLiveSummaryEngine,
  LiveSummaryResult,
} from '../../lib/webrtc/rollingLiveSummaryEngine';

interface LiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveSummaryModal({ isOpen, onClose }: LiveSummaryModalProps) {
  const [summary, setSummary] = useState<LiveSummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await globalLiveSummaryEngine.generateSummary();
      setSummary(res);
    } catch {
      // Handled internally by engine fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchSummary();
    }
  }, [isOpen]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!summary) return;
    const text = `📋 Call Summary (Last ${summary.timeRangeMinutes}m)\n\n📌 Current Context:\n${summary.currentContext}\n\n🎯 Key Topics:\n${summary.keyTopics.map((t) => `• ${t}`).join('\n')}\n\n✅ Action Items:\n${summary.actionItems.map((a) => `• ${a}`).join('\n')}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] bg-zinc-950/95 border border-white/15 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white flex flex-col select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-linear-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                «What did I miss?»
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    summary?.provider === 'gemini'
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  {summary?.provider === 'gemini' ? 'Gemini 1.5 Flash' : 'Offline Extractive NLP'}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Instant catch-up summary from the last 15-minute sliding window
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchSummary}
              disabled={isLoading}
              title="Refresh summary"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
            >
              <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4 text-xs scrollbar-thin">
          {/* Metadata chips */}
          <div className="flex items-center gap-3 text-zinc-400">
            <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-full border border-white/5 font-mono text-[11px]">
              <Clock size={12} className="text-cyan-400" />
              {summary?.timeRangeMinutes ?? 0}m recorded
            </span>
            <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-full border border-white/5 font-mono text-[11px]">
              <Users size={12} className="text-emerald-400" />
              {summary?.speakerCount ?? 0} active speakers
            </span>
            <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-full border border-white/5 font-mono text-[11px]">
              <Bot size={12} className="text-purple-400" />
              {summary?.segmentCount ?? 0} segments
            </span>
          </div>

          {/* Current Context Highlight Box */}
          <div className="p-3.5 rounded-2xl bg-linear-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/25">
            <h4 className="text-[11px] uppercase font-bold text-blue-400 tracking-wider mb-1">
              Right Now in Discussion
            </h4>
            <p className="text-zinc-200 text-xs leading-relaxed">
              {summary?.currentContext || 'Listening for speech...'}
            </p>
          </div>

          {/* Key Topics */}
          <div>
            <h4 className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
              Key Topics Discussed
            </h4>
            <div className="space-y-1.5">
              {summary?.keyTopics.map((topic, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span className="text-zinc-300 leading-normal">{topic}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div>
            <h4 className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
              Action Items & Commitments
            </h4>
            <div className="space-y-1.5">
              {summary?.actionItems.map((action, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 flex items-start gap-2.5"
                >
                  <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-zinc-300 leading-normal">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0 mt-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!summary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition disabled:opacity-40"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
