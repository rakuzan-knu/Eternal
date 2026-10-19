import { test, expect, fulfillApi } from './fixtures';
import type { CDPSession, Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const hlsFixtureOrigin = 'https://cf-hls-media.sndcdn.com';
const me = { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null };
const peer = { id: 'usr-peer', username: 'peer', displayName: 'Performance Peer', avatar: null };
const message = (index: number) => ({
  id: `message-${String(index).padStart(4, '0')}`,
  conversationId: 'perf-chat',
  sender: peer,
  body: `Performance message ${index}`,
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt: new Date(Date.UTC(2026, 9, 1) + index * 60_000).toISOString(),
  editedAt: null,
});
const conversation = (index = 0) => ({
  id: index ? `perf-chat-${index}` : 'perf-chat',
  type: 'DIRECT',
  name: null,
  participants: [me, peer].map((user) => ({
    userId: user.id,
    user,
    role: 'MEMBER',
    joinedAt: '2026-01-01T00:00:00Z',
    nickname: null,
    theme: 'default',
    muteLevel: 'NONE',
    mutedUntil: null,
  })),
  lastMessage: message(499),
  unreadCount: 0,
  pinnedMessages: [],
  myTheme: 'default',
  myMuteLevel: 'NONE',
  isArchived: false,
  isPinned: false,
  blockedByMe: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

async function mockPlatform(page: Page, totalMessages = 500, dialogs = 1) {
  const fetched = new Set<number>();
  await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\//, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/v1/, '');
    let json: unknown = [];
    if (path === '/users/me' || path === '/users/usr-me') json = me;
    else if (path.includes('unread-count')) json = { count: 0, total: 0 };
    else if (path === '/conversations')
      json = Array.from({ length: dialogs }, (_, i) => conversation(i));
    else if (path === '/conversations/page') {
      const start = Number(url.searchParams.get('cursor') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 25);
      const end = Math.min(dialogs, start + limit);
      json = {
        data: Array.from({ length: end - start }, (_, i) => conversation(start + i)),
        nextCursor: end < dialogs ? String(end) : null,
        hasMore: end < dialogs,
        order: 'activityAt',
      };
    } else if (path === '/conversations/perf-chat') json = conversation();
    else if (path === '/conversations/perf-chat/messages') {
      const before = url.searchParams.get('before');
      const after = url.searchParams.get('after');
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const end = before ? Number(before.replace('message-', '')) : totalMessages;
      const start = after ? Number(after.replace('message-', '')) + 1 : Math.max(0, end - limit);
      const stop = after ? Math.min(totalMessages, start + limit) : end;
      const indices = Array.from({ length: Math.max(0, stop - start) }, (_, i) => stop - 1 - i);
      indices.forEach((i) => fetched.add(i));
      json = {
        data: indices.map(message),
        hasMore: after ? stop < totalMessages : start > 0,
        nextCursor: start > 0 ? message(start).id : null,
      };
    } else if (path.startsWith('/posts/')) json = { data: [], hasMore: false, nextCursor: null };
    else if (path.startsWith('/integrations/soundcloud/stream/'))
      json = {
        streamUrl: `${hlsFixtureOrigin}/perf-hls/playlist.m3u8`,
        isHls: true,
        mimeType: 'application/vnd.apple.mpegurl',
      };
    await fulfillApi(route, { json });
  });
  return fetched;
}

async function memory(page: Page, cdp: CDPSession) {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  return {
    heapBytes: metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize')?.value ?? 0,
    ...(await cdp.send('Memory.getDOMCounters')),
    userAgentMemory: await page.evaluate(async () => {
      const p = performance as Performance & {
        measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
      };
      if (!crossOriginIsolated || !p.measureUserAgentSpecificMemory) return { supported: false };
      try {
        return { supported: true, ...(await p.measureUserAgentSpecificMemory()) };
      } catch {
        return { supported: false };
      }
    }),
  };
}

test('500 media posts reuse three physical video nodes and release resources on departure', async ({
  authenticatedPage: page,
  context,
}, info) => {
  await mockPlatform(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const create = Document.prototype.createElement;
    const probe = { videosCreated: 0, events: [] as unknown[] };
    (window as unknown as { __mediaAllocation: typeof probe }).__mediaAllocation = probe;
    Document.prototype.createElement = function (
      this: Document,
      tag: string,
      options?: ElementCreationOptions,
    ) {
      if (tag.toLowerCase() === 'video') probe.videosCreated++;
      return create.call(this, tag, options);
    } as typeof create;
    for (const type of ['play', 'pause', 'canplay', 'loadeddata', 'error', 'emptied']) {
      document.addEventListener(
        type,
        (event) => {
          const video = event.target;
          if (!(video instanceof HTMLVideoElement)) return;
          probe.events.push({
            type,
            src: video.currentSrc,
            paused: video.paused,
            readyState: video.readyState,
            muted: video.muted,
            hidden: document.hidden,
            code: video.error?.code,
            time: performance.now(),
          });
          if (probe.events.length > 100) probe.events.shift();
        },
        true,
      );
    }
  });
  await page.route(/:3000\/(?:v1\/)?reels\/feed/, (route) =>
    fulfillApi(route, {
      json: {
        data: Array.from({ length: 500 }, (_, index) => ({
          id: index < 2 ? `reel-profkino-${index + 1}` : `perf-reel-${index}`,
          authorId: peer.id,
          caption: `Performance reel ${index}`,
          videoUrl: `/videos/sample-reel.mp4?reel=${index}`,
          hlsUrl: null,
          thumbnailUrl: null,
          blurhash: null,
          thumbhash: null,
          duration: 15,
          width: 720,
          height: 1280,
          audioTitle: null,
          audioArtist: null,
          audioUrl: null,
          viewsCount: 0,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          author: peer,
        })),
        meta: { hasNextPage: false, nextCursor: null },
      },
    }),
  );
  await page.goto('/search');
  await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const before = await memory(page, cdp);
  await page.getByRole('link', { name: 'Reels', exact: true }).click();
  await expect(page.locator('[data-reel-video-slot]').first()).toBeAttached();
  await expect
    .poll(() =>
      page
        .locator('video[data-reel-video-slot]')
        .evaluateAll((nodes) =>
          nodes.some(
            (node) =>
              !(node as HTMLVideoElement).paused && (node as HTMLVideoElement).readyState >= 2,
          ),
        ),
    )
    .toBe(true)
    .catch(async (error) => {
      await writeFile(
        info.outputPath('autoplay-diagnostics.json'),
        JSON.stringify(
          await page.evaluate(() => ({
            probe: (window as unknown as { __mediaAllocation: unknown }).__mediaAllocation,
            videos: [...document.querySelectorAll('video')].map((v) => ({
              src: v.currentSrc,
              paused: v.paused,
              time: v.currentTime,
              muted: v.muted,
              rect: v.getBoundingClientRect().toJSON(),
              readyState: v.readyState,
            })),
          })),
          null,
          2,
        ),
      );
      throw error;
    });
  const reelScroller = page.getByTestId('reels-scroller');
  let maxMountedCards = 0;
  for (let i = 1; i < 500; i++) {
    await reelScroller.evaluate(
      (el, index) => el.scrollTo({ top: el.clientHeight * index, behavior: 'instant' }),
      i,
    );
    const id = i < 2 ? `reel-profkino-${i + 1}` : `perf-reel-${i}`;
    await expect(page.locator(`[data-reel-video-host="${id}"] video`)).toBeAttached();
    expect(await page.locator('video[data-reel-video-slot]').count()).toBeLessThanOrEqual(3);
    maxMountedCards = Math.max(maxMountedCards, await reelScroller.locator('[data-index]').count());
    expect(maxMountedCards).toBeLessThanOrEqual(7);
  }
  const created = await page.evaluate(
    () =>
      (window as unknown as { __mediaAllocation: { videosCreated: number } }).__mediaAllocation
        .videosCreated,
  );
  expect(created).toBe(3);
  const loaded = await memory(page, cdp);
  await page.getByRole('link', { name: 'Search', exact: true }).click();
  await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
  await expect(page.locator('[data-reel-video-slot]')).toHaveCount(0);
  const after = await memory(page, cdp);
  const body = JSON.stringify(
    { posts: 500, created, maxMountedCards, before, loaded, after, errors },
    null,
    2,
  );
  await writeFile(info.outputPath('media-memory.json'), body);
  expect(errors).toEqual([]);
  expect(loaded.nodes).toBeLessThan(1200);
  expect(after.heapBytes - before.heapBytes).toBeLessThan(20 * 1024 * 1024);
  expect(after.nodes - before.nodes).toBeLessThan(200);
  expect(after.jsEventListeners - before.jsEventListeners).toBeLessThan(50);
});

