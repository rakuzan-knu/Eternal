import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import SkeletonBone from '@/shared/ui/SkeletonBone';

export function MediaAttachment({ attachment }: { attachment: AttachmentView }) {
  const [isLoaded, setLoaded] = useState(false);
  const isSpoilerAttachment = Boolean(
    attachment.isSpoiler ||
    attachment.fileName?.toLowerCase().includes('spoiler') ||
    attachment.url?.toLowerCase().includes('spoiler'),
  );
  const [isSpoilerRevealed, setSpoilerRevealed] = useState(!isSpoilerAttachment);

  const aspectRatio =
    attachment.width && attachment.height ? `${attachment.width} / ${attachment.height}` : '4 / 3';

  if (attachment.type === 'VIDEO') {
    return (
      <div
        className="relative max-h-[280px] overflow-hidden rounded-2xl bg-black group/video"
        style={{ aspectRatio }}
      >
        {!isLoaded && <SkeletonBone className="absolute inset-0 rounded-2xl" />}
        <video
          controls={isSpoilerRevealed}
          preload="metadata"
          className={`h-full w-full object-cover transition-all duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isSpoilerRevealed ? 'filter blur-xl scale-105 pointer-events-none' : ''}`}
          src={attachment.url}
          onLoadedData={() => setLoaded(true)}
        />

        {!isSpoilerRevealed && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSpoilerRevealed(true);
            }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl cursor-pointer hover:bg-black/50 transition-all select-none group/spoiler w-full h-full border-0"
            title="Click to reveal spoiler"
          >
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181926]/90 border border-white/20 text-white text-xs font-semibold shadow-2xl group-hover/spoiler:scale-105 group-hover/spoiler:border-purple-400/50 group-hover/spoiler:text-purple-200 transition-all">
              <EyeOff size={14} className="text-purple-400" />
              <span>Spoiler</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover/spoiler:opacity-100 transition-opacity">
              Click to view
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        if (!isSpoilerRevealed) {
          e.preventDefault();
          e.stopPropagation();
          setSpoilerRevealed(true);
        }
      }}
      className="relative block max-h-[280px] overflow-hidden rounded-2xl group/img"
      style={{ aspectRatio }}
    >
      {!isLoaded && <SkeletonBone className="absolute inset-0 rounded-2xl" />}
      <img
        src={attachment.url}
        alt={attachment.fileName ?? 'attachment'}
        className={`h-full w-full object-cover transition-all duration-300 hover:opacity-90 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${!isSpoilerRevealed ? 'filter blur-xl scale-105' : ''}`}
        onLoad={() => setLoaded(true)}
      />

      {!isSpoilerRevealed && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl cursor-pointer hover:bg-black/50 transition-all select-none group/spoiler"
          title="Click to reveal spoiler"
        >
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181926]/90 border border-white/20 text-white text-xs font-semibold shadow-2xl group-hover/spoiler:scale-105 group-hover/spoiler:border-purple-400/50 group-hover/spoiler:text-purple-200 transition-all">
            <EyeOff size={14} className="text-purple-400" />
            <span>Spoiler</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover/spoiler:opacity-100 transition-opacity">
            Click to view
          </span>
        </div>
      )}
    </a>
  );
}

export function AudioAttachment({ attachment }: { attachment: AttachmentView }) {
  const [isLoaded, setLoaded] = useState(false);

  return (
    <div className="relative max-w-[280px]">
      {!isLoaded && <SkeletonBone className="absolute inset-0 h-10 rounded-full" />}
      <audio
        controls
        preload="metadata"
        className={`max-w-[280px] transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        src={attachment.url}
        onLoadedMetadata={() => setLoaded(true)}
      />
    </div>
  );
}
