import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  useLanguageStore,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../lib/language/languageStore';
import { getLegalTranslation } from '../../pages/Privacy/data/privacyTranslations';
import { useAuthStore } from '../model/useAuthStore';
import { useAccountsStore } from '../model/useAccountsStore';
import { useCookieConsentStore } from '../../features/cookies/model/useCookieConsentStore';
import { CookiePreferencesModal } from '../../features/cookies/ui/CookiePreferencesModal';
import { CookieConsentBanner } from '../../features/cookies/ui/CookieConsentBanner';

interface FooterLink {
  label: string;
  href: string;
  isRoute?: boolean;
  badge?: string;
  isSoon?: boolean;
  onClick?: () => void;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const EternalFooter: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { currentLanguage, setLanguage } = useLanguageStore();
  const openPreferences = useCookieConsentStore((state) => state.openPreferences);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [openMobileColumns, setOpenMobileColumns] = useState<Record<string, boolean>>({});
  const langRef = useRef<HTMLDivElement>(null);

  const t = getLegalTranslation(currentLanguage).footer;
  const isUk = currentLanguage === 'Українська';

  const handleNavFeed = () => {
    const hasAccounts = useAccountsStore.getState().accounts.length > 0;
    const hasToken = Boolean(
      localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'),
    );
    if (isAuthenticated || hasAccounts || hasToken) {
      navigate('/feed');
    } else {
      navigate('/login');
    }
  };

  const handleNavMessenger = () => {
    const hasAccounts = useAccountsStore.getState().accounts.length > 0;
    const hasToken = Boolean(
      localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'),
    );
    if (isAuthenticated || hasAccounts || hasToken) {
      navigate('/messages');
    } else {
      navigate('/login');
    }
  };

