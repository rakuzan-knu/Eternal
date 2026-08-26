import React from 'react';
import { useLinkPreview } from '@/entities/opengraph/model/useLinkPreview';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';
import { YouTubeEmbedCard } from './embeds/YouTubeEmbedCard';
import { GitHubEmbedCard } from './embeds/GitHubEmbedCard';
import { AudioEmbedCard } from './embeds/AudioEmbedCard';
import { GenericOpenGraphCard } from './embeds/GenericOpenGraphCard';

interface LinkPreviewCardProps {
  url?: string | null;
  embedData?: LinkEmbedData | null;
  className?: string;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  url,
  embedData,
  className = '',
}) => {
  const { data: fetchedData, isLoading } = useLinkPreview(embedData ? null : url);
  const data = embedData || fetchedData;

  if (isLoading && !embedData && url) {
    return (
      <div
        data-testid="link-preview-skeleton"
        className={`w-full max-w-[360px] h-20 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse mt-2 ${className}`}
      />
    );
  }

  if (!url || !data || (!data.title && !data.description && !data.image)) {
    return null;
  }

  const embedType = data.type;

  if (embedType === 'youtube') {
    return <YouTubeEmbedCard data={data} className={`mt-2 ${className}`} />;
  }

  if (embedType === 'github') {
    return <GitHubEmbedCard data={data} className={`mt-2 ${className}`} />;
  }

  if (embedType === 'spotify' || embedType === 'soundcloud') {
    return <AudioEmbedCard data={data} className={`mt-2 ${className}`} />;
  }

  return <GenericOpenGraphCard data={data} className={`mt-2 ${className}`} />;
};
