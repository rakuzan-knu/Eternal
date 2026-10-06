import { memo, useEffect, useRef, useState } from 'react';
import type { ProfileEffectDto } from '@social-network/shared-contracts';
import { useDecorationMotion } from './useDecorationMotion';
import { registerProfileEffect } from './profileEffectPlayback';

/** Pre-rendered 3D, clipped to the card; it never intercepts profile controls. */
export const ProfileEffect = memo(function ProfileEffect({
  effect,
  preview = false,
  priority = false,
}: {
  effect?: ProfileEffectDto | null;
  preview?: boolean;
  priority?: boolean;
}) {
  const surface = useRef<HTMLSpanElement>(null);
  const motion = useDecorationMotion();
  const effectId = effect?.id;
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setFailed(false);
  }, [effect?.id]);
  useEffect(() => {
    const node = surface.current;
    if (!node || !effect) return;
    const parent = node.parentElement!;
    const anchor = parent.querySelector<HTMLElement>('[data-profile-effect-avatar]');
    const update = () => {
      if (!anchor) return;
      const card = parent.getBoundingClientRect(),
        avatar = anchor.getBoundingClientRect();
      const height = (card.width * effect.height) / effect.width;
      const x = avatar.left - card.left + avatar.width / 2 - card.width * effect.avatarAnchorX;
      const y = avatar.top - card.top + avatar.height / 2 - height * effect.avatarAnchorY;
      setOffset((old) => (Math.abs(old.x - x) + Math.abs(old.y - y) < 0.2 ? old : { x, y }));
    };
    update();
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    resize?.observe(parent);
    if (anchor) resize?.observe(anchor);
    return () => resize?.disconnect();
  }, [effect]);
  useEffect(() => {
    const node = surface.current;
    if (!node || !effectId) return;
    const registration = registerProfileEffect(node, motion && !failed, setPlaying);
    const parent = node.parentElement!;
    const promote = () => registration.promote();
    parent.addEventListener('mouseenter', promote);
    parent.addEventListener('focusin', promote);
    if (priority) registration.promote();
    return () => {
      parent.removeEventListener('mouseenter', promote);
      parent.removeEventListener('focusin', promote);
      registration.dispose();
    };
  }, [effectId, motion, failed, priority]);
  if (!effect) return null;
  return (
    <span
      ref={surface}
      aria-hidden="true"
      data-profile-effect={effect.id}
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-30"
    >
      {(playing || preview) && (
        <img
          key={`${effect.id}-${playing}`}
          alt=""
          draggable={false}
          decoding="async"
          loading={playing ? 'eager' : 'lazy'}
          data-profile-effect-motion={playing ? 'true' : 'false'}
          src={playing ? effect.assetUrl : effect.previewUrl}
          onError={() => setFailed(true)}
          className="absolute max-w-none select-none"
          width={effect.width}
          height={effect.height}
          style={{ width: '100%', height: 'auto', left: offset.x, top: offset.y }}
        />
      )}
    </span>
  );
});
