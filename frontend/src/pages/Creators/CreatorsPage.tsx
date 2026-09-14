import React, { useState } from 'react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import {
  CREATORS_DATA_EN,
  CREATORS_DATA_UK,
  CreatorArticle,
  CreatorFeaturedGuide,
} from './data/creatorsData';
import {
  CreatorHeroWandIllustration,
  CreatorHeroCameraIllustration,
  CreatorCardThumbnail,
} from './ui/CreatorsIllustrations';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Clock,
  X,
  CheckCircle2,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const CreatorsPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? CREATORS_DATA_UK : CREATORS_DATA_EN;

  // Filter state for Explore section
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'eternal-101' | 'cultivating-community' | 'monetization' | 'safety'
  >('all');

  // Pagination state (initial 3 visible, load more expands)
  const [visibleCount, setVisibleCount] = useState<number>(3);

  // Active guide/article for detail modal
  const [activeItem, setActiveItem] = useState<CreatorArticle | CreatorFeaturedGuide | null>(null);

  // Filtered articles
  const filteredArticles = data.articles.filter((art) => {
    if (selectedFilter === 'all') return true;
    return art.category === selectedFilter;
  });

  const displayedArticles = filteredArticles.slice(0, visibleCount);

  const toggleLoadMore = () => {
    if (visibleCount >= filteredArticles.length) {
      setVisibleCount(3);
    } else {
      setVisibleCount(filteredArticles.length);
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={data.hero.title || 'Creator Portal & Resources'}
        description={data.hero.subtitle}
        canonical="/creators"
        structuredData={{
          breadcrumbs: [{ name: 'Creators Portal', url: '/creators' }],
        }}
      />
      {/* 1. Universal Top Navigation */}
      <PrivacyNavbar />

      <main className="flex-1 flex flex-col">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (Wand on Left, Camera on Right, Welcome in Center)        */}
        {/* ========================================================================= */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-gradient-to-b from-[#281864] via-[#180f42] via-50% to-[#07050f]">
          {/* Ambient radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 text-center lg:text-left">
            {/* Left 3D Magic Wand */}
            <div className="flex-shrink-0 order-2 lg:order-1 animate-bounce [animation-duration:6s]">
              <CreatorHeroWandIllustration />
            </div>

            {/* Center Content */}
            <div className="max-w-2xl flex flex-col items-center text-center order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-xs sm:text-sm font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{data.hero.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                {data.hero.title}
              </h1>

              <p className="text-base sm:text-xl text-neutral-300 font-medium leading-relaxed max-w-xl mx-auto">
                {data.hero.subtitle}
              </p>
            </div>

            {/* Right 3D Studio Camera on Tripod */}
            <div className="flex-shrink-0 order-3 animate-bounce [animation-duration:5s] [animation-delay:1s]">
              <CreatorHeroCameraIllustration />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. FEATURED GUIDES (2-Column Grid of 101 and 201 Playbooks)              */}
        {/* ========================================================================= */}
        <section className="py-12 sm:py-16 bg-[#07050f] relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              {data.featuredGuides.map((guide) => (
                <div
                  key={guide.id}
                  onClick={() => setActiveItem(guide)}
                  className="group cursor-pointer flex flex-col rounded-[32px] bg-[#110e20] border border-white/5 hover:border-purple-500/35 hover:bg-[#16122a] p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.45)] hover:shadow-[0_25px_50px_rgba(147,51,234,0.2)]"
                >
                  {/* Card Thumbnail */}
                  <div className="relative overflow-hidden rounded-[24px]">
                    <CreatorCardThumbnail
                      src={guide.imageSrc}
                      alt={guide.title}
                      className="aspect-[16/9] w-full"
                    />
                    {guide.badge && (
                      <span className="absolute top-4 left-4 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 text-xs font-bold uppercase tracking-wider">
                        {guide.badge}
                      </span>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-4 sm:p-6 flex flex-col gap-3">
                    <span className="text-xs sm:text-sm font-bold text-neutral-400 group-hover:text-purple-300 transition-colors uppercase tracking-wider">
                      {guide.categoryLabel}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-200 transition-colors leading-tight">
                      {guide.title}
                    </h2>
                    <p className="text-sm sm:text-base text-neutral-300 leading-relaxed line-clamp-2">
                      {guide.description}
                    </p>
                    <div className="pt-3 flex items-center justify-between text-xs sm:text-sm font-semibold text-purple-400 group-hover:text-purple-300">
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <Clock className="w-4 h-4" />
                        {guide.readTime}
                      </span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Read Masterclass</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. EXPLORE FURTHER SECTION (Filters + 3-Column Grid + Load More)         */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-[#07050f] relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col gap-12">
            {/* Section Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {data.exploreSection.title}
              </h2>
              <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                {data.exploreSection.subtitle}
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('all');
                  setVisibleCount(3);
                }}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
                }`}
              >
                {data.exploreSection.filterLabels.all}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('eternal-101');
                  setVisibleCount(3);
                }}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  selectedFilter === 'eternal-101'
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
                }`}
              >
                {data.exploreSection.filterLabels.eternal101}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('cultivating-community');
                  setVisibleCount(3);
                }}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  selectedFilter === 'cultivating-community'
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
                }`}
              >
                {data.exploreSection.filterLabels.cultivatingCommunity}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('monetization');
                  setVisibleCount(3);
                }}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  selectedFilter === 'monetization'
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
                }`}
              >
                {data.exploreSection.filterLabels.monetization}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('safety');
                  setVisibleCount(3);
                }}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  selectedFilter === 'safety'
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-[#15102a] text-neutral-400 hover:text-white hover:bg-[#201840] border border-white/5'
                }`}
              >
                {data.exploreSection.filterLabels.safety}
              </button>
            </div>

            {/* 3-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayedArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setActiveItem(article)}
                  className="group cursor-pointer flex flex-col rounded-[28px] bg-[#110e20] border border-white/5 hover:border-purple-500/30 hover:bg-[#16122a] p-4 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_40px_rgba(147,51,234,0.18)]"
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden rounded-[20px]">
                    <CreatorCardThumbnail
                      src={article.imageSrc}
                      alt={article.title}
                      className="aspect-[16/9] w-full"
                    />
                    {article.badge && (
                      <span className="absolute top-3 left-3 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                        {article.badge}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-neutral-400 group-hover:text-purple-300 transition-colors uppercase tracking-wider">
                        {article.categoryLabel}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-200 transition-colors leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed line-clamp-2">
                        {article.description}
                      </p>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs font-semibold text-neutral-400 border-t border-white/5 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {article.readTime}
                      </span>
                      <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Read</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {filteredArticles.length > 3 && (
              <div className="flex justify-center pt-6">
                <button
                  type="button"
                  onClick={toggleLoadMore}
                  className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-sm sm:text-base transition-all duration-300 shadow-[0_10px_25px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {visibleCount >= filteredArticles.length
                    ? data.exploreSection.showLess
                    : data.exploreSection.loadMore}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE ARTICLE & GUIDE MODAL DIALOG                               */}
      {/* ========================================================================= */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141026] border border-purple-500/30 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 text-white relative shadow-2xl animate-scaleUp [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-purple-600/40 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-3 pr-10">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                {activeItem.categoryLabel}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {activeItem.title}
              </h2>
              <div className="flex items-center gap-4 text-xs font-semibold text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {activeItem.readTime}
                </span>
                <span>•</span>
                <span>
                  {activeItem.details.overview.length > 80 ? 'Comprehensive Guide' : 'Quick Read'}
                </span>
              </div>
            </div>

            {/* Modal Image */}
            <div className="my-6 rounded-2xl overflow-hidden border border-white/10 aspect-[16/9]">
              <img
                src={activeItem.imageSrc}
                alt={activeItem.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Overview */}
            <div className="space-y-3 mb-6">
              <p className="text-sm sm:text-base text-neutral-200 leading-relaxed">
                {activeItem.details.overview}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="space-y-3 mb-6 p-4 sm:p-5 rounded-2xl bg-purple-950/40 border border-purple-500/20">
              <h3 className="text-base font-bold text-purple-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{data.modal.keyTakeawaysTitle}</span>
              </h3>
              <ul className="space-y-2.5">
                {activeItem.details.keyTakeaways.map((takeaway, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-200"
                  >
                    <span className="text-purple-400 font-bold mt-0.5">✦</span>
                    <span className="leading-relaxed">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="space-y-3 mb-8 p-4 sm:p-5 rounded-2xl bg-[#1a1435] border border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{data.modal.actionStepsTitle}</span>
              </h3>
              <ul className="space-y-2.5">
                {activeItem.details.actionItems.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg hover:scale-105 cursor-pointer"
              >
                {data.modal.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Universal Footer */}
      <EternalFooter />
    </div>
  );
};
