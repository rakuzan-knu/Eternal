import React from 'react';
import { PostMedia as PostMediaType } from '../model/types';
import { VideoPlayer } from './VideoPlayer';
import { MediaCarousel } from './MediaCarousel';

export function PostMedia({ media }: { media: PostMediaType[] }) {
  if (!media?.length) return null;

  const hasVideo = media.some((m) => m.type === 'video');

  if (media.length > 1) {
    if (hasVideo) return <MediaCarousel media={media} />;

    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-white/5">
        {media.slice(0, 4).map((item, i) => (
          <div key={i} className="relative aspect-square bg-black/20">
            <img src={item.url} alt="" className="w-full h-full object-cover" />
            {i === 3 && media.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-lg">
                +{media.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const item = media[0];
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-white/5 aspect-video bg-black/20">
      {item.type === 'video' ? (
        <VideoPlayer src={item.url} poster={item.poster} />
      ) : (
        <img src={item.url} alt="" className="w-full h-full object-cover" />
      )}
    </div>
  );
}
