import { useState } from 'react';
import { AttachmentView } from '../../../entities/chat/model/types';
import SkeletonBone from '@/shared/ui/SkeletonBone';

export function MediaAttachment({ attachment }: { attachment: AttachmentView }) {
  const [isLoaded, setLoaded] = useState(false);
  const aspectRatio =
    attachment.width && attachment.height ? `${attachment.width} / ${attachment.height}` : '4 / 3';

  if (attachment.type === 'VIDEO') {
    return (
      <div
        className="relative max-h-[280px] overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio }}
      >
        {!isLoaded && <SkeletonBone className="absolute inset-0 rounded-2xl" />}
        <video
          controls
          preload="metadata"
          className={`h-full w-full object-cover transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          src={attachment.url}
          onLoadedData={() => setLoaded(true)}
        />
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="relative block max-h-[280px] overflow-hidden rounded-2xl"
      style={{ aspectRatio }}
    >
      {!isLoaded && <SkeletonBone className="absolute inset-0 rounded-2xl" />}
      <img
        src={attachment.url}
        alt={attachment.fileName ?? 'attachment'}
        className={`h-full w-full object-cover transition-opacity duration-150 hover:opacity-90 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
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
