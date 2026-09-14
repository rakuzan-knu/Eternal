import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronDown, Sparkles, Menu, X, ArrowUpRight, Download } from 'lucide-react';
import {
  DropdownSafetyMascot,
  DropdownSupportMascot,
  DropdownBlogMascot,
  DropdownDeveloperMascot,
} from './PrivacyIllustrations';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { getLegalTranslation } from '../data/privacyTranslations';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import { useAccountsStore } from '../../../shared/model/useAccountsStore';

export const PrivacyNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { currentLanguage } = useLanguageStore();
  const t = getLegalTranslation(currentLanguage).navbar;

  const handleOpenEternal = () => {
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

  const [activeDropdown, setActiveDropdown] = useState<
    'safety' | 'support' | 'blog' | 'developers' | null
  >(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<
    'safety' | 'blog' | 'support' | 'developers' | null
  >(null);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const toggleAccordion = (name: 'safety' | 'blog' | 'support' | 'developers') => {
    setMobileAccordion((prev) => (prev === name ? null : name));
  };

  return (
    <>
      <header className="privacy-navbar fixed top-0 left-0 right-0 h-20 bg-[#07050f]/90 border-b border-purple-900/30 backdrop-blur-xl z-50 transition-all select-none">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/company')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-xl font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all duration-300">
              E
            </div>
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-purple-300 transition-colors">
              Eternal
            </span>
          </div>

          {/* Desktop Center Navigation with 1:1 Discord Style Dropdowns (>= 1280px) */}
          <nav className="hidden xl:flex items-center gap-2.5 xl:gap-4 2xl:gap-5">
            {/* Download Link */}
            <Link
              to="/download"
              className="text-sm font-semibold text-white hover:text-purple-300 px-3 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              Download
            </Link>

            {/* 1. Safety & Security Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('safety')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`flex items-center gap-1.5 text-sm font-bold transition-all px-4 py-2 rounded-full cursor-pointer ${
                  activeDropdown === 'safety'
                    ? 'bg-[#5822b4] text-white shadow-lg'
                    : 'text-white hover:text-purple-200'
                }`}
              >
                <span>{t.safety}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === 'safety' ? 'rotate-180 text-white' : 'text-neutral-300'
                  }`}
                />
              </button>

              {/* Dropdown Menu Card (Safety) */}
              {activeDropdown === 'safety' && (
                <div className="absolute top-full -left-16 pt-2 w-[520px] animate-fadeIn z-50">
                  <div className="relative p-8 rounded-[28px] bg-[#5822b4] text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
                    <div className="grid grid-cols-2 gap-8 relative z-10">
                      {/* Column 1: Resources */}
                      <div className="flex flex-col gap-3.5 border-r border-white/10 pr-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                          {t.resourcesTitle}
                        </span>
                        <ul className="flex flex-col gap-2.5">
                          <li>
                            <Link
                              to="/safety-family-center"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.familyCenter}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-library"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.safetyLibrary}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-news"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.safetyNews}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-teen-charter"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.teenCharter}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.playersGuide}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Column 2: Hubs */}
                      <div className="flex flex-col gap-3.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                          {t.hubsTitle}
                        </span>
                        <ul className="flex flex-col gap-2.5">
                          <li>
                            <Link
                              to="/safety-family-center"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.parentHub}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-policies"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.policyHub}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-privacy"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.privacyHub}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-transparency"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.transparencyHub}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-wellbeing"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {t.wellbeingHub}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/safety-law-enforcement"
                              onClick={() => setActiveDropdown(null)}
                              className="text-[15px] font-bold text-white hover:underline transition-all block"
                            >
                              {currentLanguage === 'Українська'
                                ? 'Правоохоронним органам'
                                : 'Law Enforcement'}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Floating 3D Egg Mascot */}
                    <div className="absolute -bottom-6 -right-3 pointer-events-none drop-shadow-2xl z-20">
                      <img
                        src="/images/safety/egg-3d.png"
                        alt="Safety Mascot Egg"
                        className="w-24 h-24 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Support Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('support')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full cursor-pointer ${
                  activeDropdown === 'support'
                    ? 'bg-[#5822b4] text-white shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="line-through decoration-neutral-400 decoration-[1.5px] text-neutral-300 opacity-75">
                  {t.support}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-white/15 text-neutral-200 border border-white/20 leading-none">
                  SOON
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === 'support' ? 'rotate-180 text-white' : 'text-neutral-300'
                  }`}
                />
              </button>

              {/* Dropdown Menu Card (Support) */}
              {activeDropdown === 'support' && (
                <div className="absolute top-full -left-8 pt-2 w-[340px] animate-fadeIn z-50">
                  <div className="relative p-7 rounded-[28px] bg-[#5822b4] text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
                    <div className="flex flex-col gap-3.5 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                        {t.resourcesTitle}
                      </span>
                      <ul className="flex flex-col gap-3">
                        <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                          <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                            {t.helpCenter}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                            SOON
                          </span>
                        </li>
                        <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                          <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                            {t.feedback}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                            SOON
                          </span>
                        </li>
                        <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                          <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                            {t.submitRequest}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                            SOON
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Mascot */}
                    <div className="absolute -bottom-2 -right-2 pointer-events-none drop-shadow-2xl">
                      <DropdownSupportMascot className="w-28 h-28" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Blog Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('blog')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`flex items-center gap-1.5 text-sm font-bold transition-all px-4 py-2 rounded-full cursor-pointer ${
                  activeDropdown === 'blog'
                    ? 'bg-[#5822b4] text-white shadow-lg'
                    : 'text-white hover:text-purple-200'
                }`}
              >
                <span>{t.blog}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === 'blog' ? 'rotate-180 text-white' : 'text-neutral-300'
                  }`}
                />
              </button>

              {/* Dropdown Menu Card (Blog) */}
              {activeDropdown === 'blog' && (
                <div className="absolute top-full -left-12 pt-2 w-[380px] animate-fadeIn z-50">
                  <div className="relative p-7 rounded-[28px] bg-[#5822b4] text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
                    <div className="flex flex-col gap-3.5 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                        {t.collectionsTitle}
                      </span>
                      <ul className="flex flex-col gap-2.5">
                        <li>
                          <Link
                            to="/blog"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.featured}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/category/community"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.community}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/category/company"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.eternalHq}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/category/engineering"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.engineering}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/category/how-to-eternal"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.howToEternal}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/category/safety"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.policySafety}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/category/product"
                            onClick={() => setActiveDropdown(null)}
                            className="text-[15px] font-bold text-white hover:underline transition-all block"
                          >
                            {t.productFeatures}
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Floating 3D Mascot */}
                    <div className="absolute -bottom-3 -right-2 pointer-events-none drop-shadow-2xl">
                      <DropdownBlogMascot className="w-30 h-30" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Developers Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('developers')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full cursor-pointer ${
                  activeDropdown === 'developers'
                    ? 'bg-[#5822b4] text-white shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="line-through decoration-neutral-400 decoration-[1.5px] text-neutral-300 opacity-75">
                  {t.developers}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-white/15 text-neutral-200 border border-white/20 leading-none">
                  SOON
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === 'developers' ? 'rotate-180 text-white' : 'text-neutral-300'
                  }`}
                />
              </button>

              {/* Dropdown Menu Card (Developers) */}
              {activeDropdown === 'developers' && (
                <div className="absolute top-full -left-20 pt-2 w-[400px] animate-fadeIn z-50">
                  <div className="relative p-7 rounded-[28px] bg-[#5822b4] text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
                    <div className="flex flex-col gap-4 relative z-10">
                      {/* Learn Section */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                          {t.learnTitle}
                        </span>
                        <ul className="flex flex-col gap-2">
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                              {t.eternalForDevs}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                              {t.integration}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                              {t.socialCommerce}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                              {t.appsActivities}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                              {t.devNewsletter}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60">
                              {t.devCaseStudies}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Subtle Divider */}
                      <div className="w-full h-px bg-purple-400/25 my-1" />

                      {/* Build Section */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                          {t.buildTitle}
                        </span>
                        <ul className="flex flex-col gap-2">
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60 flex items-center gap-1">
                              <span>{t.officialCommunities}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60 flex items-center gap-1">
                              <span>{t.devPortal}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60 flex items-center gap-1">
                              <span>{t.documentation}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                          <li className="flex items-center justify-between cursor-not-allowed opacity-60">
                            <span className="text-[15px] font-bold text-white line-through decoration-white/60 flex items-center gap-1">
                              <span>{t.devHelpCenter}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 leading-none">
                              SOON
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Floating 3D Mascot */}
                    <div className="absolute -bottom-3 -right-2 pointer-events-none drop-shadow-2xl">
                      <DropdownDeveloperMascot className="w-30 h-30" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Careers Link */}
            <Link
              to="/careers"
              className="text-sm font-semibold text-white hover:text-purple-300 px-3 py-2 rounded-full transition-colors"
            >
              {t.careers}
            </Link>
          </nav>

          {/* Right Actions: Open Eternal + Hamburger Button (< 1280px) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenEternal}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white hover:bg-neutral-100 active:scale-95 text-black text-xs sm:text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{t.openEternal}</span>
            </button>

            {/* Mobile / Tablet Hamburger Button (< 1280px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="xl:hidden p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 text-white transition-all flex items-center justify-center cursor-pointer shadow-sm shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Discord-Style Fullscreen Backdrop Blur & Slide-Out Drawer Overlay (< 1280px) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[100] animate-fadeInOverlay select-none"
          aria-hidden={!isMobileMenuOpen}
        >
          {/* Full Backdrop Blur Overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-all duration-300 cursor-pointer"
          />

          {/* Slide-out Drawer Panel (Matching Discord 1:1) */}
          <aside
            className="absolute top-0 right-0 h-[100dvh] w-full min-[500px]:w-[380px] sm:min-[500px]:w-[420px] bg-[#5822b4] text-white shadow-[-20px_0_60px_rgba(0,0,0,0.85)] flex flex-col justify-between animate-slideInRight z-10 overscroll-contain min-[500px]:rounded-l-[36px] overflow-hidden"
            style={{
              paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between px-6 pb-4 pt-1 border-b border-white/10 shrink-0">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/company');
                }}
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-xl font-black text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                  E
                </div>
                <span className="text-2xl font-black tracking-tight text-white">Eternal</span>
              </div>

              {/* Close 'X' Button (Discord Style) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Body (Scrollable with natural Discord hierarchy & shrink-0) */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-1 custom-scrollbar overscroll-contain">
              {/* Download */}
              <Link
                to="/download"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between shrink-0"
              >
                <span>Download</span>
              </Link>

              {/* 1. Accordion: Safety */}
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAccordion('safety')}
                  className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between cursor-pointer shrink-0"
                >
                  <span>{t.safety}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-purple-200 transition-transform duration-200 ${
                      mobileAccordion === 'safety' ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {mobileAccordion === 'safety' && (
                  <div className="flex flex-col gap-1 pl-3 pr-1 py-2 shrink-0 animate-fadeIn">
                    {/* Resources Category */}
                    <div className="text-[13px] font-bold tracking-wider uppercase text-purple-200/75 px-3 pt-2 pb-1 shrink-0">
                      {t.resourcesTitle}
                    </div>
                    <Link
                      to="/safety-family-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.familyCenter}
                    </Link>
                    <Link
                      to="/safety-library"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.safetyLibrary}
                    </Link>
                    <Link
                      to="/safety-news"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.safetyNews}
                    </Link>
                    <Link
                      to="/safety-teen-charter"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.teenCharter}
                    </Link>
                    <Link
                      to="/safety"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.playersGuide}
                    </Link>

                    {/* Hubs Category */}
                    <div className="text-[13px] font-bold tracking-wider uppercase text-purple-200/75 px-3 pt-4 pb-1 shrink-0">
                      {t.hubsTitle}
                    </div>
                    <Link
                      to="/safety-family-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.parentHub}
                    </Link>
                    <Link
                      to="/safety-policies"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.policyHub}
                    </Link>
                    <Link
                      to="/safety-privacy"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.privacyHub}
                    </Link>
                    <Link
                      to="/safety-transparency"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.transparencyHub}
                    </Link>
                    <Link
                      to="/safety-wellbeing"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.wellbeingHub}
                    </Link>
                    <Link
                      to="/safety-law-enforcement"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {currentLanguage === 'Українська'
                        ? 'Правоохоронним органам'
                        : 'Law Enforcement'}
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. Accordion: Blog */}
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAccordion('blog')}
                  className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between cursor-pointer shrink-0"
                >
                  <span>{t.blog}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-purple-200 transition-transform duration-200 ${
                      mobileAccordion === 'blog' ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {mobileAccordion === 'blog' && (
                  <div className="flex flex-col gap-1 pl-3 pr-1 py-2 shrink-0 animate-fadeIn">
                    <div className="text-[13px] font-bold tracking-wider uppercase text-purple-200/75 px-3 pt-2 pb-1 shrink-0">
                      {t.collectionsTitle}
                    </div>
                    <Link
                      to="/blog"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.featured}
                    </Link>
                    <Link
                      to="/category/community"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.community}
                    </Link>
                    <Link
                      to="/category/company"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.eternalHq}
                    </Link>
                    <Link
                      to="/category/engineering"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.engineering}
                    </Link>
                    <Link
                      to="/category/how-to-eternal"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.howToEternal}
                    </Link>
                    <Link
                      to="/category/safety"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.policySafety}
                    </Link>
                    <Link
                      to="/category/product"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {t.productFeatures}
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Accordion: Support (SOON) */}
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAccordion('support')}
                  className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white/90 hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between cursor-pointer shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through decoration-neutral-300 decoration-[1.5px] opacity-75">
                      {t.support}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/25 leading-none">
                      SOON
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-purple-200 transition-transform duration-200 ${
                      mobileAccordion === 'support' ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {mobileAccordion === 'support' && (
                  <div className="flex flex-col gap-1 pl-3 pr-1 py-2 shrink-0 animate-fadeIn">
                    <div className="text-[13px] font-bold tracking-wider uppercase text-purple-200/75 px-3 pt-2 pb-1 shrink-0">
                      {t.resourcesTitle}
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.helpCenter}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.feedback}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.submitRequest}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Accordion: Developers (SOON) */}
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAccordion('developers')}
                  className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white/90 hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between cursor-pointer shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through decoration-neutral-300 decoration-[1.5px] opacity-75">
                      {t.developers}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/25 leading-none">
                      SOON
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-purple-200 transition-transform duration-200 ${
                      mobileAccordion === 'developers' ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {mobileAccordion === 'developers' && (
                  <div className="flex flex-col gap-1 pl-3 pr-1 py-2 shrink-0 animate-fadeIn">
                    <div className="text-[13px] font-bold tracking-wider uppercase text-purple-200/75 px-3 pt-2 pb-1 shrink-0">
                      {t.learnTitle}
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.eternalForDevs}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.integration}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.socialCommerce}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                    <div className="text-[13px] font-bold tracking-wider uppercase text-purple-200/75 px-3 pt-4 pb-1 shrink-0">
                      {t.buildTitle}
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.devPortal}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                    <div className="py-2.5 px-3 rounded-xl text-[15px] sm:text-[16px] text-neutral-300 font-medium flex items-center justify-between opacity-60 shrink-0">
                      <span className="line-through">{t.documentation}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        SOON
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Careers */}
              <Link
                to="/careers"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between shrink-0"
              >
                <span>{t.careers}</span>
              </Link>

              {/* Download */}
              <Link
                to="/download"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between shrink-0"
              >
                <span>Download</span>
              </Link>

              {/* Privacy Policy */}
              <Link
                to="/privacy"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3.5 px-3 text-[17px] sm:text-[18px] font-bold text-white hover:bg-white/10 active:bg-white/15 rounded-2xl transition-all flex items-center justify-between shrink-0"
              >
                <span>Privacy Policy</span>
              </Link>
            </div>

            {/* Drawer Bottom Action Buttons (Discord-Style Dual Buttons) */}
            <div className="p-5 border-t border-white/10 bg-black/20 flex flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenEternal();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white font-bold text-base border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>{t.openEternal}</span>
              </button>

              <Link
                to="/download"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-100 active:scale-[0.98] text-black font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all text-center shrink-0"
              >
                <Download className="w-4 h-4 text-black" />
                <span>Download Eternal</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
