import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';

/** Authored companion clip: don once, then keep the fitted hood in its idle loop. */
export function useDecorationIntro(
  decoration: AvatarDecorationDto | null | undefined,
  playing: boolean,
) {
  const url = decoration?.assetUrl;
  const revision = Number(url?.match(/\.webp\?v=(\d+)$/)?.[1] ?? 0);
  const introUrl =
    decoration?.slug === 'cipher-hood' && revision >= 2
      ? url?.replace('.webp?', '.intro.webp?')
      : undefined;
  const consumed = useRef(new Set<string>());
  const started = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [, refresh] = useState(0);
  const finish = useCallback(() => {
    if (started.current) consumed.current.add(started.current);
    started.current = undefined;
    clearTimeout(timer.current);
    timer.current = undefined;
    refresh((n) => n + 1);
  }, []);
  useEffect(() => {
    if (started.current && (!playing || started.current !== url)) finish();
  }, [playing, url, finish]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const active =
    playing && introUrl !== undefined && url !== undefined && !consumed.current.has(url);
  const onLoad = () => {
    if (!active || started.current === url) return;
    started.current = url;
    // The image load event starts the clock; network latency cannot skip the clip.
    timer.current = setTimeout(finish, 2000);
  };
  const onError = () => {
    if (!active || !url) return;
    started.current = url;
    finish();
  };
  return { introUrl: active ? introUrl : undefined, onLoad, onError };
}
