import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { BLOG_TRANSLATIONS, BlogPost } from './data/blogData';
import { BlogHeroSection } from './ui/BlogHeroSection';
import { FeaturedArticlesGrid } from './ui/FeaturedArticlesGrid';
import { ExploreFurtherSection } from './ui/ExploreFurtherSection';
import { BlogFilterBar, FilterOption } from './ui/BlogFilterBar';

export const BlogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const t = BLOG_TRANSLATIONS[currentLanguage] || BLOG_TRANSLATIONS.English;

  // Selected Category (default from searchParams or 'featured')
  const initialCategory = searchParams.get('category') || 'featured';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep state synced with searchParams query string
  useEffect(() => {
    const cat = searchParams.get('category') || 'featured';
    setSelectedCategory(cat);
  }, [searchParams]);

  // Fixed floating bottom offset
  const [bottomOffset, setBottomOffset] = useState<number>(32);

  const filterOptions: FilterOption[] = useMemo(
    () => [
      { key: 'featured', label: t.featuredCategory },
      { key: 'product', label: t.productCategory },
      { key: 'engineering', label: t.engineeringCategory },
      { key: 'company', label: t.companyCategory },
      { key: 'how-to-eternal', label: 'How to Eternal' },
      { key: 'safety', label: t.policyCategory },
      { key: 'community', label: t.communityCategory },
    ],
    [t],
  );

  const handleCategorySelect = (catKey: string) => {
    if (catKey === 'featured') {
      setSelectedCategory('featured');
      setSearchParams({});
    } else if (catKey === 'company') {
      navigate('/category/company');
    } else if (catKey === 'engineering') {
      navigate('/category/engineering');
    } else if (catKey === 'product') {
      navigate('/category/product');
    } else if (catKey === 'safety' || catKey === 'policy') {
      navigate('/category/safety');
    } else if (catKey === 'community') {
      navigate('/category/community');
    } else if (catKey === 'how-to-eternal' || catKey === 'howto') {
      navigate('/category/how-to-eternal');
    } else {
      setSelectedCategory(catKey);
      setSearchParams({ category: catKey });
    }
  };

  // Helper filter function
  const filterPosts = (posts: BlogPost[]) => {
    return posts.filter((post) => {
      // Category check
      const matchesCategory =
        selectedCategory === 'featured' ||
        (selectedCategory === 'product' && post.category.toLowerCase().includes('product')) ||
        (selectedCategory === 'engineering' &&
          post.category.toLowerCase().includes('engineering')) ||
        (selectedCategory === 'company' && post.category.toLowerCase().includes('company')) ||
        (selectedCategory === 'policy' &&
          (post.category.toLowerCase().includes('policy') ||
            post.category.toLowerCase().includes('safety'))) ||
        (selectedCategory === 'community' && post.category.toLowerCase().includes('community'));

      if (!matchesCategory) return false;

      // Query check
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q)
      );
    });
  };

  const filteredFeatured = useMemo(() => {
    if (selectedCategory !== 'featured' && selectedCategory !== 'all') return [];
    if (!searchQuery.trim()) return t.featuredPosts;
    return filterPosts(t.featuredPosts);
  }, [t.featuredPosts, selectedCategory, searchQuery]);

  const filteredExplore = useMemo(() => {
    return filterPosts(t.explorePosts);
  }, [t.explorePosts, selectedCategory, searchQuery]);

  // Synchronize bottom offset so the bar stays fixed at the bottom of the viewport
  // and smoothly locks above the footer when the footer enters view
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
            // Footer is visible in viewport - push the bar up precisely with footer
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
        title={t.heroHeading || 'Official Blog & Product Updates'}
        description={
          t.heroArticle?.description ||
          'Read the latest updates, engineering deep dives, safety reports, and community spotlights from the Eternal team.'
        }
        canonical="/blog"
        structuredData={{
          breadcrumbs: [{ name: 'Blog', url: '/blog' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col relative pb-32">
        {/* 1. Hero Section */}
        <BlogHeroSection heading={t.heroHeading} article={t.heroArticle} />

        {/* 2. Featured Stories (2-Column Grid) */}
        {filteredFeatured.length > 0 && <FeaturedArticlesGrid posts={filteredFeatured} />}

        {/* 3. Explore Further (3-Column Grid) */}
        <ExploreFurtherSection
          heading={t.exploreFurtherHeading}
          subtitle={t.exploreFurtherSubtitle}
          loadMoreText={t.loadMoreButton}
          noResultsText={t.noResultsFound}
          posts={filteredExplore}
        />

        {/* Extra generous resting space so the sticky bar lays neatly above footer */}
        <div className="w-full h-32 sm:h-40" />
      </main>

      {/* Fixed Floating Search & Filter Bar (Always visible at bottom of screen, smoothly stops above footer) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-xl pointer-events-none will-change-[bottom]"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <div className="pointer-events-auto w-full shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <BlogFilterBar
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={filterOptions}
            searchPlaceholder={t.searchPlaceholder}
          />
        </div>
      </div>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default BlogPage;
