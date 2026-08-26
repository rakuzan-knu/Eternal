import React from 'react';
import { X, Globe, Music2 } from 'lucide-react';
import { YoutubeIcon, GithubIcon } from '@/shared/ui/embeds/EmbedIcons';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';

interface LinkPreviewBannerProps {
  data: LinkEmbedData;
  onDismiss: () => void;
}

export const LinkPreviewBanner: React.FC<LinkPreviewBannerProps> = ({ data, onDismiss }) => {
  const isYoutube = data.type === 'youtube';
  const isGithub = data.type === 'github';
  const isAudio = data.type === 'spotify' || data.type === 'soundcloud';
  const hostname = (() => {
    try {
      return new URL(data.url).hostname.replace(/^www\./, '');
    } catch {
      return data.siteName || 'Link';
    }
  })();

  const title = data.title || hostname;
  const image = data.image;

  return (
    <div
      data-testid="link-preview-banner"
      className="mx-4 mb-2 p-2 rounded-xl bg-[#13121d]/90 backdrop-blur-xl border border-purple-500/30 border-l-[3px] border-l-purple-500 shadow-lg flex items-center gap-2.5 animate-fadeIn select-none"
    >
      {/* Thumbnail or Provider Icon */}
      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10 flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : isYoutube ? (
          <YoutubeIcon className="w-4 h-4 text-red-500" />
        ) : isGithub ? (
          <GithubIcon className="w-4 h-4 text-purple-300" />
        ) : isAudio ? (
          <Music2 className="w-4 h-4 text-green-400" />
        ) : (
          <Globe className="w-4 h-4 text-purple-400" />
        )}
      </div>

      {/* Info: Title & Domain */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider truncate">
          Link · {data.siteName || hostname}
        </span>
        <span className="text-xs font-bold text-white truncate drop-shadow-sm">{title}</span>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        title="Dismiss link preview"
      >
        <X size={12} />
      </button>
    </div>
  );
};
