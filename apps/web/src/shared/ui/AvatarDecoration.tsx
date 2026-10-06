import { lazy, memo, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import './AvatarDecoration.css';
import { useDecorationMotion } from './useDecorationMotion';
import { useDecorationIntro } from './useDecorationIntro';
import { DECORATION_SIZES, type DecorationSize } from './avatarDecorationSizes';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { DefaultAvatarSvg } from './Avatar';

const LottieDecoration = lazy(() => import('./LottieDecoration'));
const visibilityListeners = new Map<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | undefined;
function observe(element: Element, listener: (visible: boolean) => void) {
  if (!('IntersectionObserver' in window)) {
    listener(true);
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => visibilityListeners.get(entry.target)?.(entry.isIntersecting));
    },
    { threshold: 0 },
  );
  visibilityListeners.set(element, listener);
  observer.observe(element);
  return () => {
    observer?.unobserve(element);
    visibilityListeners.delete(element);
    if (!visibilityListeners.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

export interface AvatarWithDecorationProps {
  avatarUrl?: string | null | undefined;
  decoration?: AvatarDecorationDto | null | undefined;
  size?: DecorationSize | number | undefined;
  status?: 'online' | 'idle' | 'dnd' | 'offline' | undefined;
  alt?: string | undefined;
  className?: string | undefined;
  motion?: boolean | undefined;
}

export const AvatarWithDecoration = memo(function AvatarWithDecoration({
  avatarUrl,
  decoration,
  size = 'md',
  status,
  alt = 'Аватар',
  className = '',
  motion = true,
}: AvatarWithDecorationProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const motionAllowed = useDecorationMotion();
  const isLight = useThemeStore(isCurrentThemeLight);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  useEffect(() => (ref.current ? observe(ref.current, setVisible) : undefined), []);
  const playing = motion && visible && motionAllowed;
  const intro = useDecorationIntro(decoration, playing);
  const pixels = typeof size === 'number' ? size : DECORATION_SIZES[size];
  const asset =
    decoration?.assetType === 'animated_webp' && playing && failedAsset !== decoration.assetUrl
      ? (intro.introUrl ?? decoration.assetUrl)
      : decoration?.previewUrl;
  return (
    <span
      ref={ref}
      className={`decorated-avatar ${className}`}
      style={
        {
          '--avatar-size': `${pixels}px`,
          '--decoration-scale': `${(decoration?.renderScale ?? 1.2) * 100}%`,
        } as CSSProperties
      }
      data-playing={playing}
    >
      <span className="decorated-avatar__portrait">
        {avatarUrl && failedUrl !== avatarUrl ? (
          <img src={avatarUrl} alt={alt} decoding="async" onError={() => setFailedUrl(avatarUrl)} />
        ) : (
          <DefaultAvatarSvg />
        )}
      </span>
      {decoration && (
        <span
          className="decorated-avatar__overlay"
          data-ink={decoration.slug === 'ronin-orbit' && isLight ? 'black' : undefined}
          aria-hidden="true"
        >
          {decoration.assetType === 'lottie' && playing ? (
            <Suspense
              fallback={<img src={decoration.previewUrl} alt="" loading="lazy" decoding="async" />}
            >
              <LottieDecoration decoration={decoration} />
            </Suspense>
          ) : (
            <img
              key={asset}
              src={asset}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={asset === intro.introUrl ? intro.onLoad : undefined}
              onError={() =>
                asset === intro.introUrl ? intro.onError() : setFailedAsset(decoration.assetUrl)
              }
            />
          )}
        </span>
      )}
      {status && (
        <span
          className={`decorated-avatar__status decorated-avatar__status--${status}`}
          role="img"
          aria-label={`Статус: ${status}`}
        />
      )}
    </span>
  );
});
