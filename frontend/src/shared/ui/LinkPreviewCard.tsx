import React, { useState } from 'react';
import { ExternalLink, Globe, ZoomIn } from 'lucide-react';
import { useLinkPreview } from '@/entities/opengraph/model/useLinkPreview';

interface LinkPreviewCardProps {
  url?: string | null;
  className?: string;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url, className = '' }) => {
  const { data, isLoading } = useLinkPreview(url);
  const [imageError, setImageError] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  if (!url || isLoading || !data || (!data.title && !data.description && !data.image)) {
    return null;
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return data.siteName || 'External link';
    }
  })();

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block mt-2.5 rounded-xl overflow-hidden bg-black/30 hover:bg-black/40 border border-white/10 transition-all duration-200 border-l-[3px] border-l-blue-500/90 max-w-lg select-text text-left no-underline ${className}`}
      >
        <div className="p-3">
          {/* Site Name & Favicon Header */}
          <div className="flex items-center gap-1.5 mb-1">
            {data.favicon ? (
              <img
                src={data.favicon}
                alt=""
                className="w-3.5 h-3.5 rounded-sm object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="text-[11px] font-semibold text-blue-400 tracking-wide uppercase truncate">
              {data.siteName || hostname}
            </span>
            <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
          </div>

          {/* Title */}
          {data.title && (
            <h4 className="text-[13.5px] font-bold text-gray-100 group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
              {data.title}
            </h4>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-[12px] text-gray-300/90 line-clamp-3 mt-1 leading-relaxed font-normal">
              {data.description}
            </p>
          )}

          {/* Image Preview */}
          {data.image && !imageError && (
            <div className="relative mt-2.5 rounded-lg overflow-hidden bg-black/40 border border-white/5 max-h-64 flex items-center justify-center">
              <img
                src={data.image}
                alt={data.title || 'Link preview'}
                className="w-full h-auto max-h-64 object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                loading="lazy"
                onError={() => setImageError(true)}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsImageZoomed(true);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
                title="View full image"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </a>

      {/* Zoom Modal if user clicks magnifying glass */}
      {isImageZoomed && data.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={data.image}
              alt={data.title || 'Preview zoomed'}
              className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
};
