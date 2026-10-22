import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { isPrivateMedia, resolveMediaUrl } from './privateMedia';

export function ResolvedMediaUrl({
  url,
  children,
}: {
  url: string;
  children: (url: string) => ReactNode;
}) {
  return isPrivateMedia(url) ? (
    <PrivateMediaUrl key={url} url={url}>
      {children}
    </PrivateMediaUrl>
  ) : (
    children(url)
  );
}

function PrivateMediaUrl({ url, children }: { url: string; children: (url: string) => ReactNode }) {
  const userId = useAuthStore((state) => state.userId);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const media = useQuery({
    queryKey: ['private-media', userId, url],
    queryFn: ({ signal }) => resolveMediaUrl(url, signal),
    staleTime: 45_000,
    gcTime: 0,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (media.isError || mediaFailed)
    return (
      <span role="alert" className="inline-flex items-center gap-2 p-2 text-xs">
        Private attachment unavailable.
        <button
          type="button"
          className="cursor-pointer underline focus-visible:outline-2"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMediaFailed(false);
            setRefreshed(false);
            void media.refetch();
          }}
        >
          Retry attachment
        </button>
      </span>
    );
  if (!media.data)
    return (
      <span role="status" className="inline-block p-2 text-xs">
        Loading private attachment…
      </span>
    );
  return (
    <span
      style={{ display: 'contents' }}
      onErrorCapture={(event) => {
        event.stopPropagation();
        if (refreshed) setMediaFailed(true);
        else {
          setRefreshed(true);
          void media.refetch();
        }
      }}
    >
      {children(media.data)}
    </span>
  );
}

export function MediaImage({ src, ...props }: ComponentPropsWithRef<'img'> & { src: string }) {
  return <ResolvedMediaUrl url={src}>{(url) => <img {...props} src={url} />}</ResolvedMediaUrl>;
}
export function MediaVideo({ src, ...props }: ComponentPropsWithRef<'video'> & { src: string }) {
  return <ResolvedMediaUrl url={src}>{(url) => <video {...props} src={url} />}</ResolvedMediaUrl>;
}
