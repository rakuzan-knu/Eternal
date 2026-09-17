import React, { useState } from 'react';
import { BlogPost } from '../data/blogData';
import { BlogVisualMockup } from './BlogVisualMockups';

export const ExploreFurtherSection: React.FC<{
  heading: string;
  subtitle: string;
  loadMoreText: string;
  noResultsText: string;
  posts: BlogPost[];
}> = ({ heading, subtitle, loadMoreText, noResultsText, posts }) => {
  const [visibleCount, setVisibleCount] = useState(6);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 3, posts.length));
  };

  return (
    <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      {/* Section Title */}
      <div className="flex flex-col items-center text-center mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase max-w-3xl leading-tight mb-4">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed font-normal">
          {subtitle}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 font-semibold">{noResultsText}</div>
      ) : (
        <>
          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {posts.slice(0, visibleCount).map((post) => (
              <article
                key={post.id}
                className="group rounded-[32px] bg-[#0c091e] border border-white/[0.08] hover:border-purple-500/40 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(88,34,180,0.25)] cursor-pointer text-left"
              >
                {/* Visual Thumbnail */}
                <div
                  className={`w-full aspect-[16/10] rounded-[22px] bg-gradient-to-br ${post.gradientClass} border border-white/[0.08] relative overflow-hidden mb-5 shadow-inner flex items-center justify-center`}
                >
                  <BlogVisualMockup type={post.previewType} />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-neutral-400 font-normal leading-relaxed line-clamp-3">
                    {post.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Load More Button */}
          {visibleCount < posts.length && (
            <div className="flex justify-center mt-12">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-black tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {loadMoreText}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