test('scrolling 500 messages keeps rendering and retained history bounded', async ({
  authenticatedPage: page,
  context,
}, info) => {
  const fetched = await mockPlatform(page);
  await page.goto('/messages/perf-chat');
  await expect(page.getByText('Performance message 499', { exact: true }).first()).toBeVisible();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const before = await memory(page, cdp);
  const scroller = page.locator('[data-testid="message-scroller"], [data-testid="message-scroll"]');
  for (let i = 0; i < 30 && !fetched.has(0); i++) {
    const previous = fetched.size;
    await scroller.evaluate((el) => el.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => fetched.size, { timeout: 15_000 }).toBeGreaterThan(previous);
    await expect(scroller).toBeAttached({ timeout: 15_000 });
    // A fulfilled REST response precedes React's window replacement and anchor restore.
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollTop), { timeout: 15_000 })
      .toBeGreaterThan(100);
    expect(await scroller.locator('[data-index]').count()).toBeLessThan(45);
  }
  expect(fetched.size).toBe(500);
  await scroller.evaluate((el) => el.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.getByText('Performance message 0', { exact: true })).toBeVisible();
  const reverseRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.endsWith('/conversations/perf-chat/messages') &&
      url.searchParams.has('after')
    ) {
      reverseRequests.push(url.pathname + url.search);
    }
  });
  for (let i = 0; i < 30; i++) {
    await scroller.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
    await expect
      .poll(() =>
        scroller.evaluate((el) => {
          const latest = el.querySelector<HTMLElement>('[data-message-id="message-0499"]');
          const rect = latest?.getBoundingClientRect();
          const bounds = el.getBoundingClientRect();
          if (rect && rect.top < bounds.bottom && rect.bottom > bounds.top) return 'latest';
          return el.scrollHeight - el.scrollTop - el.clientHeight > 100 ? 'anchored' : 'pending';
        }),
      )
      .not.toBe('pending');
    if (await scroller.locator('[data-message-id="message-0499"]').isVisible()) break;
    expect(await scroller.locator('[data-index]').count()).toBeLessThan(45);
  }
  await expect(scroller.locator('[data-message-id="message-0499"]')).toBeVisible();
  // Immutable older pages hydrate from IDB; the live head must refresh from REST.
  expect(reverseRequests).toEqual([
    '/v1/conversations/perf-chat/messages?after=message-0479&limit=20',
  ]);
  const loaded = await memory(page, cdp);
  await page.getByRole('link', { name: 'Search', exact: true }).click();
  await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
  const after = await memory(page, cdp);
  await writeFile(
    info.outputPath('chat-memory.json'),
    JSON.stringify({ messages: fetched.size, reverseRequests, before, loaded, after }, null, 2),
  );
  expect(after.heapBytes - before.heapBytes).toBeLessThan(12 * 1024 * 1024);
  expect(after.jsEventListeners - before.jsEventListeners).toBeLessThan(30);
});

