import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { COMMUNITY_TRANSLATIONS } from './data/communityData';
import { COMPANY_BLOG_TRANSLATIONS } from './data/companyBlogData';
import { ENGINEERING_BLOG_TRANSLATIONS } from './data/engineeringBlogData';
import { HOW_TO_ETERNAL_BLOG_TRANSLATIONS } from './data/howToEternalBlogData';
import { SAFETY_BLOG_TRANSLATIONS } from './data/safetyBlogData';
import { PRODUCT_BLOG_TRANSLATIONS } from './data/productBlogData';
import { BLOG_TRANSLATIONS, BlogPost } from './data/blogData';
import { FeaturedArticlesGrid } from './ui/FeaturedArticlesGrid';
import { ExploreFurtherSection } from './ui/ExploreFurtherSection';
import { BlogFilterBar, FilterOption } from './ui/BlogFilterBar';
import { BlogVisualMockup } from './ui/BlogVisualMockups';

export const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();

  const blogT = BLOG_TRANSLATIONS[currentLanguage] || BLOG_TRANSLATIONS.English;

  // Active category key (default 'community')
  const rawKey = categoryId ? categoryId.toLowerCase() : 'community';
  const activeKey =
    rawKey === 'howto' || rawKey === 'howtoeternal'
      ? 'how-to-eternal'
      : rawKey === 'policy' || rawKey === 'policy-safety' || rawKey === 'policysafety'
        ? 'safety'
        : rawKey === 'product-features' || rawKey === 'productfeatures'
          ? 'product'
          : rawKey;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bottomOffset, setBottomOffset] = useState<number>(32);

  // Category navigation options (linking to Blog or Category pages)
  const filterOptions: FilterOption[] = useMemo(
    () => [
      { key: 'featured', label: blogT.featuredCategory },
      { key: 'product', label: blogT.productCategory },
      { key: 'engineering', label: blogT.engineeringCategory },
      { key: 'company', label: blogT.companyCategory },
      { key: 'how-to-eternal', label: 'How to Eternal' },
      { key: 'safety', label: blogT.policyCategory },
      { key: 'community', label: blogT.communityCategory },
    ],
    [blogT],
  );

  const handleCategorySelect = (selectedKey: string) => {
    if (selectedKey === 'featured') {
      navigate('/blog');
    } else if (selectedKey === 'community') {
      navigate('/category/community');
    } else if (selectedKey === 'company') {
      navigate('/category/company');
    } else if (selectedKey === 'engineering') {
      navigate('/category/engineering');
    } else if (selectedKey === 'how-to-eternal' || selectedKey === 'howto') {
      navigate('/category/how-to-eternal');
    } else if (selectedKey === 'safety' || selectedKey === 'policy') {
      navigate('/category/safety');
    } else if (selectedKey === 'product' || selectedKey === 'productfeatures') {
      navigate('/category/product');
    } else {
      navigate(`/blog?category=${selectedKey}`);
    }
  };

  // Select appropriate dataset (Product, Safety, How to Eternal, Engineering, Company, Community, or fallback)
  const categoryData = useMemo(() => {
    if (activeKey === 'company') {
      return COMPANY_BLOG_TRANSLATIONS[currentLanguage] || COMPANY_BLOG_TRANSLATIONS.English;
    }
    if (activeKey === 'engineering') {
      return (
        ENGINEERING_BLOG_TRANSLATIONS[currentLanguage] || ENGINEERING_BLOG_TRANSLATIONS.English
      );
    }
    if (activeKey === 'how-to-eternal' || activeKey === 'howto') {
      return (
        HOW_TO_ETERNAL_BLOG_TRANSLATIONS[currentLanguage] ||
        HOW_TO_ETERNAL_BLOG_TRANSLATIONS.English
      );
    }
    if (activeKey === 'safety' || activeKey === 'policy') {
      return SAFETY_BLOG_TRANSLATIONS[currentLanguage] || SAFETY_BLOG_TRANSLATIONS.English;
    }
    if (activeKey === 'product') {
      return PRODUCT_BLOG_TRANSLATIONS[currentLanguage] || PRODUCT_BLOG_TRANSLATIONS.English;
    }
    return COMMUNITY_TRANSLATIONS[currentLanguage] || COMMUNITY_TRANSLATIONS.English;
  }, [currentLanguage, activeKey]);

  // Helper search filter
  const filterPosts = (posts: BlogPost[]) => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q),
    );
  };

  const filteredFeatured = useMemo(() => {
    return filterPosts(categoryData.featuredPosts);
  }, [categoryData.featuredPosts, searchQuery]);

  const filteredExplore = useMemo(() => {
    return filterPosts(categoryData.explorePosts);
  }, [categoryData.explorePosts, searchQuery]);

  // RAF Footer Collision synchronization
  useEffect(() => {
    let rafId: number;

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const footerEl = document.getElementById('eternal-footer');
        const windowHeight = window.innerHeight;
        const defaultBottom = 32;

        if (footerEl) {
          const footerRect = footerEl.getBoundingClientRect();
          if (footerRect.top < windowHeight) {
            const overlap = windowHeight - footerRect.top;
            setBottomOffset(defaultBottom + overlap);
            return;
          }
        }
        setBottomOffset(defaultBottom);
      });
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    onScrollOrResize();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden relative">
      <SEOHead
        title={`${categoryData.categoryName || categoryData.title} • Eternal Blog`}
        description={categoryData.subtitle}
        canonical={`/category/${activeKey}`}
        structuredData={{
          breadcrumbs: [
            { name: 'Blog', url: '/blog' },
            {
              name: categoryData.categoryName || categoryData.title,
              url: `/category/${activeKey}`,
            },
          ],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative pb-32">
        {/* 1. Category Hero Section */}
        <section className="relative pt-36 pb-12 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden select-text">
          {/* Ambient Purple Glow */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />

          <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
            {/* Category Main Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase mb-4 drop-shadow-2xl">
              {categoryData.title}
            </h1>

            {/* Category Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-neutral-300 font-medium leading-relaxed max-w-3xl mb-12">
              {categoryData.subtitle}
            </p>

            {/* Hero Featured Card */}
            <div className="w-full relative rounded-[40px] sm:rounded-[48px] bg-[#0c091e] border border-purple-500/30 overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.8)] flex flex-col group cursor-pointer transition-all duration-300 hover:border-purple-500/50">
              {/* Top Banner with 3D Visual Mockup */}
              <div className="w-full h-64 sm:h-80 lg:h-96 relative flex items-center justify-center overflow-hidden border-b border-purple-500/20">
                <BlogVisualMockup type={categoryData.heroArticle.previewType} />
              </div>

              {/* Hero Details */}
              <div className="p-8 sm:p-12 lg:p-16 flex flex-col items-center text-center max-w-4xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
                  {categoryData.heroArticle.category}
                </span>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase leading-tight mb-4">
                  {categoryData.heroArticle.title}
                </h2>

                <p className="text-sm sm:text-base lg:text-lg text-neutral-300 font-medium leading-relaxed max-w-3xl">
                  {categoryData.heroArticle.subtitle || categoryData.heroArticle.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Featured Stories (2-Column Grid) */}
        {filteredFeatured.length > 0 && <FeaturedArticlesGrid posts={filteredFeatured} />}

        {/* 3. Explore Further (3-Column Grid) */}
        <ExploreFurtherSection
          heading={blogT.exploreFurtherHeading}
          subtitle={blogT.exploreFurtherSubtitle}
          loadMoreText={blogT.loadMoreButton}
          noResultsText={blogT.noResultsFound}
          posts={filteredExplore}
        />

        {/* Extra spacing above footer */}
        <div className="w-full h-32 sm:h-40" />
      </main>

      {/* Fixed Floating Search & Filter Bar */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-xl pointer-events-none will-change-[bottom]"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <div className="pointer-events-auto w-full shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <BlogFilterBar
            selectedCategory={activeKey}
            onSelectCategory={handleCategorySelect}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={filterOptions}
            searchPlaceholder={blogT.searchPlaceholder}
          />
        </div>
      </div>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default CategoryPage;
