import React, { useState } from 'react';
import {
  X,
  Download,
  CheckSquare,
  Square,
  ShieldCheck,
  Clock,
  Mail,
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
    icon: <User className="w-4 h-4 text-purple-400" />,
    titleEn: 'Account Information',
    titleUk: 'Обліковий запис',
    descriptionEn: 'User ID, username, email, avatar history, and account settings.',
    descriptionUk: 'ID користувача, ім’я, e-mail, історія аватарів та налаштування акаунту.',
  },
  {
    id: 'activity',
    icon: <Activity className="w-4 h-4 text-blue-400" />,
    titleEn: 'Your Activity & Analytics',
    titleUk: 'Ваша активність та аналітика',
    descriptionEn: 'Telemetry diagnostics, platform navigation logs, and feature usage.',
    descriptionUk: 'Діагностична телеметрія, логи навігації та використання функцій.',
  },
  {
    id: 'activities',
    icon: <Gamepad2 className="w-4 h-4 text-pink-400" />,
    titleEn: 'Activities & Integrations',
    titleUk: 'Активності та інтеграції',
    descriptionEn: 'Minigames scores, rich presence data (Spotify, Steam, GitHub).',
    descriptionUk: 'Результати міні-ігор, дані статусів активності (Spotify, Steam, GitHub).',
  },
  {
    id: 'messages',
    icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
    titleEn: 'Messages & Media Transcripts',
    titleUk: 'Повідомлення та медіафайли',
    descriptionEn: 'Complete history of sent direct messages and channel posts.',
    descriptionUk: 'Повна історія надісланих особистих повідомлень та дописів у каналах.',
  },
  {
    id: 'servers',
    icon: <Server className="w-4 h-4 text-amber-400" />,
    titleEn: 'Servers & Communities',
    titleUk: 'Сервери та спільноти',
    descriptionEn: 'Servers you own or belong to, assigned roles, and channel permissions.',
    descriptionUk: 'Сервери, в яких ви перебуваєте, призначені ролі та права доступу.',
  },
  {
    id: 'ads',
    icon: <Megaphone className="w-4 h-4 text-indigo-400" />,
    titleEn: 'Personalization & Advertising',
    titleUk: 'Реклама та персоналізація',
    descriptionEn: 'Interactions with featured servers, partner quests, and explore feeds.',
    descriptionUk: 'Взаємодія з рекомендованими серверами, квестами та стрічкою огляду.',
  },
  {
    id: 'support',
    icon: <LifeBuoy className="w-4 h-4 text-rose-400" />,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-xl bg-[#110e22] border border-purple-500/30 rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-[#16122d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isUkrainian
                  ? 'Запросити архів даних Eternal'
                  : 'Request Your Eternal Data Package'}
              </h3>
              <p className="text-xs text-purple-300/80 mt-0.5">
                {isUkrainian
                  ? 'Виберіть категорії інформації для включення в ZIP-архів'
                  : 'Select the information categories you want to include in your ZIP archive'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Timeline & Processing Notice Box */}
          <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/25 flex items-start gap-3 text-xs text-neutral-300 leading-relaxed">
            <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-200">
                {isUkrainian ? 'Терміни підготовки архіву:' : 'Preparation timeframe:'}
              </p>
              <p className="mt-1">
                {isUkrainian
                  ? 'Збір та шифрування персонального архіву може тривати до 30 календарних днів. Коли архів буде готовий, ми надішлемо захищене посилання для завантаження на вашу зареєстровану електронну пошту. Посилання буде активним протягом 30 днів.'
                  : 'Compiling and encrypting your personal data package can take up to 30 calendar days. Once ready, a secure download link will be dispatched to your verified email address. The download link remains active for 30 days.'}
              </p>
            </div>
          </div>

          {/* Select All Toggle Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {isUkrainian ? 'Категорії даних' : 'Data Categories'} ({selectedCategories.length}/
              {DATA_CATEGORIES.length})
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
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
                      ? 'bg-purple-600/15 border-purple-500/40 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="mt-0.5 text-purple-400 shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Square className="w-5 h-5 text-neutral-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span className="text-xs font-bold text-white">
                        {isUkrainian ? category.titleUk : category.titleEn}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-normal">
                      {isUkrainian ? category.descriptionUk : category.descriptionEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-[#16122d] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isUkrainian ? 'Я передумав(ла)' : 'I changed my mind'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedCategories.length === 0 || isSubmitted}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isSubmitted
                ? 'bg-emerald-600 text-white'
                : selectedCategories.length === 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
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
    </div>
  );
};
