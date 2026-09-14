import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import {
  ARTICLES_DATA,
  SAFETY_LIBRARY_TRANSLATIONS,
  LibraryArticle,
} from './data/safetyLibraryData';
import {
  LibraryHeroScrollIllustration,
  LibraryHeroShieldIllustration,
  ArticleCardThumbnail,
} from './ui/SafetyLibraryIllustrations';

export const SafetyLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [activeArticle, setActiveArticle] = useState<LibraryArticle | null>(null);

  // Dropdown open states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);

  const t = useMemo(() => {
    return SAFETY_LIBRARY_TRANSLATIONS[currentLanguage] || SAFETY_LIBRARY_TRANSLATIONS['English'];
  }, [currentLanguage]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return ARTICLES_DATA.filter((article) => {
      // Category match
      if (selectedCategory !== 'all' && article.category !== selectedCategory) {
        return false;
      }
      // Topic match
      if (selectedTopic !== 'all' && !article.topics.includes(selectedTopic)) {
        return false;
      }
      // Search match
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = article.title.toLowerCase().includes(query);
        const matchesSummary = article.summary.toLowerCase().includes(query);
        const matchesTopic = article.topics.some((topic) => topic.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSummary && !matchesTopic) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, selectedTopic, searchQuery]);

  const displayedArticles = filteredArticles.slice(0, visibleCount);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedTopic('all');
    setSearchQuery('');
    setVisibleCount(6);
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={t.hero.title || 'Safety Library'}
        description={t.hero.subtitle}
        canonical="/safety/library"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Safety Library', url: '/safety/library' },
          ],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Hero Section */}
      <header className="relative w-full pt-32 pb-20 px-6 sm:px-12 bg-gradient-to-b from-[#241764] via-[#160e3e] to-[#07050f] overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          {/* Left Floating 3D Scroll */}
          <div className="hidden md:flex flex-shrink-0 items-center justify-center">
            <LibraryHeroScrollIllustration />
          </div>

          {/* Center Text */}
          <div className="flex-1 text-center max-w-3xl px-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[1.1] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              {t.hero.title}
            </h1>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-purple-100/80 leading-relaxed max-w-2xl mx-auto">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Right Floating 3D Shield */}
          <div className="hidden md:flex flex-shrink-0 items-center justify-center">
            <LibraryHeroShieldIllustration />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-12">
        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-12 relative z-30">
          {/* Category Dropdown */}
          <div className="relative min-w-[200px]">
            <button
              onClick={() => {
                setIsCategoryOpen(!isCategoryOpen);
                setIsTopicOpen(false);
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-[#18142a] hover:bg-[#201b38] border border-white/10 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
            >
              <span>
                {selectedCategory === 'all'
                  ? t.filters.viewAll
                  : t.filters.categories[selectedCategory] || selectedCategory}
              </span>
              <svg
                className={`w-4 h-4 text-purple-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isCategoryOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#18142a] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 py-1.5 backdrop-blur-xl">
                {Object.entries(t.filters.categories).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategory(key);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between ${
                      selectedCategory === key
                        ? 'bg-purple-600/30 text-purple-300 font-bold'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{label}</span>
                    {selectedCategory === key && <span className="text-purple-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Topic Dropdown */}
          <div className="relative min-w-[220px]">
            <button
              onClick={() => {
                setIsTopicOpen(!isTopicOpen);
                setIsCategoryOpen(false);
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-[#18142a] hover:bg-[#201b38] border border-white/10 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
            >
              <span>
                {selectedTopic === 'all'
                  ? t.filters.pickTopic
                  : t.filters.topics[selectedTopic] || selectedTopic}
              </span>
              <svg
                className={`w-4 h-4 text-purple-400 transition-transform ${isTopicOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isTopicOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#18142a] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 py-1.5 backdrop-blur-xl max-h-64 overflow-y-auto">
                {Object.entries(t.filters.topics).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTopic(key);
                      setIsTopicOpen(false);
                    }}
                    className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between ${
                      selectedTopic === key
                        ? 'bg-purple-600/30 text-purple-300 font-bold'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{label}</span>
                    {selectedTopic === key && <span className="text-purple-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              className="w-full bg-[#18142a] hover:bg-[#201b38] focus:bg-[#1f1938] border border-white/10 focus:border-purple-500 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/40 outline-none transition-all shadow-lg"
            />
            <svg
              className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Articles Grid */}
        {displayedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="group cursor-pointer flex flex-col bg-[#110d22] hover:bg-[#181330] border border-white/10 hover:border-purple-500/40 rounded-3xl p-4 transition-all duration-300 shadow-xl hover:shadow-purple-900/20 hover:-translate-y-1"
              >
                {/* Visual Thumbnail */}
                <div className="w-full overflow-hidden rounded-2xl mb-5">
                  <ArticleCardThumbnail
                    theme={article.cardTheme}
                    className="w-full aspect-[16/9] transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Article Title */}
                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors leading-snug mb-3">
                  {article.title}
                </h3>

                {/* Summary */}
                <p className="text-sm text-purple-200/70 line-clamp-2 leading-relaxed mb-6 flex-1">
                  {article.summary}
                </p>

                {/* Topic Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  {article.topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80 group-hover:bg-white/15 transition-colors"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-[#110d22] rounded-3xl border border-white/10 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/30 flex items-center justify-center text-2xl">
              🔍
            </div>
            <p className="text-lg text-white/80 font-medium mb-4">{t.filters.noResults}</p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-full text-sm font-bold text-white transition-colors"
            >
              {t.filters.resetFilters}
            </button>
          </div>
        )}

        {/* Load More Button */}
        {visibleCount < filteredArticles.length && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => setVisibleCount((prev) => prev + 3)}
              className="px-8 py-3.5 bg-white hover:bg-gray-100 active:scale-95 text-black rounded-full font-bold text-sm shadow-xl transition-all hover:shadow-white/20"
            >
              {t.filters.loadMore}
            </button>
          </div>
        )}
      </main>

      {/* Article Detail Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#120e24] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              ✕
            </button>

            {/* Modal Thumbnail */}
            <div className="w-full rounded-2xl overflow-hidden mb-6">
              <ArticleCardThumbnail
                theme={activeArticle.cardTheme}
                className="w-full aspect-[21/9]"
              />
            </div>

            {/* Category & Read Time */}
            <div className="flex items-center gap-3 mb-3 text-xs font-bold text-purple-400 tracking-wider uppercase">
              <span>{activeArticle.category}</span>
              <span>•</span>
              <span>{activeArticle.readTime}</span>
              <span>•</span>
              <span className="text-white/40">{activeArticle.date}</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-4">
              {activeArticle.title}
            </h2>

            {/* Full Content Body */}
            <div className="space-y-4 text-purple-100/80 leading-relaxed text-sm sm:text-base mb-8">
              <p>{activeArticle.summary}</p>
              <p>
                At Eternal, our Trust and Safety team works around the clock to create a safe,
                authentic, and welcoming environment for everyone. Implementing proactive tools and
                clear user guidelines ensures meaningful connections across all public and private
                spaces.
              </p>
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/30 text-purple-200">
                <h4 className="font-bold text-white text-sm mb-1">Key Recommendation:</h4>
                <p className="text-xs sm:text-sm">
                  Always verify the security settings in your User Settings &gt; Privacy &amp;
                  Safety tab to customize who can direct message you and filter incoming media.
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
              {activeArticle.topics.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full bg-purple-900/40 border border-purple-700/40 text-xs font-semibold text-purple-200"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};
