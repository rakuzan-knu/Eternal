/** A single observer and a page-wide decoder budget, independent of list length. */
export const PROFILE_EFFECT_PLAYBACK_LIMIT = 3;
type Entry = {
  element: Element;
  visible: boolean;
  eligible: boolean;
  playing: boolean;
  priority: number;
  notify: (active: boolean) => void;
};
const entries = new Map<Element, Entry>();
let observer: IntersectionObserver | undefined,
  sequence = 0;
function limit() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return 0;
  return (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4
    ? 1
    : PROFILE_EFFECT_PLAYBACK_LIMIT;
}
function reconcile() {
  const allowed = [...entries.values()]
    .filter((e) => e.visible && e.eligible)
    .sort((a, b) => b.priority - a.priority);
  const selected = new Set(allowed.slice(0, limit()));
  for (const e of entries.values()) {
    const active = selected.has(e);
    if (active !== e.playing) {
      e.playing = active;
      e.notify(active);
    }
  }
}
export function registerProfileEffect(
  element: Element,
  eligible: boolean,
  notify: (active: boolean) => void,
) {
  observer ??=
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(
          (changes) => {
            for (const change of changes) {
              const entry = entries.get(change.target);
              if (entry) entry.visible = change.isIntersecting;
            }
            reconcile();
          },
          { threshold: 0 },
        );
  const entry: Entry = {
    element,
    eligible,
    notify,
    playing: false,
    visible: !observer,
    priority: 0,
  };
  entries.set(element, entry);
  notify(false);
  observer?.observe(element);
  if (!observer) reconcile();
  return {
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
      }
      if (entry.playing) reconcile();
    },
  };
}
