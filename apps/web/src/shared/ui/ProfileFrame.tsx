import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { ProfileFrameDto } from '@social-network/shared-contracts';
import { useDecorationMotion } from './useDecorationMotion';
import { registerProfileEffect } from './profileEffectPlayback';
import { RacingProfileFrame } from './RacingProfileFrame';
import './profileFrame.css';

/** One proportional crown, fixed corners and repeating rails; never stretch artwork. */
export const ProfileFrame = memo(function ProfileFrame({
  frame,
  priority = false,
  compact = false,
}: {
  frame?: ProfileFrameDto | null;
  priority?: boolean;
  compact?: boolean;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const eligible = useDecorationMotion();
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [motionFailed, setMotionFailed] = useState(false);
  const onMotionError = useCallback(() => setMotionFailed(true), []);
  const frameId = frame?.id;
  useEffect(() => {
    setFailed(false);
    setPosterFailed(false);
    setMotionFailed(false);
  }, [frameId]);
  useEffect(() => {
    if (!node.current || !frameId) return;
    const registration = registerProfileEffect(
      node.current,
      eligible && !failed && !motionFailed,
      setPlaying,
    );
    const parent = node.current.parentElement!;
    const promote = () => registration.promote();
    parent.addEventListener('mouseenter', promote);
    parent.addEventListener('focusin', promote);
    if (priority) registration.promote();
    return () => {
      parent.removeEventListener('mouseenter', promote);
      parent.removeEventListener('focusin', promote);
      registration.dispose();
    };
  }, [frameId, eligible, failed, motionFailed, priority]);
  if (!frame) return null;
  const crownAnimated = frame.animated && frame.family !== 'racing';
  const style = { '--pf-color': frame.color, '--pf-accent': frame.accent } as CSSProperties;
  return (
    <span
      ref={node}
      className="profile-frame"
      aria-hidden="true"
      data-profile-frame={frame.id}
      data-motion={playing}
      data-compact={compact}
      data-family={frame.family}
      style={style}
    >
      <span className="profile-frame__rim" />
      <span
        className="profile-frame__rail profile-frame__rail--left"
        style={{ backgroundImage: `url("${frame.railUrl}")` }}
      />
      <span
        className="profile-frame__rail profile-frame__rail--right"
        style={{ backgroundImage: `url("${frame.railUrl}")` }}
      />
      {['tl', 'tr', 'bl', 'br'].map((corner) => (
        <img
          key={corner}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          src={frame.cornerUrl}
          className={`profile-frame__corner profile-frame__corner--${corner}`}
        />
      ))}
      {!posterFailed && (
        <img
          alt=""
          draggable={false}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          width={1024}
          height={256}
          data-profile-frame-motion={playing && crownAnimated && !failed}
          className="profile-frame__crown"
          src={
            (!crownAnimated && !failed) || (playing && !failed)
              ? frame.crownUrl
              : frame.crownPreviewUrl
          }
          onError={() => {
            if (playing && crownAnimated && !failed) setFailed(true);
            else setPosterFailed(true);
          }}
        />
      )}
      <img
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        width={700}
        height={110}
        src={frame.footerUrl}
        className="profile-frame__footer"
      />
      <span className="profile-frame__spark profile-frame__spark--one" />
      <span className="profile-frame__spark profile-frame__spark--two" />
      <span className="profile-frame__spark profile-frame__spark--three" />
      {frame.family === 'racing' && frame.vehicleAtlasUrl && frame.vehiclePreviewUrl && (
        <RacingProfileFrame
          frame={frame}
          playing={playing}
          compact={compact}
          onMotionError={onMotionError}
        />
      )}
    </span>
  );
});

/** Headroom is reserved in layout; art cannot be clipped by the inner profile. */
export function ProfileFrameSurface({
  frame,
  children,
  radius = 26,
  className = '',
  priority = false,
}: {
  frame?: ProfileFrameDto | null;
  children: ReactNode;
  radius?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`profile-frame-surface ${className}`}
      data-framed={Boolean(frame)}
      style={{ '--pf-radius': `${radius}px` } as CSSProperties}
    >
      {frame && <div className="profile-frame-headroom" aria-hidden="true" />}
      <div className="profile-frame-card">
        {children}
        <ProfileFrame frame={frame} priority={priority} />
      </div>
    </div>
  );
}
