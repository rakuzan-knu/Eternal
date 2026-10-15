import { lazy, memo, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import './AvatarDecoration.css';
import { useDecorationMotion } from './useDecorationMotion';
import { useDecorationIntro } from './useDecorationIntro';
import { DECORATION_SIZES, type DecorationSize } from './avatarDecorationSizes';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { DefaultAvatarSvg } from './Avatar';
import { registerAvatarDecoration } from './avatarDecorationPlayback';

const LottieDecoration = lazy(() => import('./LottieDecoration'));

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
  alt = 'Avatar',
  className = '',
  motion = true,
}: AvatarWithDecorationProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const motionAllowed = useDecorationMotion();
  const isLight = useThemeStore(isCurrentThemeLight);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const hasDecoration = Boolean(decoration);
  const canPlay = motion && motionAllowed && hasDecoration;
  const registrationRef = useRef<ReturnType<typeof registerAvatarDecoration> | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !hasDecoration) {
      setVisible(false);
      return;
    }
    const registration = registerAvatarDecoration(element, setVisible);
    registrationRef.current = registration;
    const parent = element.parentElement;
    const promote = () => registration.promote();
    parent?.addEventListener('pointerenter', promote);
    parent?.addEventListener('focusin', promote);
    return () => {
      parent?.removeEventListener('pointerenter', promote);
      parent?.removeEventListener('focusin', promote);
      registration.dispose();
      registrationRef.current = null;
    };
  }, [hasDecoration]);
  useEffect(() => {
    registrationRef.current?.setEligible(canPlay);
  }, [canPlay]);
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
      className={`decorated-avatar select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      style={
        {
          '--avatar-size': `${pixels}px`,
          '--decoration-scale': `${(decoration?.renderScale ?? 1.2) * 100}%`,
        } as CSSProperties
      }
      data-playing={playing}
    >
      <span
        className="decorated-avatar__portrait select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {avatarUrl && failedUrl !== avatarUrl ? (
          <img
            src={avatarUrl}
            alt={alt}
            decoding="async"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          <DefaultAvatarSvg />
        )}
      </span>
      {decoration && (
        <span
          className="decorated-avatar__overlay select-none"
          onContextMenu={(e) => e.preventDefault()}
          data-ink={decoration.slug === 'ronin-orbit' && isLight ? 'black' : undefined}
          aria-hidden="true"
        >
          {decoration.assetType === 'lottie' && playing ? (
            <Suspense
              fallback={
                <img
                  src={decoration.previewUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              }
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
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
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
          aria-label={`Status: ${status}`}
        />
      )}
    </span>
  );
});
