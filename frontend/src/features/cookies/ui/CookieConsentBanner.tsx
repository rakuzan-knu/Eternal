import React, { useEffect, useState } from 'react';
import { useCookieConsentStore } from '../model/useCookieConsentStore';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { Cookie, Settings, Check, X, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsentBanner: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUk = currentLanguage === 'Українська';
  const hasConsented = useCookieConsentStore((state) => state.hasConsented);
  const acceptAll = useCookieConsentStore((state) => state.acceptAll);
  const rejectNonEssential = useCookieConsentStore((state) => state.rejectNonEssential);
  const openPreferences = useCookieConsentStore((state) => state.openPreferences);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay slightly to prevent layout shift on initial hydration
    const timer = setTimeout(() => {
      setMounted(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || hasConsented) return null;

  return (
    <aside
      aria-label="Cookie consent"
      className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slideUp select-none"
    >
      <div className="relative p-5 sm:p-6 rounded-3xl bg-[#0e0a1f]/95 border border-purple-600/40 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Content Header */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white tracking-tight">
                {isUk ? 'Налаштування файлів Cookie' : 'Cookie Preferences'}
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-900/60 text-purple-300 border border-purple-700/40">
                GDPR
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed mt-1">
              {isUk
                ? 'Ми використовуємо cookies для автентифікації, збереження налаштувань та оптимізації швидкодії Eternal. Ви можете прийняти всі або налаштувати параметри.'
                : 'We use cookies to secure authentication, preserve your preferences, and optimize Eternal platform performance.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-purple-900/30">
          <button
            type="button"
            onClick={acceptAll}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isUk ? 'Прийняти всі' : 'Accept All'}</span>
          </button>

          <button
            type="button"
            onClick={rejectNonEssential}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold border border-white/10 transition-all cursor-pointer"
          >
            <span>{isUk ? 'Лише обов’язкові' : 'Necessary Only'}</span>
          </button>

          <button
            type="button"
            onClick={openPreferences}
            className="w-full sm:w-auto p-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-700/30 transition-colors cursor-pointer flex items-center justify-center"
            title={isUk ? 'Детальні налаштування' : 'Customize Settings'}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Learn More Link */}
        <div className="mt-2.5 text-center">
          <Link
            to="/terms/cookie-policy"
            className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 hover:underline transition-colors"
          >
            {isUk ? 'Читати повну Політику Cookie →' : 'Read full Cookie Policy →'}
          </Link>
        </div>
      </div>
    </aside>
  );
};
