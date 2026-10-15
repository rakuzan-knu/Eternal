/** Bound animated WebP/Lottie decoders as well as DOM visibility. */
export const AVATAR_DECORATION_PLAYBACK_LIMIT = 8;
type Entry = {
  visible: boolean;
  eligible: boolean;
  notify: (playing: boolean) => void;
  playing: boolean;
  priority: number;
};
const entries = new Map<Element, Entry>();
let observer: IntersectionObserver | undefined;
let sequence = 0;
function reconcile() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const limit = nav.connection?.saveData
    ? 0
    : (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4
      ? 4
      : AVATAR_DECORATION_PLAYBACK_LIMIT;
  const selected = new Set(
    [...entries.values()]
      .filter((e) => e.visible && e.eligible)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit),
  );
  for (const entry of entries.values()) {
    const playing = selected.has(entry);
    if (playing !== entry.playing) {
      entry.playing = playing;
      entry.notify(playing);
    }
  }
}
export function registerAvatarDecoration(element: Element, notify: (playing: boolean) => void) {
  observer ??=
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver((changes) => {
          for (const change of changes) {
            const entry = entries.get(change.target);
            if (entry) entry.visible = change.isIntersecting;
          }
          reconcile();
        });
  const entry: Entry = { visible: !observer, eligible: false, playing: false, priority: 0, notify };
  entries.set(element, entry);
  notify(false);
  observer?.observe(element);
  if (!observer) reconcile();
  return {
    setEligible(eligible: boolean) {
      entry.eligible = eligible;
      reconcile();
    },
    promote() {
      entry.priority = ++sequence;
      reconcile();
    },
    dispose() {
      if (entries.get(element) !== entry) return;
      observer?.unobserve(element);
      entries.delete(element);
      if (!entries.size) {
        observer?.disconnect();
        observer = undefined;
        sequence = 0;
      }
      if (entry.playing) reconcile();
    },
  };
}
