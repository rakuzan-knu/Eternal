import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie, ShieldCheck, Check, Sliders, ExternalLink } from 'lucide-react';
import { useCookieConsentStore } from '../model/useCookieConsentStore';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

export const CookiePreferencesModal: React.FC = () => {
  const {
    isPreferencesOpen,
    closePreferences,
    preferences,
    savePreferences,
    acceptAll,
    rejectNonEssential,
  } = useCookieConsentStore();
  const { currentLanguage } = useLanguageStore();

  const isUk = currentLanguage === 'Українська';

  const [functional, setFunctional] = useState(preferences.functional);
  const [analytics, setAnalytics] = useState(preferences.analytics);

  useEffect(() => {
    if (isPreferencesOpen) {
      setFunctional(preferences.functional);
      setAnalytics(preferences.analytics);
    }
  }, [isPreferencesOpen, preferences]);

  if (!isPreferencesOpen) return null;

  const handleSave = () => {
    savePreferences({ functional, analytics });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-xl rounded-3xl bg-[#0e0a1f] border border-purple-800/40 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isUk ? 'Налаштування файлів Cookie' : 'Cookie Preferences'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isUk
                  ? 'Керуйте дозволами на збір даних для оптимізації роботи Eternal'
                  : 'Manage your data collection preferences across Eternal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intro */}
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
          {isUk
            ? 'Ми використовуємо обов’язкові технології локального збереження для роботи сесій, а також опціональні файли cookie для персоналізації інтерфейсу та вимірювання стабільності мережі. Ви можете налаштувати дозволи нижче або ознайомитися з нашою '
            : 'We use strictly necessary local storage to authenticate your sessions and optional cookies to remember your interface preferences and measure latency. You can customize your preferences below or read our '}
          <Link
            to="/terms/cookie-policy"
            onClick={closePreferences}
            className="text-purple-400 hover:text-purple-300 font-semibold underline inline-flex items-center gap-1"
          >
            {isUk ? 'Політикою Cookie' : 'Cookie Policy'}
            <ExternalLink className="w-3 h-3" />
          </Link>
          .
        </p>

        {/* Categories */}
        <div className="flex flex-col gap-4">
          {/* 1. Strictly Necessary */}
          <div className="p-4 rounded-2xl bg-[#140e2e]/60 border border-purple-800/30 flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  {isUk ? 'Обов’язкові файли (Strictly Necessary)' : 'Strictly Necessary'}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isUk ? 'Завжди активні' : 'Always Active'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-normal">
                {isUk
                  ? 'Необхідні для авторизації, захисту токенів входу та базової безпеки платформи. Їх неможливо вимкнути.'
                  : 'Essential for maintaining secure user sessions, token encryption, and anti-tampering defenses. Cannot be disabled.'}
              </p>
            </div>
            <div className="pt-1">
              <div className="w-11 h-6 rounded-full bg-purple-600/50 flex items-center justify-end px-1 cursor-not-allowed opacity-75">
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          </div>

          {/* 2. Functional */}
          <div className="p-4 rounded-2xl bg-[#140e2e]/60 border border-purple-800/30 flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  {isUk ? 'Функціональні налаштування (Functional)' : 'Functional Preferences'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-normal">
                {isUk
                  ? 'Зберігають вибрану мову інтерфейсу, темну/світлу тему, гучність звуку та обрані параметри мікрофона.'
                  : 'Saves your selected UI language, Dark/Light theme, audio volume levels, and connected device configurations.'}
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setFunctional(!functional)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                  functional ? 'bg-purple-600 justify-end' : 'bg-neutral-700 justify-start'
                }`}
                aria-pressed={functional}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
              </button>
            </div>
          </div>

          {/* 3. Analytics */}
          <div className="p-4 rounded-2xl bg-[#140e2e]/60 border border-purple-800/30 flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Cookie className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  {isUk ? 'Аналітика та продуктивність (Analytics)' : 'Performance & Analytics'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-normal">
                {isUk
                  ? 'Допомагають вимірювати затримку зв’язку WebRTC, швидкість завантаження рилсів і діагностувати збої без трекінгу реклами.'
                  : 'Helps us diagnose WebRTC network latency, reel loading speeds, and crash telemetry without cross-site ad profiling.'}
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAnalytics(!analytics)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                  analytics ? 'bg-purple-600 justify-end' : 'bg-neutral-700 justify-start'
                }`}
                aria-pressed={analytics}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-purple-900/30">
          <button
            type="button"
            onClick={rejectNonEssential}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            {isUk ? 'Відхилити необов’язкові' : 'Decline Optional'}
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-xs font-bold bg-[#1e153d] hover:bg-[#281c52] text-white border border-purple-600/40 transition-colors"
            >
              {isUk ? 'Зберегти вибір' : 'Save Preferences'}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all inline-flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isUk ? 'Прийняти всі' : 'Accept All'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
