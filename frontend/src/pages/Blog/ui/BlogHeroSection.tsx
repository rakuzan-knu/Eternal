import React from 'react';
import { BlogPost } from '../data/blogData';
import { BlogVisualMockup } from './BlogVisualMockups';

export const BlogHeroSection: React.FC<{
  heading: string;
  article: BlogPost;
}> = ({ heading, article }) => {
  return (
    <section className="relative pt-36 pb-12 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden select-text">
      {/* Ambient Purple Glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
        {/* Main Title: ETERNAL BLOG */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase mb-12 drop-shadow-2xl">
          {heading}
        </h1>

        {/* Hero Card Container */}
        <div className="w-full relative rounded-[40px] sm:rounded-[48px] bg-[#0c091e] border border-purple-500/30 overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.8)] flex flex-col group cursor-pointer transition-all duration-300 hover:border-purple-500/50">
          {/* Top Banner with Large Brand Wordmark & Visual */}
          <div className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-to-b from-[#32177a] via-[#200d54] to-[#120732] border-b border-purple-500/20 relative flex items-center justify-center overflow-hidden">
            <BlogVisualMockup type={article.previewType} />
          </div>

          {/* Hero Article Content Details */}
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase leading-tight mb-5">
              {article.title}
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-neutral-300 font-medium leading-relaxed max-w-3xl">
              {article.subtitle || article.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
