import React from 'react';
import { BlogPost } from '../data/blogData';
import { BlogVisualMockup } from './BlogVisualMockups';

export const FeaturedArticlesGrid: React.FC<{
  posts: BlogPost[];
}> = ({ posts }) => {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-12 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        {posts.map((post) => (
          <article
            key={post.id}
            className="group rounded-[36px] bg-[#0c091e] border border-white/[0.08] hover:border-purple-500/40 p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(88,34,180,0.25)] cursor-pointer"
          >
            {/* Visual Thumbnail Banner */}
            <div
              className={`w-full aspect-[16/9] rounded-[26px] bg-gradient-to-br ${post.gradientClass} border border-white/[0.08] relative overflow-hidden mb-6 shadow-inner flex items-center justify-center`}
            >
              <BlogVisualMockup type={post.previewType} />
            </div>

            {/* Post Details */}
            <div className="flex flex-col gap-3 text-left">
              {/* Category & Date */}
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-bold text-neutral-300">
                  {post.category}
                </span>
                <span className="text-xs font-semibold text-neutral-400 font-mono">
                  {post.date}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors leading-snug">
                {post.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-neutral-400 font-normal leading-relaxed line-clamp-3">
                {post.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
