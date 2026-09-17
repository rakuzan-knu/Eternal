import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PostMedia as PostMediaType } from '../model/types';
import { VideoPlayer } from './VideoPlayer';

export function MediaCarousel({ media }: { media: PostMediaType[] }) {
  const [index, setIndex] = useState(0);
  const goTo = (i: number) => setIndex((i + media.length) % media.length);

  return (
    <div className="relative mt-3 rounded-2xl overflow-hidden border border-white/5 bg-black aspect-video">
      {media.map((item, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-300 ${
            i === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {item.type === 'video' || item.type === 'VIDEO' ? (
            <VideoPlayer src={item.url} poster={item.poster ?? undefined} active={i === index} />
          ) : (
            <img src={item.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ))}

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-all cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === index ? 'bg-white w-4' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
