import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  User,
  Palette,
  Lock,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Check,
  Download,
  Users,
  Radio,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

interface DimensionSetting {
  id: string;
  label: string;
  value: 'Everybody' | 'My Contacts' | 'Nobody';
}

export const InteractivePrivacyControlsMockup: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';

  // Toggle states
  const [isPrivateAccount, setIsPrivateAccount] = useState<boolean>(false);
  const [isNearbyEnabled, setIsNearbyEnabled] = useState<boolean>(true);
  const [isImproveEternal, setIsImproveEternal] = useState<boolean>(false);
  const [isPersonalize, setIsPersonalize] = useState<boolean>(true);
  const [isThirdParty, setIsThirdParty] = useState<boolean>(true);
  const [isDataRequested, setIsDataRequested] = useState<boolean>(false);

  // Dimension settings
  const [dimensions, setDimensions] = useState<DimensionSetting[]>([
    {
      id: 'last_seen',
      label: isUkrainian ? 'Час останнього візиту' : 'Last Seen',
      value: 'Everybody',
    },
    { id: 'avatar', label: isUkrainian ? 'Фото профілю' : 'Profile Photo', value: 'Everybody' },
    { id: 'banner', label: isUkrainian ? 'Банер профілю' : 'Profile Banner', value: 'Everybody' },
    { id: 'bio', label: isUkrainian ? 'Про себе' : 'About', value: 'Everybody' },
    { id: 'birthday', label: isUkrainian ? 'День народження' : 'Birthday', value: 'My Contacts' },
    { id: 'messages', label: isUkrainian ? 'Повідомлення' : 'Messages', value: 'Everybody' },
    { id: 'calls', label: isUkrainian ? 'Дзвінки' : 'Calls', value: 'Everybody' },
    {
      id: 'voice',
      label: isUkrainian ? 'Голосові повідомлення' : 'Voice Messages',
      value: 'Everybody',
    },
    {
      id: 'forward',
      label: isUkrainian ? 'Пересилання повідомлень' : 'Forwarding Messages',
      value: 'Everybody',
    },
    {
      id: 'invites',
      label: isUkrainian ? 'Запрошення до груп' : 'Group Invites',
      value: 'Everybody',
    },
  ]);

  // Auto-play simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);

  const cycleDimensionValue = (id: string) => {
    setDimensions((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextVal =
            d.value === 'Everybody'
              ? 'My Contacts'
              : d.value === 'My Contacts'
                ? 'Nobody'
                : 'Everybody';
          return { ...d, value: nextVal };
        }
        return d;
      }),
    );
  };

  const handleReset = () => {
    setIsPrivateAccount(false);
    setIsNearbyEnabled(true);
    setIsImproveEternal(false);
    setIsPersonalize(true);
    setIsThirdParty(true);
    setIsDataRequested(false);
    setDimensions((prev) =>
      prev.map((d) => ({
        ...d,
        value: d.id === 'birthday' ? 'My Contacts' : 'Everybody',
      })),
    );
    setIsPlaying(false);
    setActiveStep(0);
  };

  // Auto-play loop simulating user interactions like a live interactive GIF
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % 6;
        if (next === 1) {
          setIsPrivateAccount((v) => !v);
        } else if (next === 2) {
          setDimensions((dList) =>
            dList.map((d) =>
              d.id === 'last_seen' || d.id === 'calls'
                ? { ...d, value: d.value === 'Everybody' ? 'My Contacts' : 'Everybody' }
                : d,
            ),
          );
        } else if (next === 3) {
          setIsImproveEternal((v) => !v);
        } else if (next === 4) {
          setIsNearbyEnabled((v) => !v);
        } else if (next === 5) {
          setIsThirdParty((v) => !v);
        }
        return next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="my-10 rounded-[32px] bg-[#0c0919] border border-purple-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
      {/* Interactive Control Header */}
      <div className="p-4 sm:p-6 bg-[#120e24] border-b border-purple-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                {isUkrainian ? 'Інтерактивний симулятор' : 'Live Interactive Demo'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                Active
              </span>
            </div>
            <p className="text-xs text-neutral-300">
              {isUkrainian
                ? 'Клікайте на перемикачі для зміни налаштувань або запустіть автопоказ'
                : 'Click any switch to toggle or start the auto-play tutorial walkthrough'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{isUkrainian ? 'Пауза' : 'Pause'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{isUkrainian ? 'Автопоказ' : 'Auto-Play'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors border border-white/10"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isUkrainian ? 'Скинути' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Simulated Desktop Window */}
      <div className="p-4 sm:p-8">
        <div className="rounded-2xl bg-[#090714] border border-white/10 shadow-2xl overflow-hidden">
          {/* Window Mac-style Titlebar */}
          <div className="px-4 py-3 bg-[#130f26] border-b border-white/10 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              <span className="ml-3 text-xs font-bold text-neutral-300">
                Eternal Settings — Data & Privacy
              </span>
            </div>
            <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
              User Settings &gt; Privacy &gt; Profile Privacy
            </span>
          </div>

          {/* Window Main Grid: Settings Sidebar + Privacy View */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
            {/* Left Settings Sidebar */}
            <div className="md:col-span-4 bg-[#0e0a1f] border-r border-white/10 p-4 flex flex-col gap-5 select-none">
              {/* User Identity Card */}
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                    EM
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0e0a1f]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">Eternal User</p>
                  <p className="text-xs text-purple-300/70 truncate">@eternal_user</p>
                </div>
              </div>

              {/* Search in Settings */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  readOnly
                  placeholder={isUkrainian ? 'Пошук у налаштуваннях...' : 'Search settings...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white/[0.03] border border-white/10 text-neutral-300 focus:outline-none"
                />
              </div>

              {/* Category Tree */}
              <nav className="flex flex-col gap-1 text-xs font-medium">
                {/* Account */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{isUkrainian ? 'Акаунт' : 'Account'}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </div>

                {/* Appearance */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{isUkrainian ? 'Зовнішній вигляд' : 'Appearance'}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-neutral-500" />
                </div>

                {/* Security */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{isUkrainian ? 'Безпека' : 'Security'}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-neutral-500" />
                </div>

                {/* Privacy - ACTIVE */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-600/20 text-white font-bold border-l-2 border-purple-500">
                    <div className="flex items-center gap-2 text-purple-300">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{isUkrainian ? 'Конфіденційність' : 'Privacy'}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-purple-400" />
                  </div>

                  {/* Sub-items */}
                  <div className="pl-6 flex flex-col gap-1">
                    <button
                      type="button"
                      className="text-left px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-200 font-semibold text-xs flex items-center justify-between"
                    >
                      <span>{isUkrainian ? 'Приватність профілю' : 'Profile Privacy'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    </button>
                    <button
                      type="button"
                      className="text-left px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white text-xs"
                    >
                      <span>{isUkrainian ? 'Заблоковані користувачі' : 'Blocked Users'}</span>
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{isUkrainian ? 'Сповіщення' : 'Notifications'}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-neutral-500" />
                </div>
              </nav>
            </div>

            {/* Right Settings Detail Panel */}
            <div className="md:col-span-8 p-5 sm:p-7 flex flex-col gap-6 overflow-y-auto max-h-[620px]">
              {/* Private Account Card Toggle */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 transition-all hover:border-purple-500/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">
                      {isUkrainian ? 'Приватний акаунт' : 'Private Account'}
                    </p>
                    {isPrivateAccount && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {isUkrainian ? 'Увімкнено' : 'Enabled'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {isUkrainian
                      ? 'Лише схвалені вами підписники можуть переглядати профіль, фото та історії.'
                      : 'When enabled, only approved followers can view your profile, posts, and media.'}
                  </p>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsPrivateAccount(!isPrivateAccount)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer focus:outline-none ${
                    isPrivateAccount
                      ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 transform ${
                      isPrivateAccount ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Recommendations & Discovery Toggle */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 transition-all hover:border-purple-500/30">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {isUkrainian ? 'Рекомендації та радар поруч' : 'Recommendations & Discovery'}
                  </p>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {isUkrainian
                      ? 'Дозволити платформі Eternal рекомендувати ваш профіль спільним знайомим.'
                      : 'Allow Eternal to suggest your profile to mutual contacts and local community radars.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNearbyEnabled(!isNearbyEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer focus:outline-none ${
                    isNearbyEnabled
                      ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 transform ${
                      isNearbyEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* WHO CAN SEE YOU AND CONTACT YOU Group */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 px-1">
                  {isUkrainian
                    ? 'Хто може вас бачити та контактувати'
                    : 'Who Can See You and Contact You'}
                </h4>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
                  {dimensions.map((dim) => (
                    <div
                      key={dim.id}
                      onClick={() => cycleDimensionValue(dim.id)}
                      className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <span className="text-xs font-medium text-neutral-200 group-hover:text-white transition-colors">
                        {dim.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-lg border transition-all ${
                            dim.value === 'Everybody'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : dim.value === 'My Contacts'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {dim.value}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* HOW ETERNAL USES YOUR DATA (Telemetry & Privacy) */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 px-1">
                  {isUkrainian ? 'Як Eternal використовує ваші дані' : 'How Eternal Uses Your Data'}
                </h4>

                <div className="space-y-2.5">
                  {/* Telemetry Switch */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isUkrainian
                          ? 'Покращення платформи Eternal'
                          : 'Use data to improve Eternal'}
                      </p>
                      <p className="text-[11px] text-neutral-300">
                        {isUkrainian
                          ? 'Анонімна діагностика та оптимізація швидкості сервера.'
                          : 'Anonymous diagnostics, crash metrics, and latency optimization.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsImproveEternal(!isImproveEternal)}
                      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                        isImproveEternal ? 'bg-purple-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                          isImproveEternal ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Personalization Switch */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isUkrainian
                          ? 'Персоналізований контент'
                          : 'Personalize my content & explore experience'}
                      </p>
                      <p className="text-[11px] text-neutral-300">
                        {isUkrainian
                          ? 'Алгоритмічний підбір рекомендованих спільнот і тем.'
                          : 'Recommends servers and public spaces based on your interests.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPersonalize(!isPersonalize)}
                      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                        isPersonalize ? 'bg-purple-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                          isPersonalize ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Third Party Switch */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isUkrainian
                          ? 'Інтеграції та активність'
                          : 'Allow third-party rich presence integrations'}
                      </p>
                      <p className="text-[11px] text-neutral-300">
                        {isUkrainian
                          ? 'Трансляція статусу Spotify, Steam або GitHub у профілі.'
                          : 'Broadcasts linked activity status (Spotify, Steam, GitHub) to mutual spaces.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsThirdParty(!isThirdParty)}
                      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                        isThirdParty ? 'bg-purple-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                          isThirdParty ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Request Your Data Card */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-purple-200">
                    {isUkrainian ? 'Запит копії персональних даних' : 'Request All of My Data'}
                  </p>
                  <p className="text-[11px] text-neutral-300">
                    {isUkrainian
                      ? 'Отримайте повний зашифрований архів JSON усіх повідомлень та налаштувань.'
                      : 'Download a complete JSON package of your profile history and messages.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDataRequested(true)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isDataRequested
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  }`}
                >
                  {isDataRequested ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isUkrainian ? 'Запит надіслано!' : 'Package Requested!'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{isUkrainian ? 'Запросити архів' : 'Request Data Package'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
