import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface PollComposerProps {
  onClose: () => void;
}

const EXIT_DURATION_MS = 140;

export default function PollComposer({ onClose }: PollComposerProps) {
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

  return (
    <div
      className={`absolute left-0 bottom-full mb-3 z-50 w-[340px] bg-[#1c1c20]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] p-4 transition-all duration-150 origin-bottom-left ${
        isClosing
          ? 'opacity-0 scale-95 translate-y-1'
          : 'opacity-100 scale-100 translate-y-0 animate-modalPop'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Create poll</h3>
        <button
          onClick={requestClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
        >
          <X size={14} />
        </button>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question"
        className="w-full h-10 px-3 mb-3 rounded-xl bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20"
      />

      <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2 animate-fadeIn">
            <input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(index)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/10 hover:text-red-400 transition-colors active:scale-90"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 8 && (
        <button
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 mb-4 transition-colors active:scale-95"
        >
          <Plus size={14} /> Add option
        </button>
      )}

      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        Polls aren't stored by the backend yet — this needs a Poll model + endpoints added
        server-side before "Create poll" can actually send anything.
      </p>

      <button
        disabled
        title="Backend support for polls doesn't exist yet"
        className="w-full py-2.5 rounded-full text-sm font-semibold bg-white/10 text-gray-500 cursor-not-allowed"
      >
        Create poll
      </button>
    </div>
  );
}
