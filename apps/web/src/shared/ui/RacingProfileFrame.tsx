import { useEffect, useRef, useState } from 'react';
import type { ProfileFrameDto } from '@social-network/shared-contracts';
import { createRacingTrack, racingAtlasPose } from './racingProfileFrameTrack';

/** Static 3D atlas: one bounded RAF loop; no WebGL contexts or React renders per tick. */
export function RacingProfileFrame({
  frame,
  playing,
  compact,
  onMotionError,
}: {
  frame: ProfileFrameDto;
  playing: boolean;
  compact: boolean;
  onMotionError: () => void;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const cars = useRef<(HTMLSpanElement | null)[]>([]);
  const trails = useRef<(SVGPathElement | null)[]>([]);
  const phase = useRef(0.12);
  const [ready, setReady] = useState(false);
  const moving = ready && playing;
  useEffect(() => {
    setReady(false);
  }, [frame.id]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let track: ReturnType<typeof createRacingTrack>,
      size = 54;
    let raf = 0,
      last = 0;
    const draw = () => {
      if (!track) return;
      for (let i = 0; i < 2; i++) {
        const car = cars.current[i];
        if (!car) continue;
        const t = (moving ? phase.current : 0.12) + i * 0.5;
        const pose = track.sample(t);
        const atlas = racingAtlasPose(pose.heading, pose.distance, size);
        car.style.width = `${size}px`;
        car.style.height = `${size}px`;
        car.style.transform = `translate(${pose.x - size / 2}px, ${pose.y - size / 2}px) rotate(${moving ? atlas.residual : (pose.heading * 180) / Math.PI}deg)`;
        if (moving)
          car.style.backgroundPosition = `${(atlas.column / 15) * 100}% ${(atlas.row / 7) * 100}%`;
        for (let j = 0; j < 3; j++) {
          const points = Array.from({ length: 6 }, (_, k) =>
            track.sample(t - (j * 5 + k + 1) * 0.0017),
          );
          const path = trails.current[i * 3 + j];
          if (path)
            path.setAttribute(
              'd',
              points
                .map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(' '),
            );
        }
      }
    };
    const resize = () => {
      // Local CSS dimensions: entrance transforms must not shrink the track permanently.
      const width = element.clientWidth,
        height = element.clientHeight;
      const radius = parseFloat(getComputedStyle(element.parentElement!).borderTopLeftRadius) || 26;
      size = Math.max(48, Math.min(96, width * 0.19));
      track = createRacingTrack(
        width,
        height,
        compact ? Math.max(12, radius - 12) : radius,
        compact ? 12 : 0,
      );
      element
        .querySelector('svg')
        ?.setAttribute('viewBox', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const tick = (now: number) => {
      if (last) phase.current = (phase.current + Math.min(100, now - last) / frame.durationMs) % 1;
      last = now;
      draw();
      raf = requestAnimationFrame(tick);
    };
    if (moving) raf = requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [moving, compact, frame.durationMs, frame.id]);
  return (
    <span ref={root} className="profile-frame-racing" data-profile-frame-motion={moving}>
      {playing && (
        <img
          className="profile-frame-racing__preload"
          alt=""
          src={frame.vehicleAtlasUrl!}
          onLoad={() => setReady(true)}
          onError={onMotionError}
        />
      )}
      <svg
        className="profile-frame-racing__trails"
        preserveAspectRatio="none"
        fill="none"
        data-visible={moving}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <path
            key={i}
            ref={(el) => {
              trails.current[i] = el;
            }}
            stroke={i % 3 === 0 ? 'var(--pf-accent)' : 'var(--pf-color)'}
            strokeWidth={i % 3 === 0 ? 2.4 : 3.5}
            strokeLinecap="round"
            opacity={[0.9, 0.45, 0.16][i % 3]}
          />
        ))}
      </svg>
      {[0, 1].map((i) => (
        <span
          key={i}
          ref={(el) => {
            cars.current[i] = el;
          }}
          className="profile-frame-racing__car"
          data-racer={i}
          style={{ backgroundImage: moving ? `url("${frame.vehicleAtlasUrl}")` : undefined }}
        >
          {!moving && (
            <img alt="" draggable={false} decoding="async" src={frame.vehiclePreviewUrl!} />
          )}
        </span>
      ))}
    </span>
  );
}
