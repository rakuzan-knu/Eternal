/** Content-sized readability patches. Shared observers batch reads before writes;
 * there is no measurement loop during video playback or name animations. */
type Entry = { surface: HTMLElement; row: HTMLElement; labels: Element[] };
const entries = new Map<HTMLElement, Entry>();
const dirty = new Set<Entry>();
let resize: ResizeObserver | undefined;
let mutations: MutationObserver | undefined;
let frame: number | undefined;

export function readabilityBounds(row: DOMRect, label: DOMRect, text: DOMRect) {
  const left = Math.max(row.left, label.left, text.left);
  const right = Math.min(row.right, label.right, text.right);
  const top = Math.max(row.top, label.top);
  const bottom = Math.min(row.bottom, label.bottom);
  if (right <= left || bottom <= top) return null;
  const x = Math.max(0, left - row.left - 8);
  const y = Math.max(0, top - row.top - 6);
  return {
    x,
    y,
    width: Math.min(row.width - x, right - row.left + 8 - x),
    height: Math.min(row.height - y, bottom - row.top + 6 - y),
  };
}

function labelsFor(entry: Entry) {
  return [...entry.row.querySelectorAll('[data-nameplate-label]')].filter(
    (label) => label.closest('.nameplate-row') === entry.row,
  );
}
function flush() {
  frame = undefined;
  const results = [...dirty]
    .filter((entry) => entries.get(entry.row) === entry)
    .map((entry) => {
      const labels = labelsFor(entry);
      for (const old of entry.labels) if (!labels.includes(old)) resize?.unobserve(old);
      for (const label of labels) if (!entry.labels.includes(label)) resize?.observe(label);
      entry.labels = labels;
      const label = labels[0];
      if (!label) return { entry, bounds: null };
      const range = document.createRange();
      range.selectNodeContents(label);
      // A block/flex-1 label can be much wider than its actual glyphs. Clamp the
      // glyph range to the visible label box to account for ellipsis/truncation.
      const bounds = readabilityBounds(
        entry.row.getBoundingClientRect(),
        label.getBoundingClientRect(),
        range.getBoundingClientRect?.() ?? label.getBoundingClientRect(),
      );
      return { entry, bounds };
    });
  dirty.clear();
  for (const { entry, bounds } of results) {
    const patch = entry.surface.querySelector<HTMLElement>('.nameplate-shade');
    if (!patch) continue;
    patch.hidden = !bounds;
    if (bounds) {
      patch.style.left = `${bounds.x}px`;
      patch.style.top = `${bounds.y}px`;
      patch.style.width = `${bounds.width}px`;
      patch.style.height = `${bounds.height}px`;
    }
  }
}
function schedule(entry: Entry) {
  dirty.add(entry);
  frame ??= requestAnimationFrame(flush);
}
const refreshAll = () => entries.forEach(schedule);

export function registerNameplateReadability(surface: HTMLElement) {
  const row = surface.parentElement;
  if (!row) return () => {};
  const entry: Entry = { surface, row, labels: [] };
  entries.set(row, entry);
  if (!resize && typeof ResizeObserver !== 'undefined') {
    resize = new ResizeObserver((changes) => {
      for (const change of changes) {
        const owner = (change.target as HTMLElement).closest<HTMLElement>('.nameplate-row');
        const match = owner && entries.get(owner);
        if (match) schedule(match);
      }
    });
  }
  if (!mutations && typeof MutationObserver !== 'undefined') {
    mutations = new MutationObserver((changes) => {
      for (const change of changes) {
        const target =
          change.target instanceof Element ? change.target : change.target.parentElement;
        if (!target || target.closest('.nameplate-surface')) continue;
        const owner = target.closest<HTMLElement>('.nameplate-row');
        const match = owner && entries.get(owner);
        if (match) schedule(match);
      }
    });
    mutations.observe(document.body, { subtree: true, childList: true, characterData: true });
    document.fonts?.addEventListener('loadingdone', refreshAll);
  }
  resize?.observe(row);
  schedule(entry);
  return () => {
    if (entries.get(row) !== entry) return;
    resize?.unobserve(row);
    entry.labels.forEach((label) => resize?.unobserve(label));
    entries.delete(row);
    dirty.delete(entry);
    if (!entries.size) {
      resize?.disconnect();
      resize = undefined;
      mutations?.disconnect();
      mutations = undefined;
      document.fonts?.removeEventListener('loadingdone', refreshAll);
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    }
  };
}
