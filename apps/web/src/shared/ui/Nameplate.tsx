import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { NameplateDto } from '@social-network/shared-contracts';
import { useDecorationMotion } from './useDecorationMotion';
import { registerNameplate } from './nameplatePlayback';
import { registerNameplateReadability } from './nameplateReadability';
import './Nameplate.css';

export interface NameplateProps {
  nameplate?: NameplateDto | null;
  motion?: boolean;
  alwaysPlay?: boolean;
  playOnHover?: boolean;
}

/** Place inside an existing row marked `nameplate-row`; it never intercepts input. */
export const Nameplate = memo(function Nameplate({
  nameplate,
  motion = true,
  alwaysPlay = false,
  playOnHover = false,
}: NameplateProps) {
  const ref = useRef<HTMLSpanElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const assetUrl = nameplate?.assetUrl;
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState<string | null>(null);
  const motionAllowed = useDecorationMotion();
  const eligible = Boolean(
    nameplate && (alwaysPlay || motion) && motionAllowed && failed !== nameplate.assetUrl,
  );
  const isPlaying = Boolean(playing && motionAllowed);

  useEffect(() => {
    setFailed(null);
  }, [assetUrl]);

  useEffect(() => {
    if (ref.current && assetUrl) return registerNameplateReadability(ref.current);
  }, [assetUrl]);

  useEffect(() => {
    if (!ref.current || !assetUrl) return;

    const row = ref.current.parentElement;
    // Forced playback bypasses hover, but still obeys visibility and the
    // shared decoder budget. A long list must never activate every video.
    if (playOnHover && !alwaysPlay) {
      if (!row) return;
      const onEnter = () => {
        if (eligible) setPlaying(true);
      };
      const onLeave = () => {
        setPlaying(false);
      };
      row.addEventListener('pointerenter', onEnter);
      row.addEventListener('pointerleave', onLeave);
      row.addEventListener('focusin', onEnter);
      row.addEventListener('focusout', onLeave);
      return () => {
        row.removeEventListener('pointerenter', onEnter);
        row.removeEventListener('pointerleave', onLeave);
        row.removeEventListener('focusin', onEnter);
        row.removeEventListener('focusout', onLeave);
        setPlaying(false);
      };
    }

    const registration = registerNameplate(ref.current, eligible, setPlaying);
    const promote = () => registration.promote();
    row?.addEventListener('pointerenter', promote);
    row?.addEventListener('focusin', promote);
    return () => {
      row?.removeEventListener('pointerenter', promote);
      row?.removeEventListener('focusin', promote);
      registration.dispose();
    };
  }, [eligible, assetUrl, alwaysPlay, playOnHover]);

  useEffect(() => {
    const media = video.current;
    if (!media || !eligible || !isPlaying) return;
    media.muted = true;
    let cancelled = false;

    if (assetUrl && (!media.getAttribute('src') || media.getAttribute('src') !== assetUrl)) {
      media.setAttribute('src', assetUrl);
      media.load();
    }

    const playPromise = media.play();
    if (playPromise !== undefined) {
      playPromise.catch((err: unknown) => {
        if (cancelled) return;
        if (
          err instanceof DOMException &&
          (err.name === 'AbortError' ||
            err.name === 'NotAllowedError' ||
            err.name === 'NotSupportedError')
        ) {
          return;
        }
        if (media.error) {
          setFailed(assetUrl ?? null);
        }
      });
    }
    return () => {
      cancelled = true;
      try {
        media.pause();
        media.removeAttribute('src');
        media.load();
      } catch {
        // ignore
      }
    };
  }, [isPlaying, eligible, assetUrl, alwaysPlay]);

  if (!nameplate) return null;
  return (
    <span
      ref={ref}
      className="nameplate-surface select-none"
      onContextMenu={(e) => e.preventDefault()}
      aria-hidden="true"
      data-playing={isPlaying && eligible}
      style={{ '--nameplate-shade': nameplate.shadeOpacity } as CSSProperties}
    >
      <img
        className="nameplate-media"
        src={nameplate.previewUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      {isPlaying && eligible && (
        <video
          ref={video}
          className="nameplate-media"
          src={nameplate.assetUrl}
          poster={nameplate.previewUrl}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.hasAttribute('src') || !target.getAttribute('src')) return;
            setFailed(nameplate.assetUrl);
          }}
        />
      )}
      <span className="nameplate-shade" hidden />
    </span>
  );
});
