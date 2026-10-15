import type { QueryKey } from '@tanstack/react-query';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

export const POST_FEED_MAX_PAGES = 5;
export const POST_FEED_HISTORY_TTL = 15 * 60 * 1000;
type PageLocation = {
  cursor: string | undefined;
  count: number;
  ordinal: number;
  startIndex: number;
};
const REPLAY_PREFIX = '__post_feed_replay_';
export function postFeedReplayOrdinal(cursor: unknown): number | undefined {
  if (typeof cursor !== 'string' || !cursor.startsWith(REPLAY_PREFIX)) return;
  const ordinal = Number(cursor.slice(REPLAY_PREFIX.length));
  return Number.isSafeInteger(ordinal) && ordinal >= 0 ? ordinal : undefined;
}
class RowHeights extends Map<number, number> {
  override set(index: number, size: number): this {
    this.delete(index);
    super.set(index, size);
    if (this.size > 2048) this.delete(this.keys().next().value!);
    return this;
  }
}

/** This index keeps cursors and layout numbers only, never post/media payloads. */
export class PostFeedWindow {
  private readonly locations = new Map<number, PageLocation>();
  private knownCount = 0;
  revision: number | undefined;
  readonly heights = new RowHeights();
  scrollY: number | undefined;
  anchor: { id: string; offset: number } | undefined;
  lastUsed = Date.now();
  beginRevision(revision: number): void {
    this.locations.clear();
    this.revision = revision;
    // Keep measured geometry until visible rows are measured again, so a distant
    // post's saved identity and viewport offset survive the boundary rebase.
  }
  get pages(): PageLocation[] {
    return [...this.locations.values()];
  }
  locate(cursor: unknown): number {
    if (cursor === undefined) return 0;
    return (
      postFeedReplayOrdinal(cursor) ??
      this.pages.find((page) => page.cursor === cursor)?.ordinal ??
      -1
    );
  }
  remember(
    cursor: string | undefined,
    count: number,
    nextCursor: string | null,
    location?: { ordinal: number; startIndex: number },
  ): void {
    const ordinal = location?.ordinal ?? this.locate(cursor);
    const index = ordinal < 0 ? Math.max(-1, ...this.locations.keys()) + 1 : ordinal;
    const previous = this.locations.get(index);
    const startIndex = location?.startIndex ?? previous?.startIndex ?? this.knownCount;
    if (previous && previous.count > 0 && previous.count !== count) {
      const difference = count - previous.count;
      for (const page of this.locations.values())
        if (page.ordinal > index) page.startIndex += difference;
      this.knownCount = Math.max(0, this.knownCount + difference);
    }
    this.locations.delete(index);
    this.locations.set(index, { cursor, count, ordinal: index, startIndex });
    if (nextCursor !== null && !this.locations.has(index + 1))
      this.locations.set(index + 1, {
        cursor: nextCursor,
        count: 0,
        ordinal: index + 1,
        startIndex: startIndex + count,
      });
    this.knownCount =
      nextCursor === null ? startIndex + count : Math.max(this.knownCount, startIndex + count);
    while (this.locations.size > 256) this.locations.delete(this.locations.keys().next().value!);
    this.lastUsed = Date.now();
  }
  start(cursor: unknown): number {
    return this.locations.get(this.locate(cursor))?.startIndex ?? 0;
  }
  get count(): number {
    return this.knownCount;
  }
  heightBefore(index: number): number {
    let height = index * 240;
    for (const [ordinal, size] of this.heights) if (ordinal < index) height += size - 240;
    return Math.max(0, height);
  }
  previous(cursor: unknown): string | undefined | null {
    const index = this.locate(cursor);
    if (index <= 0) return null;
    return this.locations.has(index - 1)
      ? this.locations.get(index - 1)!.cursor
      : `${REPLAY_PREFIX}${index - 1}`;
  }
}

const windows = new Map<string, PostFeedWindow>();
export function getPostFeedWindow(accountId: string, queryKey: QueryKey): PostFeedWindow {
  const key = JSON.stringify([accountId, queryKey]);
  let window = windows.get(key);
  if (!window || Date.now() - window.lastUsed > POST_FEED_HISTORY_TTL) {
    window = new PostFeedWindow();
    windows.delete(key);
    // Bound inactive profile indexes as well as the full page cache.
    if (windows.size >= 64) windows.delete(windows.keys().next().value!);
    windows.set(key, window);
  }
  window.lastUsed = Date.now();
  return window;
}
registerSessionResetHandler(() => windows.clear());
