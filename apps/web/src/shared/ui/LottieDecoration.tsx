import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';

const assets = new Map<string, Promise<unknown>>();
const MAX_CACHED_ASSETS = 8;
function loadAsset(url: string) {
  let asset = assets.get(url);
  if (asset) {
    assets.delete(url);
    assets.set(url, asset);
  }
  if (!asset) {
    asset = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Decoration asset unavailable');
        return response.json() as Promise<unknown>;
      })
      .catch((error: unknown) => {
        if (assets.get(url) === asset) assets.delete(url);
        throw error;
      });
    assets.set(url, asset);
    while (assets.size > MAX_CACHED_ASSETS) {
      const oldest = assets.keys().next().value;
      if (oldest) assets.delete(oldest);
    }
  }
  return asset;
}

export default function LottieDecoration({ decoration }: { decoration: AvatarDecorationDto }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const ready = readyUrl === decoration.assetUrl && failedUrl !== decoration.assetUrl;
  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined;
    void loadAsset(decoration.assetUrl)
      .then((data) => {
        if (cancelled || !ref.current) return;
        animation = lottie.loadAnimation({
          container: ref.current,
          animationData: structuredClone(data),
          renderer: 'html',
          loop: true,
          autoplay: true,
        });
        animation.addEventListener('DOMLoaded', () => {
          if (!cancelled) setReadyUrl(decoration.assetUrl);
        });
        animation.addEventListener('data_failed', () => {
          if (!cancelled) setFailedUrl(decoration.assetUrl);
        });
      })
      .catch(() => {
        if (!cancelled) setFailedUrl(decoration.assetUrl);
      });
    return () => {
      cancelled = true;
      animation?.pause();
      animation?.destroy();
    };
  }, [decoration.assetUrl]);
  return (
    <>
      {!ready && <img src={decoration.previewUrl} alt="" loading="lazy" decoding="async" />}
      <span ref={ref} className="decorated-avatar__lottie" style={{ opacity: ready ? 1 : 0 }} />
    </>
  );
}
