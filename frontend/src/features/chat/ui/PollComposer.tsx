import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';

interface PollComposerProps {
  onClose: () => void;
  onCreatePoll?: (question: string, options: string[]) => void;
}

const EXIT_DURATION_MS = 140;

export default function PollComposer({ onClose, onCreatePoll }: PollComposerProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, EXIT_DURATION_MS);
  };

  const updateOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const addOption = () => setOptions((prev) => (prev.length < 8 ? [...prev, ''] : prev));
  const removeOption = (index: number) => setOptions((prev) => prev.filter((_, i) => i !== index));

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && validOptions.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    onCreatePoll?.(question.trim(), validOptions);
    requestClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`absolute left-0 bottom-full mb-3 z-50 w-[340px] max-w-[calc(100vw-32px)] bg-[#181a22]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.7)] p-4 transition-all duration-150 origin-bottom-left ${
        isClosing
          ? 'opacity-0 scale-95 translate-y-1'
          : 'opacity-100 scale-100 translate-y-0 animate-modalPop'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <BarChart2 size={13} />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">Create poll</h3>
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
        >
          <X size={14} />
        </button>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        autoFocus
        className="w-full h-10 px-3.5 mb-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400/50 transition-colors"
      />

      <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2 animate-fadeIn">
            <input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400/50 transition-colors"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-red-400 transition-colors active:scale-90"
                title="Remove option"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 8 && (
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 mb-4 transition-colors active:scale-95 px-1"
        >
          <Plus size={14} /> Add option
        </button>
      )}

      <button
        type="submit"
        disabled={!canCreate}
        className="w-full py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 disabled:from-white/10 disabled:to-white/10 disabled:text-gray-500 text-white transition-all active:scale-[0.98] shadow-lg shadow-purple-500/25 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
      >
        Create poll
      </button>
    </form>
  );
}
