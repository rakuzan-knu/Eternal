import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  CheckSquare,
  Square,
  ShieldCheck,
  Clock,
  User,
  Activity,
  Gamepad2,
  MessageSquare,
  Server,
  Megaphone,
  LifeBuoy,
} from 'lucide-react';
import { useLanguageStore } from '../../../../shared/lib/language/languageStore';

interface RequestDataPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DataCategory {
  id: string;
  icon: React.ReactNode;
  titleEn: string;
  titleUk: string;
  descriptionEn: string;
  descriptionUk: string;
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'account',
    icon: <User className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Account Information',
    titleUk: 'Обліковий запис',
    descriptionEn: 'User ID, username, email, avatar history, and account settings.',
    descriptionUk: 'ID користувача, ім’я, e-mail, історія аватарів та налаштування акаунту.',
  },
  {
    id: 'activity',
    icon: <Activity className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Your Activity & Analytics',
    titleUk: 'Ваша активність та аналітика',
    descriptionEn: 'Telemetry diagnostics, platform navigation logs, and feature usage.',
    descriptionUk: 'Діагностична телеметрія, логи навігації та використання функцій.',
  },
  {
    id: 'activities',
    icon: <Gamepad2 className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Activities & Integrations',
    titleUk: 'Активності та інтеграції',
    descriptionEn: 'Minigames scores, rich presence data (Spotify, Steam, GitHub).',
    descriptionUk: 'Результати міні-ігор, дані статусів активності (Spotify, Steam, GitHub).',
  },
  {
    id: 'messages',
    icon: <MessageSquare className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Messages & Media Transcripts',
    titleUk: 'Повідомлення та медіафайли',
    descriptionEn: 'Complete history of sent direct messages and channel posts.',
    descriptionUk: 'Повна історія надісланих особистих повідомлень та дописів у каналах.',
  },
  {
    id: 'servers',
    icon: <Server className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Servers & Communities',
    titleUk: 'Сервери та спільноти',
    descriptionEn: 'Servers you own or belong to, assigned roles, and channel permissions.',
    descriptionUk: 'Сервери, в яких ви перебуваєте, призначені ролі та права доступу.',
  },
  {
    id: 'ads',
    icon: <Megaphone className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Personalization & Advertising',
    titleUk: 'Реклама та персоналізація',
    descriptionEn: 'Interactions with featured servers, partner quests, and explore feeds.',
    descriptionUk: 'Взаємодія з рекомендованими серверами, квестами та стрічкою огляду.',
  },
  {
    id: 'support',
    icon: <LifeBuoy className="w-4 h-4 text-gray-950 dark:text-white" />,
    titleEn: 'Support Tickets & Safety Appeals',
    titleUk: 'Звернення до підтримки та апеляції',
    descriptionEn: 'Correspondence with Eternal Customer Support and Trust & Safety tickets.',
    descriptionUk: 'Листування зі службою підтримки Eternal та апеляції з безпеки.',
  },
];

export const RequestDataPackageModal: React.FC<RequestDataPackageModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    DATA_CATEGORIES.map((c) => c.id),
  );
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedCategories.length === DATA_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(DATA_CATEGORIES.map((c) => c.id));
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  return createPortal(
    <div
      data-modal-open="true"
      data-submodal-open="true"
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div
        className="relative w-full max-w-xl glass-modal border border-black/10 dark:border-white/10 rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-gray-950 dark:text-white backdrop-blur-3xl animate-modalPop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4 bg-black/[0.03] dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-950 dark:text-white shrink-0 shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                {isUkrainian
                  ? 'Запросити архів даних Eternal'
                  : 'Request Your Eternal Data Package'}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {isUkrainian
                  ? 'Виберіть категорії інформації для включення в ZIP-архів'
                  : 'Select the information categories you want to include in your ZIP archive'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Timeline & Processing Notice Box */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex items-start gap-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <Clock className="w-4 h-4 text-gray-950 dark:text-white shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-950 dark:text-white">
                {isUkrainian ? 'Терміни підготовки архіву:' : 'Preparation timeframe:'}
              </p>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {isUkrainian
                  ? 'Збір та шифрування персонального архіву може тривати до 30 календарних днів. Коли архів буде готовий, ми надішлемо захищене посилання для завантаження на вашу зареєстровану електронну пошту. Посилання буде активним протягом 30 днів.'
                  : 'Compiling and encrypting your personal data package can take up to 30 calendar days. Once ready, a secure download link will be dispatched to your verified email address. The download link remains active for 30 days.'}
              </p>
            </div>
          </div>

          {/* Select All Toggle Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isUkrainian ? 'Категорії даних' : 'Data Categories'} ({selectedCategories.length}/
              {DATA_CATEGORIES.length})
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-gray-950 dark:text-white hover:underline transition-colors cursor-pointer"
            >
              {selectedCategories.length === DATA_CATEGORIES.length
                ? isUkrainian
                  ? 'Зняти всі'
                  : 'Deselect All'
                : isUkrainian
                  ? 'Вибрати всі'
                  : 'Select All'}
            </button>
          </div>

          {/* Category Checkboxes List */}
          <div className="space-y-2">
            {DATA_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <div
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/20 shadow-xs'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="mt-0.5 text-gray-950 dark:text-white shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-gray-950 dark:text-white" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span className="text-xs font-bold text-gray-950 dark:text-white">
                        {isUkrainian ? category.titleUk : category.titleEn}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-normal">
                      {isUkrainian ? category.descriptionUk : category.descriptionEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isUkrainian ? 'Я передумав(ла)' : 'I changed my mind'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedCategories.length === 0 || isSubmitted}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSubmitted
                ? 'bg-emerald-600 text-white'
                : selectedCategories.length === 0
                  ? 'bg-black/10 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gray-950 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-md'
            }`}
          >
            {isSubmitted ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{isUkrainian ? 'Запит прийнято!' : 'Request Submitted!'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isUkrainian ? 'Запросити мої дані' : 'Request My Data'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
