import React, { useState } from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';

interface GenericOpenGraphCardProps {
  data: LinkEmbedData;
  className?: string;
}

export const GenericOpenGraphCard: React.FC<GenericOpenGraphCardProps> = ({
  data,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const hostname = (() => {
    try {
      return new URL(data.url).hostname.replace(/^www\./, '');
    } catch {
      return data.siteName || 'External link';
    }
  })();

  const title = data.title;
  const description = data.description;
  const showImage = Boolean(data.image && !imageError);

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="generic-opengraph-card"
      className={`group block w-full max-w-[360px] rounded-r-xl rounded-l-xs bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 border-l-[3px] border-l-purple-500 p-2.5 transition-all duration-200 shadow-lg text-left no-underline select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Domain & Favicon Header */}
      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-400 font-medium">
        {data.favicon ? (
          <img
            src={data.favicon}
            alt=""
            className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        )}
        <span className="truncate tracking-wide text-purple-300 font-semibold text-[11px]">
          {data.siteName || hostname}
        </span>
        <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-opacity ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
      </div>

      {/* Title */}
      {title && (
        <h4 className="text-xs sm:text-[13px] font-semibold text-white/95 group-hover:text-purple-300 transition-colors line-clamp-1 leading-snug">
          {title}
        </h4>
      )}

      {/* Description */}
      {description && (
        <p className="text-[11px] text-gray-300/85 line-clamp-2 leading-relaxed font-normal">
          {description}
        </p>
      )}

      {/* Preview Image with Zero Layout Shift & Broken Image Protection */}
      {showImage && (
        <div className="relative mt-2 aspect-[1.91/1] max-h-40 rounded-lg overflow-hidden bg-white/5 border border-white/5 w-full shrink-0">
          {!imageLoaded && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
          <img
            src={data.image!}
            alt={title || 'Link preview'}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.02] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      )}
    </a>
  );
};