  const toggleColumn = (title: string) => {
    setOpenMobileColumns((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Close language dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const columns: FooterColumn[] = [
    {
      title: t.columns.product,
      links: [
        { label: t.columns.download, href: '/download', isRoute: true },
        { label: t.columns.feedDiscover, href: '#feed', onClick: handleNavFeed },
        { label: t.columns.messenger, href: '#messenger', onClick: handleNavMessenger },
        { label: t.columns.status, href: '#' },
      ],
    },
    {
      title: t.columns.company,
      links: [
        { label: t.columns.about, href: '/company', isRoute: true },
        { label: t.columns.jobs, href: '/careers', isRoute: true, badge: 'Hiring' },
        { label: t.columns.brand, href: '/branding', isRoute: true },
        { label: t.columns.newsroom, href: '/newsroom', isRoute: true },
      ],
    },
    {
      title: t.columns.resources,
      links: [
        { label: t.columns.support, href: '#', isSoon: true },
        { label: t.columns.safety, href: '/safety', isRoute: true },
        { label: t.columns.blog, href: '/blog', isRoute: true },
        { label: t.columns.creators, href: '/creators', isRoute: true },
        { label: t.columns.developers || 'Developers', href: '/terms/developer', isRoute: true },
        {
          label: isUk ? 'Правоохоронцям' : 'Law Enforcement',
          href: '/safety/law-enforcement',
          isRoute: true,
        },
        { label: t.columns.community, href: '#', isSoon: true },
        { label: t.columns.feedback, href: '#', isSoon: true },
      ],
    },
    {
      title: t.columns.policies,
      links: [
        { label: t.columns.terms, href: '/terms', isRoute: true },
        { label: t.columns.privacy, href: '/privacy', isRoute: true },
        {
          label: isUk ? 'Платні послуги' : 'Paid Services',
          href: '/terms/paid-services',
          isRoute: true,
        },
        {
          label: isUk ? 'Авторські права (DMCA)' : 'Copyright & DMCA',
          href: '/copyright',
          isRoute: true,
        },
        { label: t.columns.cookieSettings, href: '#cookie-settings', onClick: openPreferences },
        { label: t.columns.guidelines, href: '/guidelines', isRoute: true },
        { label: t.columns.acknowledgements, href: '/acknowledgements', isRoute: true },
        { label: t.columns.licenses, href: '/licenses', isRoute: true },
        { label: t.columns.companyInfo, href: '/company-information', isRoute: true },
      ],
    },
  ];

  const menuTitle =
    currentLanguage === 'Українська'
      ? 'Меню'
      : currentLanguage === 'Deutsch'
        ? 'Menü'
        : currentLanguage === 'Español'
          ? 'Menú'
          : currentLanguage === '日本語'
            ? 'メニュー'
            : currentLanguage === '한국어'
              ? '메뉴'
              : currentLanguage === '繁體中文'
                ? '選單'
                : currentLanguage === '简体中文'
                  ? '菜单'
                  : 'Menu';

  const renderSocialIcons = () => (
    <div className="flex items-center gap-5 text-white">
      {/* Twitter / X */}
      <a
        href="https://x.com/theeternalnet"
        target="_blank"
        rel="noreferrer"
        className="text-white hover:text-purple-300 hover:scale-110 active:scale-95 transition-all"
        title="X (Twitter)"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      {/* YouTube */}
      <a
        href="https://www.youtube.com/@eternalapp"
        target="_blank"
        rel="noreferrer"
        className="text-white hover:text-purple-300 hover:scale-110 active:scale-95 transition-all"
        title="YouTube"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </a>

      {/* Facebook */}
      <a
        href="https://www.facebook.com/profile.php?id=61594079787704"
        target="_blank"
        rel="noreferrer"
        className="text-white hover:text-purple-300 hover:scale-110 active:scale-95 transition-all"
        title="Facebook"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>

      {/* TikTok */}
      <a
        href="https://www.tiktok.com/@eternalsocial"
        target="_blank"
        rel="noreferrer"
        className="text-white hover:text-purple-300 hover:scale-110 active:scale-95 transition-all"
        title="TikTok"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      </a>
    </div>
  );

  return (
    <footer
      id="eternal-footer"
      className="w-full bg-gradient-to-b from-[#07050f] via-[#1d1242] to-[#45188a] text-white relative overflow-visible select-none"
    >
      {/* Main Footer Container */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Top Brand Block: Logo & Language Selector */}
          <div className="lg:col-span-4 flex flex-col justify-start gap-7">
            {/* Logo Mark Only (Large white 'E') */}
            <div
              className="cursor-pointer inline-flex items-center w-fit"
              onClick={() => navigate(isAuthenticated ? '/' : '/privacy')}
            >
              <span className="text-4xl sm:text-5xl font-black text-white hover:text-purple-300 hover:scale-105 transition-all leading-none">
                E
              </span>
            </div>

            {/* Language Selector Dropdown (Opens downwards with scrollbar 1:1 Discord style) */}
            <div className="relative w-full max-w-sm sm:max-w-xs z-30" ref={langRef}>
              <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block mb-2">
                {t.language}
              </label>
              <button
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#261b52] border border-purple-400/20 text-white hover:bg-[#32236b] transition-all text-sm font-semibold shadow-sm cursor-pointer"
              >
                <span className="font-semibold text-sm">{currentLanguage}</span>
                <ChevronDown
                  className={`w-4 h-4 text-purple-300 transition-transform duration-200 ${
                    isLangOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isLangOpen && (
                <div className="absolute top-full mt-2 left-0 w-full max-h-64 overflow-y-auto rounded-2xl bg-[#5822b4] border border-purple-400/30 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 animate-fadeIn custom-scrollbar py-2">
                  {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        setIsLangOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                        currentLanguage === lang
                          ? 'bg-white/20 text-white font-bold'
                          : 'text-neutral-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{lang}</span>
                      {currentLanguage === lang && (
                        <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Social Media Links */}
            <div className="hidden lg:block">
              <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3">
                {t.social}
              </div>
              {renderSocialIcons()}
            </div>
          </div>

          {/* Desktop Right Columns: Bold Static Columns (Screens >= lg) */}
          <div className="hidden lg:grid lg:col-span-8 grid-cols-4 gap-8">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-4">
                <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  {col.title}
                </span>
                <ul className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.isSoon ? (
                        <div className="text-[15px] font-bold flex items-center gap-2 cursor-not-allowed opacity-50 select-none">
                          <span className="line-through decoration-neutral-400 decoration-[1.5px] text-neutral-400">
                            {link.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/10 text-neutral-300 border border-white/15 leading-none">
                            SOON
                          </span>
                        </div>
                      ) : link.onClick ? (
                        <button
                          type="button"
                          onClick={link.onClick}
                          className="text-[15px] font-bold text-white hover:underline transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                        >
                          <span>{link.label}</span>
                        </button>
                      ) : link.isRoute ? (
                        <Link
                          to={link.href}
                          className="text-[15px] font-bold text-white hover:underline transition-colors flex items-center gap-1.5"
                        >
                          <span>{link.label}</span>
                          {link.badge && (
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#5822b4] text-white">
                              {link.badge}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-[15px] font-bold text-white hover:underline transition-colors flex items-center gap-1.5"
                        >
                          <span>{link.label}</span>
                          {link.badge && (
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#5822b4] text-white">
                              {link.badge}
                            </span>
                          )}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile Accordion Menu (Screens < lg, 1:1 Discord Style) */}
          <div className="lg:hidden w-full flex flex-col pt-2">
            <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-2">
              {menuTitle}
            </div>

            <div className="flex flex-col">
              {columns.map((col) => {
                const isOpen = !!openMobileColumns[col.title];
                return (
                  <div key={col.title} className="border-b border-white/10 flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleColumn(col.title)}
                      className="w-full flex items-center justify-between py-3.5 text-left text-base font-bold text-white hover:text-purple-200 transition-colors cursor-pointer"
                    >
                      <span className="capitalize sm:uppercase text-sm sm:text-base font-bold tracking-wide">
                        {col.title}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-purple-300 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="pb-4 pt-1 pl-2 flex flex-col gap-3 animate-fadeIn">
                        {col.links.map((link) => (
                          <div key={link.label}>
                            {link.isSoon ? (
                              <div className="text-[15px] font-semibold flex items-center gap-2 cursor-not-allowed opacity-50 select-none py-1">
                                <span className="line-through decoration-neutral-400 decoration-[1.5px] text-neutral-400">
                                  {link.label}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/10 text-neutral-300 border border-white/15 leading-none">
                                  SOON
                                </span>
                              </div>
                            ) : link.onClick ? (
                              <button
                                type="button"
                                onClick={link.onClick}
                                className="text-[15px] font-semibold text-white/95 hover:text-white hover:underline transition-colors flex items-center gap-2 py-1 cursor-pointer text-left"
                              >
                                <span>{link.label}</span>
                              </button>
                            ) : link.isRoute ? (
                              <Link
                                to={link.href}
                                className="text-[15px] font-semibold text-white/95 hover:text-white hover:underline transition-colors flex items-center gap-2 py-1"
                              >
                                <span>{link.label}</span>
                                {link.badge && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#5822b4] text-white">
                                    {link.badge}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <a
                                href={link.href}
                                className="text-[15px] font-semibold text-white/95 hover:text-white hover:underline transition-colors flex items-center gap-2 py-1"
                              >
                                <span>{link.label}</span>
                                {link.badge && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#5822b4] text-white">
                                    {link.badge}
                                  </span>
                                )}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Social Media Section (Placed below menu accordions, Discord 1:1) */}
            <div className="mt-8 mb-2">
              <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3">
                {t.social}
              </div>
              {renderSocialIcons()}
            </div>
          </div>
        </div>
      </div>

      {/* Massive Bold Wordmark "Eternal" - Raised up with full visibility */}
      <div className="w-full overflow-hidden select-none pointer-events-none text-center pt-6 pb-2 flex items-center justify-center">
        <span className="text-[110px] sm:text-[170px] md:text-[230px] lg:text-[310px] font-black tracking-tight leading-none text-[#d6cdfa] opacity-95">
          Eternal
        </span>
      </div>

      {/* Cookie Preferences Modal & Consent Banner */}
      <CookiePreferencesModal />
      <CookieConsentBanner />
    </footer>
  );
};
