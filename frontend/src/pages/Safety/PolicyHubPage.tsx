import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { POLICY_HUB_EN, POLICY_HUB_UK, PolicyExplainerItem } from './data/policyHubData';
import {
  PolicyBanHammerIllustration,
  PolicyHeroShieldIllustration,
  PolicyCardThumbnail,
} from './ui/PolicyHubIllustrations';
import { ArrowRight, ShieldCheck, X, FileText, AlertTriangle, ExternalLink } from 'lucide-react';

export const PolicyHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? POLICY_HUB_UK : POLICY_HUB_EN;

  // Active Category Filter
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'user-safety' | 'platform-integrity' | 'regulated' | 'other'
  >('all');

  // Pagination count
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Selected card for detail modal
  const [activeModalItem, setActiveModalItem] = useState<PolicyExplainerItem | null>(null);

  // Filter items
  const filteredItems = data.items.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.category === selectedFilter;
  });

  const displayedItems = filteredItems.slice(0, visibleCount);

  const toggleLoadMore = () => {
    if (visibleCount >= filteredItems.length) {
      setVisibleCount(6);
    } else {
      setVisibleCount(filteredItems.length);
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={data.hero.title || 'Policy Hub'}
        description={data.hero.subtitle}
        canonical="/safety/policies"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Policy Hub', url: '/safety/policies' },
          ],
        }}
      />
      {/* 1. Universal Top Navigation Bar */}
      <PrivacyNavbar />

      <main className="flex-1 w-full flex flex-col gap-16 sm:gap-24 pb-28">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (With Floating 3D Shield & Floating 3D Ban Hammer)        */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#2b186d] via-[#1c0f48] via-45% via-[#120930] via-75% to-[#07050f] pt-36 pb-24 sm:pt-44 sm:pb-32 px-6 lg:px-12 flex items-center justify-center">
          {/* Ambient Purple Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[950px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full relative flex flex-col items-center justify-center text-center">
            {/* Left Floating Shield */}
            <div className="absolute left-0 lg:left-8 top-2 pointer-events-none hidden md:block animate-bounce [animation-duration:6s]">
              <PolicyHeroShieldIllustration />
            </div>

            {/* Right Floating Ban Hammer */}
            <div className="absolute right-0 lg:right-8 top-0 pointer-events-none hidden md:block animate-bounce [animation-duration:5s] [animation-delay:1s]">
              <PolicyBanHammerIllustration />
            </div>

            {/* Center Content */}
            <div className="max-w-3xl space-y-6 z-10 flex flex-col items-center">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
                {data.hero.title}
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto">
                {data.hero.subtitle}
              </p>

              {/* Community Guidelines CTA Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => navigate(data.hero.ctaLink)}
                  className="px-8 py-3.5 rounded-full bg-[#5865f2] hover:bg-[#4752c4] active:scale-95 text-white font-bold text-base transition-all duration-300 shadow-[0_10px_25px_rgba(88,101,242,0.4)] hover:shadow-[0_15px_35px_rgba(88,101,242,0.6)] cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  <span>{data.hero.ctaButton}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. POLICY EXPLAINERS SECTION                                              */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col gap-10">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.explainersSection.title}
            </h2>
            <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              {data.explainersSection.subtitle}
            </p>
          </div>

          {/* Filter Pills Navigation */}
          <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3 py-2">
            <button
              type="button"
              onClick={() => {
                setSelectedFilter('all');
                setVisibleCount(6);
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
              }`}
            >
              {data.explainersSection.filterLabels.all}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('user-safety');
                setVisibleCount(6);
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                selectedFilter === 'user-safety'
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
              }`}
            >
              {data.explainersSection.filterLabels.userSafety}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('platform-integrity');
                setVisibleCount(6);
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                selectedFilter === 'platform-integrity'
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
              }`}
            >
              {data.explainersSection.filterLabels.platformIntegrity}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('regulated');
                setVisibleCount(6);
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                selectedFilter === 'regulated'
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
              }`}
            >
              {data.explainersSection.filterLabels.regulated}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('other');
                setVisibleCount(6);
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                selectedFilter === 'other'
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
              }`}
            >
              {data.explainersSection.filterLabels.other}
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 pt-4">
            {displayedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalItem(item)}
                className="group cursor-pointer flex flex-col gap-4 text-left p-2 rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
              >
                {/* 3D Visual Card Thumbnail */}
                <PolicyCardThumbnail theme={item.colorTheme} />

                {/* Meta Category Tag */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 group-hover:text-purple-400 transition-colors">
                    {item.categoryLabel}
                  </span>
                </div>

                {/* Explainer Title */}
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                  {item.title}
                </h3>

                {/* Summary */}
                <p className="text-sm sm:text-base text-neutral-400 leading-relaxed line-clamp-3">
                  {item.summary}
                </p>

                {/* Read More Link */}
                <div className="flex items-center gap-1.5 text-sm font-bold text-purple-400 group-hover:text-purple-300 group-hover:translate-x-1 transition-all pt-1">
                  <span>{isUkrainian ? 'Читати пояснення' : 'Read Explainer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {filteredItems.length > 6 && (
            <div className="flex justify-center pt-8">
              <button
                type="button"
                onClick={toggleLoadMore}
                className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-xl transition-all duration-300 cursor-pointer"
              >
                {visibleCount >= filteredItems.length
                  ? data.explainersSection.showLess
                  : data.explainersSection.loadMore}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <EternalFooter />

      {/* ========================================================================= */}
      {/* 3. POLICY EXPLAINER DETAILS MODAL                                         */}
      {/* ========================================================================= */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#110e24] border border-purple-500/30 p-6 sm:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalItem(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col gap-2 pr-10">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit">
                {activeModalItem.categoryLabel}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {activeModalItem.title}
              </h3>
            </div>

            {/* Visual Thumbnail */}
            <PolicyCardThumbnail theme={activeModalItem.colorTheme} className="w-full h-36" />

            {/* Summary */}
            <p className="text-base text-neutral-200 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/5">
              {activeModalItem.summary}
            </p>

            {/* Key Policy Tenets List */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{data.explainersSection.keyTakeawaysTitle}</span>
              </h4>
              <ul className="space-y-3">
                {activeModalItem.details.map((detail, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-neutral-300 leading-relaxed flex items-start gap-3 bg-[#171330] p-3.5 rounded-xl border border-white/5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveModalItem(null);
                  navigate('/guidelines');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#5865f2] hover:bg-[#4752c4] active:scale-95 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>{isUkrainian ? 'Повні правила спільноти' : 'Full Community Guidelines'}</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm transition-all cursor-pointer"
              >
                {data.explainersSection.modalClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyHubPage;
