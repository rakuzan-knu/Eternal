import React from 'react';
import { ExternalLink, Star, GitFork, GitBranch } from 'lucide-react';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';

interface GitHubEmbedCardProps {
  data: LinkEmbedData;
  className?: string;
}

function formatNumber(num?: number): string {
  if (!num && num !== 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return num.toString();
}

export const GitHubEmbedCard: React.FC<GitHubEmbedCardProps> = ({ data, className = '' }) => {
  const gh = data.github;
  const title = gh ? `${gh.owner}/${gh.repo}` : data.title || 'GitHub Repository';
  const description = data.description;
  const avatar = gh?.avatarUrl || data.image;
  const language = gh?.language;
  const languageColor = gh?.languageColor || '#a855f7';
  const stars = gh?.stars ?? 0;
  const forks = gh?.forks ?? 0;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="github-embed-card"
      className={`group block w-full max-w-[360px] p-3.5 rounded-xl bg-[#111019]/85 hover:bg-[#151421]/95 backdrop-blur-md border border-white/10 hover:border-purple-500/40 transition-all duration-200 shadow-lg text-left no-underline select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Avatar & Title */}
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        {avatar ? (
          <img
            src={avatar}
            alt={gh?.owner || 'GitHub'}
            className="w-5 h-5 rounded-md object-cover bg-white/10 border border-white/10 shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          </div>
        )}

        <span className="text-xs sm:text-[13px] font-bold text-gray-100 group-hover:text-purple-300 transition-colors truncate font-mono">
          {title}
        </span>

        <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors ml-auto shrink-0 opacity-80 group-hover:opacity-100" />
      </div>

      {/* Description */}
      {description && (
        <p className="text-[11.5px] text-gray-300/90 line-clamp-2 leading-relaxed mb-2 font-normal">
          {description}
        </p>
      )}

      {/* Footer Stats: Stars, Forks, Language */}
      <div className="flex items-center gap-3.5 text-[11px] text-gray-400 font-mono pt-1 border-t border-white/5">
        {language && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: languageColor }}
            />
            <span className="text-gray-300 text-[11px]">{language}</span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0" title={`${stars} stars`}>
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          <span>{formatNumber(stars)}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0" title={`${forks} forks`}>
          <GitFork className="w-3.5 h-3.5 text-gray-400" />
          <span>{formatNumber(forks)}</span>
        </div>
      </div>
    </a>
  );
};
