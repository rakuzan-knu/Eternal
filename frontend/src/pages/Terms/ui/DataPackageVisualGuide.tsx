import React, { useState } from 'react';
import {
  User as UserIcon,
  Palette,
  Shield,
  Hand,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Download,
  CheckSquare,
  Square,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

export const DataPackageVisualGuide: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';

  const [activeTab, setActiveTab] = useState<'account' | 'privacy' | 'security'>('privacy');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'account',
    'activity',
    'messages',
    'servers',
  ]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleModalSubmit = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setIsModalOpen(false);
    }, 1200);
  };

  return (
    <div className="my-8 flex flex-col gap-3">
      {/* Minimalist Hint Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-gray-300">
            {isUkrainian ? 'Інтерактивний макет налаштувань' : 'Interactive Settings Preview'}
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">
            {isUkrainian
              ? 'Натисніть кнопку «Request Data» для виклику модального вікна'
              : 'Click "Request Data" to open the request package modal'}
          </span>
        </span>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
        >
          <Download size={13} />
          <span>{isUkrainian ? 'Відкрити вікно експорту' : 'Open Request Modal'}</span>
        </button>
      </div>

      {/* 1:1 EditProfileModal Replica Container */}
      <div className="relative flex flex-col sm:flex-row w-full max-w-full h-[580px] bg-[#0c0c0e]/95 backdrop-blur-2xl rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden border border-white/[0.08] select-none">
        {/* Fake Close Button matching EditProfileModal */}
        <div className="absolute top-4 right-4 z-30 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 cursor-pointer">
          <X size={18} />
        </div>

        {/* Left Sidebar (1:1 with EditProfileModal) */}
        <div className="w-full sm:w-[280px] bg-[#09090b]/95 border-b sm:border-b-0 sm:border-r border-white/[0.06] p-4 flex flex-col gap-4 shrink-0 overflow-hidden">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
              EU
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-white font-bold text-sm truncate">User</span>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate">
                <span>Edit profile...</span>
                <Pencil size={10} className="shrink-0" />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              readOnly
              placeholder="Search"
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Nav Categories */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {/* Account */}
            <div
              onClick={() => setActiveTab('account')}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon size={16} className="text-gray-400" />
                <span>Account</span>
              </div>
              <ChevronDown size={14} className="text-gray-500" />
            </div>

            {/* Appearance */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Palette size={16} className="text-gray-400" />
                <span>Appearance</span>
              </div>
              <ChevronRight size={14} className="text-gray-500" />
            </div>

            {/* Security */}
            <div
              onClick={() => setActiveTab('security')}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Shield size={16} className="text-gray-400" />
                <span>Security</span>
              </div>
              <ChevronRight size={14} className="text-gray-500" />
            </div>

            {/* Privacy (ACTIVE) */}
            <div className="flex flex-col gap-0.5 pt-0.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.08] text-white font-semibold text-xs transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Hand size={16} className="text-white" />
                  <span>Privacy</span>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </div>

              {/* Subsections with left glow indicator line matching EditProfileModal */}
              <div className="relative flex flex-col gap-0.5 pl-6 py-1">
                <div className="absolute left-[9px] top-1 bottom-1 w-[2px] bg-white/[0.08] rounded-full" />
                <div className="absolute left-[8px] top-1.5 h-6 w-[3px] bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.9)]" />

                <button
                  type="button"
                  className="text-left px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-white/[0.06]"
                >
                  Profile Privacy
                </button>
                <button
                  type="button"
                  className="text-left px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]"
                >
                  Blocked Users
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Bell size={16} className="text-gray-400" />
                <span>Notifications</span>
              </div>
              <ChevronRight size={14} className="text-gray-500" />
            </div>
          </div>
        </div>

        {/* Right Content Panel (1:1 with PrivacyTab in EditProfileModal) */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Who can see you and contact you */}
          <section className="space-y-2">
            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Who can see you and contact you
            </h3>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
              {[
                { title: 'Last Seen', value: 'Everybody' },
                { title: 'Profile Photo', value: 'Everybody' },
                { title: 'Profile Banner', value: 'Everybody' },
                { title: 'About', value: 'Everybody' },
                { title: 'Birthday', value: 'Everybody' },
                { title: 'Messages', value: 'Everybody' },
                { title: 'Calls', value: 'Everybody' },
              ].map((row) => (
                <div
                  key={row.title}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-xs font-medium text-gray-200">{row.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{row.value}</span>
                    <ChevronRight size={14} className="text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Request All of My Data Section (Matching our exact PrivacyTab integration) */}
          <section className="p-4 rounded-2xl border border-purple-500/20 bg-purple-950/[0.15] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">Request All of My Data</p>
              <p className="text-xs text-neutral-300">
                Request an encrypted ZIP package with your account records, messages, and activity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all shrink-0"
            >
              Request Data
            </button>
          </section>
        </div>

        {/* Embedded Interactive RequestDataPackageModal */}
        {isModalOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div
              className="w-full max-w-lg bg-[#110e22] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92%]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#16122d]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                    <Download size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {isUkrainian
                        ? 'Запросити архів даних Eternal'
                        : 'Request Your Eternal Data Package'}
                    </h4>
                    <p className="text-[11px] text-purple-300/80">
                      {isUkrainian
                        ? 'Виберіть категорії інформації для включення в ZIP-архів'
                        : 'Select the information categories you want to include'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
                {/* 30-day Notice */}
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-2.5 text-xs text-neutral-300">
                  <Clock size={15} className="text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    {isUkrainian
                      ? 'Збір архіву може тривати до 30 днів. Посилання для завантаження надійде на вашу електронну пошту та діятиме 30 днів.'
                      : 'Compiling your personal data package can take up to 30 days. The download link sent to your email will remain active for 30 days.'}
                  </p>
                </div>

                {/* Categories */}
                <div className="space-y-1.5">
                  {[
                    {
                      id: 'account',
                      title: isUkrainian ? 'Уліковий запис' : 'Account Information',
                    },
                    {
                      id: 'activity',
                      title: isUkrainian ? 'Ваша активність' : 'Your Activity & Analytics',
                    },
                    {
                      id: 'activities',
                      title: isUkrainian ? 'Активності та ігри' : 'Activities & Integrations',
                    },
                    {
                      id: 'messages',
                      title: isUkrainian ? 'Повідомлення' : 'Messages & Media Transcripts',
                    },
                    {
                      id: 'servers',
                      title: isUkrainian ? 'Сервери та спільноти' : 'Servers & Communities',
                    },
                    {
                      id: 'ads',
                      title: isUkrainian ? 'Реклама та огляд' : 'Advertising & Personalization',
                    },
                    {
                      id: 'support',
                      title: isUkrainian
                        ? 'Звернення до підтримки'
                        : 'Support Tickets & Safety Appeals',
                    },
                  ].map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-600/15 border-purple-500/40 text-white'
                            : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="font-medium">{cat.title}</span>
                        {isSelected ? (
                          <CheckSquare size={16} className="text-purple-400 shrink-0" />
                        ) : (
                          <Square size={16} className="text-neutral-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#16122d] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10"
                >
                  {isUkrainian ? 'Я передумав(ла)' : 'I changed my mind'}
                </button>

                <button
                  type="button"
                  onClick={handleModalSubmit}
                  disabled={selectedCategories.length === 0 || isSubmitted}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSubmitted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{isUkrainian ? 'Прийнято!' : 'Submitted!'}</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>{isUkrainian ? 'Запросити мої дані' : 'Request My Data'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