test('an optional chat chunk failure preserves messages and the unsent draft', async ({
  authenticatedPage: page,
}) => {
  await mockPlatform(page);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  await page.route('**/ConversationDetailsPanel-*.js', (route) => route.abort('failed'));
  await page.goto('/messages/perf-chat');
  const message = page.getByText('Performance message 499', { exact: true }).first();
  await expect(message).toBeVisible();
  const draft = page.locator('textarea').first();
  await draft.fill('Unsent draft survives optional chunk failure');
  // Closed calendars must not mount their monthly activity query.
  expect(requests.filter((path) => path.endsWith('/messages/activity'))).toEqual([]);
  await page.getByTitle('Conversation info').click();
  await expect(page.getByRole('alert')).toContainText("Couldn't open conversation details");
  await expect(draft).toHaveValue('Unsent draft survives optional chunk failure');
  await expect(message).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(draft).toHaveValue('Unsent draft survives optional chunk failure');
});

test('CPU 4x measures interactions and layout shifts while HLS plays beside 1000 dialogs', async ({
  authenticatedPage: page,
  context,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPlatform(page, 1000, 1000);
  await page.route(`${hlsFixtureOrigin}/perf-hls/*`, async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (!/^(playlist\.m3u8|segment-\d+\.mpegts)$/.test(name)) return route.abort();
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      headers,
      contentType: name.endsWith('.mpegts') ? 'video/mp2t' : 'application/vnd.apple.mpegurl',
      body: await readFile(`e2e/fixtures/media-hls/${name}`),
    });
  });
  await page.addInitScript(() => {
    const canPlayType = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type: string) {
      return type.includes('mpegurl') ? '' : canPlayType.call(this, type);
    };
    localStorage.setItem(
      'spotify-player-storage-v2',
      JSON.stringify({
        state: {
          currentTrack: {
            id: 'sc-perf-hls',
            title: 'HLS fixture',
            artist: 'Performance',
            albumArt: '',
            durationMs: 120000,
            spotifyUrl: '',
            source: 'soundcloud',
          },
          isDockVisible: true,
          queue: [],
          volume: 0.05,
          isMuted: false,
        },
        version: 0,
      }),
    );
    const probe = {
      shifts: 0,
      events: [] as Array<{ name: string; duration: number; interactionId: number }>,
      audio: undefined as WeakRef<HTMLAudioElement> | undefined,
    };
    (window as unknown as { __interactionProbe: typeof probe }).__interactionProbe = probe;
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const audio = Reflect.construct(target, args) as HTMLAudioElement;
        probe.audio = new WeakRef(audio);
        return audio;
      },
    });
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!e.hadRecentInput) probe.shifts += e.value;
      }),
    ).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        const e = entry as PerformanceEntry & { interactionId: number };
        if (e.interactionId)
          probe.events.push({ name: e.name, duration: e.duration, interactionId: e.interactionId });
      }),
    ).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/messages');
  await expect(page.getByRole('list', { name: 'Conversations' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = (
          window as unknown as { __interactionProbe: { audio?: WeakRef<HTMLAudioElement> } }
        ).__interactionProbe;
        const audio = probe.audio?.deref();
        return !!audio && !audio.paused && audio.readyState >= 2 && audio.currentTime > 0;
      }),
    )
    .toBe(true);
  const list = page.getByRole('list', { name: 'Conversations' });
  expect(await list.getByRole('listitem').count()).toBeLessThan(35);
  const interactionStart = Date.now();
  // On a narrow viewport the truncated name can overlap the hover menu control.
  // Click the avatar area of the conversation itself, as a touch user would.
  await list
    .getByRole('listitem')
    .first()
    .locator('.nameplate-row')
    .click({ position: { x: 25, y: 25 } });
  await expect(page).toHaveURL(/\/messages\/perf-chat$/);
  await expect(page.getByText('Performance message 999', { exact: true }).first()).toBeVisible();
  const dialogReadyMs = Date.now() - interactionStart;
  const scroller = page.locator('[data-testid="message-scroller"], [data-testid="message-scroll"]');
  expect(await scroller.locator('[data-index]').count()).toBeLessThan(45);
  await page.waitForTimeout(1000);
  const report = await page.evaluate(() => {
    const probe = (
      window as unknown as {
        __interactionProbe: {
          shifts: number;
          events: unknown[];
          audio?: WeakRef<HTMLAudioElement>;
        };
      }
    ).__interactionProbe;
    const audio = probe.audio?.deref();
    return {
      cls: probe.shifts,
      events: probe.events,
      audioPlaying: !!audio && !audio.paused,
      audioTime: audio?.currentTime,
      audioSource: audio?.currentSrc,
    };
  });
  await writeFile(
    info.outputPath('mobile-interactions.json'),
    JSON.stringify(
      {
        cpuRate: 4,
        dialogs: 1000,
        dialogReadyMs,
        ...report,
        note: 'Event Timing lab samples and navigation readiness; not production field INP.',
      },
      null,
      2,
    ),
  );
  expect(report.audioPlaying).toBe(true);
  expect(report.cls).toBeLessThanOrEqual(0.12);
  await page.getByRole('button', { name: 'Close player', exact: true }).first().click();
});
