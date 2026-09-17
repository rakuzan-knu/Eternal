import { Check, Flag, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useReportReel } from '../api/reelsApi';

interface ReelReportModalProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_CATEGORIES = [
  { id: 'SPAM', label: 'Спам або оманлива інформація' },
  { id: 'HARASSMENT', label: 'Цькування або залякування' },
  { id: 'HATE_SPEECH', label: 'Мова ворожнечі або дискримінація' },
  { id: 'VIOLENCE', label: 'Насильство або небезпечний контент' },
  { id: 'INAPPROPRIATE', label: 'Неприйнятний або відвертий вміст' },
  { id: 'OTHER', label: 'Інше порушення' },
];

export const ReelReportModal: React.FC<ReelReportModalProps> = ({
  reelId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('SPAM');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const reportMutation = useReportReel();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportMutation.mutateAsync({
        reelId,
        category: selectedCategory,
        details: details.trim() || undefined,
      });
      setIsSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setIsSubmitted(false);
        setDetails('');
      }, 1500);
    } catch {
      // Handled via mutation state
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#18181b]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg">Поскаржитися на відео</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h4 className="text-lg font-bold text-white">Скаргу надіслано</h4>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Дякуємо за пильність. Наша команда модерації перевірить цей контент протягом 24 годин.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-zinc-400">
              Оберіть причину, чому це відео не повинно показуватися:
            </p>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {REPORT_CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-red-500/10 border-red-500/50 text-white'
                      : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <span>{cat.label}</span>
                  <input
                    type="radio"
                    name="reportReason"
                    value={cat.id}
                    checked={selectedCategory === cat.id}
                    onChange={() => setSelectedCategory(cat.id)}
                    className="accent-red-500"
                  />
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Додаткові коментарі (необов'язково):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Опишіть деталі порушення..."
                rows={2}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={reportMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {reportMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Надсилання...
                  </>
                ) : (
                  'Надіслати скаргу'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
