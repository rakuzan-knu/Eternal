import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import {
  SafetyNewsHeroBannerIllustration,
  TeenSwitchesIllustration,
  GirlScreensIllustration,
  PartnershipIllustration,
  SaferDayIllustration,
  ModerationConsoleIllustration,
  CryptographyIllustration,
  ServerBadgeIllustration,
  WellbeingIllustration,
} from './ui/SafetyNewsIllustrations';
import {
  ChevronDown,
  Search,
  ArrowRight,
  Filter,
  X,
  Sparkles,
  Calendar,
  Clock,
} from 'lucide-react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SAFETY_NEWS_DATA, SafetyNewsArticle } from './data/safetyNewsData';

export const SafetyNewsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? SAFETY_NEWS_DATA.uk : SAFETY_NEWS_DATA.en;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [isTopicOpen, setIsTopicOpen] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Filter logic
  const filteredArticles = useMemo(() => {
    return data.articles.filter((article) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        article.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesTopic =
        selectedTopic === 'all' || article.topic.toLowerCase() === selectedTopic.toLowerCase();

      return matchesSearch && matchesCategory && matchesTopic;
    });
  }, [data.articles, searchQuery, selectedCategory, selectedTopic]);

  const featuredArticle = data.articles.find((a) => a.isFeatured) || data.articles[0];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTopic('all');
    setIsCategoryOpen(false);
    setIsTopicOpen(false);
  };

  const renderIllustration = (type: SafetyNewsArticle['illustrationType']) => {
    switch (type) {
      case 'hero-mascot':
        return <SafetyNewsHeroBannerIllustration className="w-full h-52" />;
      case 'teen-switches':
        return <TeenSwitchesIllustration />;
      case 'girl-screens':
        return <GirlScreensIllustration />;
      case 'partnership':
        return <PartnershipIllustration />;
      case 'safer-day':
        return <SaferDayIllustration />;
      case 'moderation-console':
        return <ModerationConsoleIllustration />;
      case 'cryptography':
        return <CryptographyIllustration />;
      case 'server-badge':
        return <ServerBadgeIllustration />;
      case 'wellbeing':
      default:
        return <WellbeingIllustration />;
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={data.hero.title || 'Safety News & Updates'}
        description={data.hero.subtitle}
        canonical="/safety/news"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Safety News', url: '/safety/news' },
          ],
        }}
      />
      {/* Top Navigation */}
      <PrivacyNavbar />

      <main className="flex-1 w-full flex flex-col gap-12 sm:gap-16 pb-28">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                           */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#2b186d] via-[#1c0f48] via-45% via-[#120930] via-75% to-[#07050f] pt-36 pb-20 sm:pt-44 sm:pb-24 px-6 lg:px-12 text-center flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto space-y-5 relative z-10">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
              {data.hero.title}
            </h1>
            <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
              {data.hero.subtitle}
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. FEATURED HERO ARTICLE CARD                                             */}
        {/* ========================================================================= */}
        {featuredArticle &&
          searchQuery === '' &&
          selectedCategory === 'all' &&
          selectedTopic === 'all' && (
            <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
              <div
                onClick={() => navigate(featuredArticle.href)}
                className="group cursor-pointer rounded-[36px] bg-[#110e22] border border-purple-500/20 hover:border-purple-500/50 p-6 sm:p-10 flex flex-col gap-8 transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
              >
                {/* Top 3D Mascot Graphic Banner */}
                <div className="overflow-hidden rounded-[28px] shadow-2xl">
                  <SafetyNewsHeroBannerIllustration />
                </div>

                {/* Text Meta & Title */}
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {featuredArticle.category}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">
                      {featuredArticle.date} • {featuredArticle.readTime}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight group-hover:text-purple-300 transition-colors">
                    {featuredArticle.title}
                  </h2>

                  <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-4xl">
                    {featuredArticle.description}
                  </p>

                  <div className="pt-2 flex items-center gap-2 text-sm font-bold text-purple-400 group-hover:text-purple-200">
                    <span>{isUkrainian ? 'Читати статтю' : 'Read Full Story'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* 3. FILTERING & SEARCH CONTROLS                                            */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl bg-[#110e20] border border-white/5 shadow-xl">
            {/* Left Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryOpen(!isCategoryOpen);
                    setIsTopicOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                    selectedCategory !== 'all'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-200 border-white/10'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>
                    {selectedCategory === 'all'
                      ? data.filters.allCategories
                      : data.filters.categories[
                          selectedCategory.toLowerCase() as keyof typeof data.filters.categories
                        ] || selectedCategory}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isCategoryOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isCategoryOpen && (
                  <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-[#17122e] border border-purple-500/30 p-2 shadow-2xl z-40 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {data.filters.categories.all}
                    </button>
                    {['Moderation', 'Policy', 'Privacy', 'Safety'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedCategory.toLowerCase() === cat.toLowerCase()
                            ? 'bg-purple-600 text-white'
                            : 'text-neutral-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {data.filters.categories[
                          cat.toLowerCase() as keyof typeof data.filters.categories
                        ] || cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsTopicOpen(!isTopicOpen);
                    setIsCategoryOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                    selectedTopic !== 'all'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-200 border-white/10'
                  }`}
                >
                  <span>{selectedTopic === 'all' ? data.filters.allTopics : selectedTopic}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isTopicOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isTopicOpen && (
                  <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-[#17122e] border border-purple-500/30 p-2 shadow-2xl z-40 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic('all');
                        setIsTopicOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedTopic === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {data.filters.topics.all}
                    </button>
                    {[
                      'Account Security',
                      'Moderation',
                      'Parents and Teens',
                      'Partnerships',
                      'Platform Integrity',
                    ].map((top) => (
                      <button
                        key={top}
                        type="button"
                        onClick={() => {
                          setSelectedTopic(top);
                          setIsTopicOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedTopic.toLowerCase() === top.toLowerCase()
                            ? 'bg-purple-600 text-white'
                            : 'text-neutral-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {top}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset active filters */}
              {(selectedCategory !== 'all' || selectedTopic !== 'all' || searchQuery !== '') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-purple-300 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{data.filters.clearFilters}</span>
                </button>
              )}
            </div>

            {/* Right Search Input */}
            <div className="relative min-w-[240px] sm:min-w-[300px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={data.filters.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. ARTICLES GRID & PAGINATION                                             */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full space-y-12">
          {/* Result Count Indicator */}
          <div className="flex items-center justify-between text-xs font-medium text-neutral-400">
            <span>
              {data.filters.showingResults} {filteredArticles.length}{' '}
              {isUkrainian ? 'статей' : 'articles'}
            </span>
          </div>

          {/* Grid or Empty State */}
          {filteredArticles.length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#110e20] border border-white/5 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-2xl">
                🔍
              </div>
              <h3 className="text-xl font-bold text-white">{data.filters.noResultsTitle}</h3>
              <p className="text-sm text-neutral-400 max-w-md">{data.filters.noResultsDesc}</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 px-5 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all"
              >
                {data.filters.clearFilters}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.slice(0, visibleCount).map((article) => (
                <div
                  key={article.id}
                  onClick={() => navigate(article.href)}
                  className="group rounded-3xl bg-[#110e20] border border-white/5 hover:border-purple-500/40 p-5 flex flex-col gap-4 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] cursor-pointer"
                >
                  {/* Visual Graphic Thumbnail */}
                  <div className="overflow-hidden rounded-2xl">
                    {renderIllustration(article.illustrationType)}
                  </div>

                  {/* Category & Topic */}
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 pt-1">
                    <span className="uppercase tracking-wider">{article.category}</span>
                    <span className="text-neutral-500 font-normal">{article.topic}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                    {article.description}
                  </p>

                  {/* Footer Meta: Date & Read Time */}
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-purple-400" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-purple-400" />
                      {article.readTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {filteredArticles.length > 6 && (
            <div className="text-center pt-6">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((prev) => (prev >= filteredArticles.length ? 6 : prev + 6))
                }
                className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {visibleCount >= filteredArticles.length
                  ? data.filters.showLess
                  : data.filters.loadMore}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default SafetyNewsHubPage;
