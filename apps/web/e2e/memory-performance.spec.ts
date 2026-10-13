import { test, expect, fulfillApi } from './fixtures';
import type { CDPSession, Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

async function processMemory(cdp: CDPSession) {
  if (process.platform !== 'win32') return undefined;
  const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
  const ids = processInfo.map((p: { id: number }) => p.id).filter(Number.isInteger);
  if (!ids.length) return undefined;
  const { stdout } = await run(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress`,
    ],
    { windowsHide: true },
  );
  const memory = stdout.trim() ? JSON.parse(stdout) : [];
  return (Array.isArray(memory) ? memory : [memory]).map(
    (entry: { Id: number; WorkingSet64: number; PrivateMemorySize64: number }) => ({
      type: processInfo.find((p: { id: number }) => p.id === entry.Id)?.type,
      workingSetBytes: entry.WorkingSet64,
      privateBytes: entry.PrivateMemorySize64,
    }),
  );
}

async function sample(page: Page, cdp: CDPSession, collect = false, browserCdp?: CDPSession) {
  if (collect) await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const dom = await cdp.send('Memory.getDOMCounters');
  const metric = (name: string) =>
    metrics.find((m: { name: string }) => m.name === name)?.value ?? 0;
  return {
    time: Date.now(),
    collected: collect,
    heapBytes: metric('JSHeapUsedSize'),
    heapTotalBytes: metric('JSHeapTotalSize'),
    ...dom,
    processes: browserCdp ? await processMemory(browserCdp) : undefined,
    media: await page.evaluate(() => ({
      videos: document.querySelectorAll('video').length,
      playingVideos: [...document.querySelectorAll('video')].filter((v) => !v.paused).length,
      images: document.images.length,
      canvases: document.querySelectorAll('canvas').length,
    })),
  };
}

test('idle search has bounded retained heap, DOM and listeners', async ({
  authenticatedPage: page,
  context,
}, info) => {
  const wallpaper = process.env.MEMORY_WALLPAPER === '1';
  if (wallpaper)
    await page.addInitScript(() =>
      localStorage.setItem(
        'eternal-theme',
        JSON.stringify({
          state: {
            themeMode: 'wallpaper',
            theme: 'dark',
            solidTheme: 'dark',
            isGlassmorphismEnabled: true,
            glassmorphismOpacity: 0.6,
            wallpaper: {
              id: 'test-wall',
              name: 'Local video',
              url: '/videos/sample-reel.mp4',
              mediaType: 'video',
              isAnimated: true,
              dimming: 0.7,
              blur: 0,
            },
          },
          version: 0,
        }),
      ),
    );
  const catalog = JSON.parse(
    await readFile('public/Profile-decorations/Nameplates/nameplate-collection.json', 'utf8'),
  );
  const currentUser = {
    id: 'usr-me',
    username: 'mockme',
    displayName: 'Mock Me',
    avatar: null,
    activeNameplate: catalog.find((n: { slug: string }) => n.slug === 'nameplate-code-green'),
    activeDecoration: {
      id: 'idle-decoration',
      slug: 'astral-sigil',
      assetType: 'lottie',
      renderScale: 1.2,
      assetUrl: '/Profile-decorations/Avatar-decorations/astral-sigil.json',
      previewUrl: '/Profile-decorations/Avatar-decorations/angel-halo.preview.webp',
    },
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\//, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/v1/, '');
    return fulfillApi(route, {
      json: path.includes('unread-count')
        ? { count: 0, total: 0 }
        : path === '/users/usr-me' || path === '/users/me'
          ? currentUser
          : path.startsWith('/posts/')
            ? { data: [], hasMore: false, nextCursor: null }
            : [],
    });
  });
  await page.goto('/search');
  await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
  await page.locator('aside').first().hover();
  await expect(page.locator('aside video')).toHaveCount(1);
  await expect(
    page.locator('.decorated-avatar__lottie').first().locator('> *').first(),
  ).toBeAttached();
  await page.waitForTimeout(5000);
  const cdp = await context.newCDPSession(page);
  const browserCdp = await context.browser()!.newBrowserCDPSession();
  await cdp.send('Performance.enable');
  if (wallpaper) {
    await expect(page.locator('.wallpaper-layer video')).toBeVisible();
    await expect(page.locator('.wallpaper-layer video')).toHaveJSProperty('paused', false);
    await expect
      .poll(() =>
        page.locator('.wallpaper-layer video').evaluate((v: HTMLVideoElement) => v.readyState),
      )
      .toBeGreaterThan(1);
  }
  const samples = [await sample(page, cdp, true, browserCdp)];
  const seconds = Number(process.env.MEMORY_IDLE_SECONDS ?? 60);
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(Math.min(60_000, deadline - Date.now()));
    samples.push(await sample(page, cdp, false, browserCdp));
    console.info('MEMORY_IDLE', JSON.stringify(samples.at(-1)));
  }
  samples.push(await sample(page, cdp, true, browserCdp));
  const report = {
    scenario:
      'idle /search with local Lottie avatar and video nameplate, mocked REST, disconnected WS',
    wallpaper,
    seconds,
    samples,
    errors,
  };
  const body = JSON.stringify(report, null, 2);
  await writeFile(info.outputPath('idle-memory.json'), body);
  await info.attach('idle-memory', { body, contentType: 'application/json' });
  expect(errors).toEqual([]);
  const first = samples[0],
    last = samples.at(-1)!;
  expect(last.heapBytes - first.heapBytes, 'retained heap growth after GC').toBeLessThan(
    16 * 1024 * 1024,
  );
  expect(last.nodes - first.nodes).toBeLessThan(150);
  expect(last.jsEventListeners - first.jsEventListeners).toBeLessThan(30);
});

test('repeated overlays release DOM and listeners after closing', async ({
  authenticatedPage: page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\//, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/v1/, '');
    return fulfillApi(route, {
      json: path.includes('unread-count')
        ? { count: 0, total: 0 }
        : path === '/users/usr-me' || path === '/users/me'
          ? { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null }
          : path.startsWith('/posts/')
            ? { data: [], hasMore: false, nextCursor: null }
            : [],
    });
  });
  await page.goto('/search');
  await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const cycle = async () => {
    await page.locator('aside').first().hover();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menu').getByText('Log out', { exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
  };
  await cycle();
  const first = await sample(page, cdp, true);
  await page.evaluate(() => {
    const state = { id: 0, last: 0, intervals: [] as number[] };
    (window as unknown as { __motionProbe: typeof state }).__motionProbe = state;
    const tick = (time: number) => {
      if (state.last) state.intervals.push(time - state.last);
      state.last = time;
      state.id = requestAnimationFrame(tick);
    };
    state.id = requestAnimationFrame(tick);
  });
  for (let i = 0; i < 40; i++) await cycle();
  const frames = await page.evaluate(() => {
    const target = window as unknown as { __motionProbe?: { id: number; intervals: number[] } };
    const state = target.__motionProbe!;
    cancelAnimationFrame(state.id);
    delete target.__motionProbe;
    const sorted = state.intervals.sort((a, b) => a - b);
    return {
      frames: sorted.length,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      over50Ms: sorted.filter((ms) => ms > 50).length,
    };
  });
  const last = await sample(page, cdp, true);
  const body = JSON.stringify({ cycles: 40, first, last, frames, errors }, null, 2);
  await writeFile(info.outputPath('overlay-memory.json'), body);
  await info.attach('overlay-memory', { body, contentType: 'application/json' });
  expect(errors).toEqual([]);
  expect(last.heapBytes - first.heapBytes).toBeLessThan(8 * 1024 * 1024);
  expect(last.nodes - first.nodes).toBeLessThan(100);
  expect(last.jsEventListeners - first.jsEventListeners).toBeLessThan(10);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menu').getByText('Log out', { exact: true }).click();
  expect(
    await page
      .locator('.modal-motion-surface')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.screenshot({ path: info.outputPath('modal-reduced-motion.png') });
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
});
