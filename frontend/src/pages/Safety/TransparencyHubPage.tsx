import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import {
  TransparencyHeroShield,
  TransparencyHeroEyes,
  CyberTransparencyConsoleIllustration,
  DsaBookIllustration,
  ModerationArticleIllustration,
  HammerArticleIllustration,
  CommunityArticleIllustration,
} from './ui/TransparencyIllustrations';
import {
  ChevronDown,
  Download,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { TRANSPARENCY_HUB_DATA } from './data/transparencyHubData';

export const TransparencyHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? TRANSPARENCY_HUB_DATA.uk : TRANSPARENCY_HUB_DATA.en;

  // Dropdown states
  const [isReportsDropdownOpen, setIsReportsDropdownOpen] = useState<boolean>(false);
  const [isDsaDropdownOpen, setIsDsaDropdownOpen] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Articles pagination state
  const [visibleArticleCount, setVisibleArticleCount] = useState<number>(3);

  const handleDownload = (reportTitle: string) => {
    setIsReportsDropdownOpen(false);
    setIsDsaDropdownOpen(false);
    setDownloadSuccessToast(
      isUkrainian ? `Завантаження «${reportTitle}» розпочато!` : `Downloading "${reportTitle}"...`,
    );
    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 3500);
  };

  const toggleArticlesCount = () => {
    if (visibleArticleCount >= data.actionSection.articles.length) {
      setVisibleArticleCount(3);
    } else {
      setVisibleArticleCount(data.actionSection.articles.length);
    }
  };

  const renderArticleIllustration = (type: 'moderation' | 'hammer' | 'community') => {
    if (type === 'moderation') return <ModerationArticleIllustration />;
    if (type === 'hammer') return <HammerArticleIllustration />;
    return <CommunityArticleIllustration />;
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={data.hero.title || 'Transparency Hub'}
        description={data.hero.subtitle}
        canonical="/safety/transparency"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Transparency Hub', url: '/safety/transparency' },
          ],
        }}
      />
      {/* Top Navigation */}
      <PrivacyNavbar />

      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl bg-purple-900/90 text-white border border-purple-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{downloadSuccessToast}</span>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col gap-16 sm:gap-24 pb-28">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (With Floating 3D Shield and 3D Eyes)                     */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#2b186d] via-[#1c0f48] via-45% via-[#120930] via-75% to-[#07050f] pt-36 pb-24 sm:pt-44 sm:pb-32 px-6 lg:px-12 flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full relative flex flex-col items-center justify-center text-center">
            {/* Left Floating Shield */}
            <div className="absolute left-0 lg:left-8 top-0 pointer-events-none hidden md:block animate-bounce [animation-duration:6s]">
              <TransparencyHeroShield />
            </div>

            {/* Right Floating Cute Eyes */}
            <div className="absolute right-0 lg:right-8 top-4 pointer-events-none hidden md:block animate-bounce [animation-duration:5s] [animation-delay:1s]">
              <TransparencyHeroEyes />
            </div>

            {/* Center Content */}
            <div className="max-w-3xl space-y-6 z-10">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
                {data.hero.title}
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto">
                {data.hero.subtitle}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. TRANSPARENCY REPORTS SECTION                                           */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Text & Dropdown */}
            <div className="lg:col-span-6 flex flex-col gap-6 text-left">
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {data.reportsSection.title}
              </h2>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
                {data.reportsSection.description}
              </p>

              {/* Download Report Dropdown */}
              <div className="relative inline-block mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReportsDropdownOpen(!isReportsDropdownOpen);
                    setIsDsaDropdownOpen(false);
                  }}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 rounded-full bg-white hover:bg-neutral-200 text-black text-sm font-bold shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all"
                >
                  <span>{data.reportsSection.downloadBtn}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isReportsDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options List */}
                {isReportsDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-72 max-h-80 overflow-y-auto rounded-3xl bg-[#140f29] border border-purple-500/30 p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-40 animate-fadeIn divide-y divide-white/5">
                    {data.reportsSection.reports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => handleDownload(report.title)}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group ${
                          report.isSpecial
                            ? 'bg-purple-600/20 text-purple-200 hover:bg-purple-600/30'
                            : 'text-neutral-200 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{report.title}</span>
                        <Download className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: 3D Holographic Cyber Dashboard Console */}
            <div className="lg:col-span-6 flex items-center justify-center">
              <CyberTransparencyConsoleIllustration />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. DIGITAL SERVICES ACT (DSA) REPORTS SECTION                             */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: 3D DSA Spellbook with D20 Crystal Gemstone */}
            <div className="lg:col-span-6 flex items-center justify-center order-2 lg:order-1">
              <DsaBookIllustration />
            </div>

            {/* Right Column: Text & Dropdown */}
            <div className="lg:col-span-6 flex flex-col gap-6 text-left order-1 lg:order-2">
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {data.dsaSection.title}
              </h2>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
                {data.dsaSection.description}
              </p>

              {/* Download Report Dropdown */}
              <div className="relative inline-block mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDsaDropdownOpen(!isDsaDropdownOpen);
                    setIsReportsDropdownOpen(false);
                  }}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 rounded-full bg-white hover:bg-neutral-200 text-black text-sm font-bold shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all"
                >
                  <span>{data.dsaSection.downloadBtn}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDsaDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options List */}
                {isDsaDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-72 max-h-80 overflow-y-auto rounded-3xl bg-[#140f29] border border-purple-500/30 p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-40 animate-fadeIn divide-y divide-white/5">
                    {data.dsaSection.reports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => handleDownload(report.title)}
                        className="w-full text-left px-4 py-3 rounded-2xl text-xs font-bold text-neutral-200 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between group"
                      >
                        <span>{report.title}</span>
                        <Download className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. TRANSPARENCY IN ACTION (Feature Blog & Safety Articles Grid)          */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full text-center space-y-12">
          <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              {data.actionSection.title}
            </h2>
            <p className="text-base text-neutral-300">{data.actionSection.subtitle}</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.actionSection.articles.slice(0, visibleArticleCount).map((article) => (
              <div
                key={article.id}
                onClick={() => navigate(article.href)}
                className="group rounded-3xl bg-[#110e20] border border-white/5 hover:border-purple-500/40 p-5 flex flex-col gap-4 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] cursor-pointer"
              >
                {/* Visual Graphic Thumbnail */}
                <div className="overflow-hidden rounded-2xl">
                  {renderArticleIllustration(article.illustrationType)}
                </div>

                {/* Category & Read Time */}
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-400 pt-1">
                  <span>{article.category}</span>
                  <span className="text-neutral-500 font-medium lowercase">{article.readTime}</span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                  {article.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                  {article.description}
                </p>

                {/* Read More link */}
                <div className="mt-auto pt-2 flex items-center gap-1 text-xs font-bold text-purple-400 group-hover:text-purple-300">
                  <span>{isUkrainian ? 'Читати повністю' : 'Read Article'}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={toggleArticlesCount}
              className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {visibleArticleCount >= data.actionSection.articles.length
                ? data.actionSection.showLess
                : data.actionSection.loadMore}
            </button>
          </div>
        </section>
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default TransparencyHubPage;
