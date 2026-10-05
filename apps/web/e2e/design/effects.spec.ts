import { test, expect } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('shader and glass performance comparison under CPU throttling', async ({ page }, testInfo) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/iframe.html?id=design-visual-effects--effects&viewMode=story');
  const toggle = page.getByRole('button', { name: 'Simplify visual effects' });
  await expect(toggle).toBeVisible();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const measurements = [];
  try {
    for (const simplified of [false, true]) {
      if (simplified) await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', String(simplified));
      await expect
        .poll(async () =>
          page
            .locator('.eternal-glass')
            .first()
            .evaluate((element) => ({
              mode: document.documentElement.dataset.visualEffects,
              blur: getComputedStyle(element).backdropFilter,
            })),
        )
        .toEqual({
          mode: simplified ? 'reduced' : 'full',
          blur: simplified ? 'none' : 'blur(24px)',
        });
      const blur = await page
        .locator('.eternal-glass')
        .first()
        .evaluate((element) => getComputedStyle(element).backdropFilter);
      expect(blur === 'none').toBe(simplified);
      const sample = await page.evaluate(async () => {
        const intervals: number[] = [];
        const longTasks: number[] = [];
        const observer = new PerformanceObserver((list) =>
          list.getEntries().forEach((entry) => longTasks.push(entry.duration)),
        );
        observer.observe({ type: 'longtask', buffered: false });
        const started = performance.now();
        let previous = started;
        await new Promise<void>((resolve) => {
          const frame = (time: number) => {
            intervals.push(time - previous);
            previous = time;
            if (time - started < 2000) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
        observer.disconnect();
        intervals.sort((a, b) => a - b);
        return {
          frames: intervals.length,
          p95FrameMs: intervals[Math.floor(intervals.length * 0.95)] ?? 0,
          longTasks,
          durationMs: previous - started,
        };
      });
      measurements.push({ simplified, blur, cpuSlowdown: 6, ...sample });
    }
  } finally {
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await session.detach();
  }
  await testInfo.attach('effects-performance.json', {
    body: JSON.stringify(
      {
        environment:
          'Local Windows Chromium, synthetic 6x CPU slowdown; GPU and physical devices not represented',
        browserVersion: page.context().browser()?.version(),
        viewport: page.viewportSize(),
        devicePixelRatio: await page.evaluate(() => devicePixelRatio),
        measurements,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  // Timing is diagnostic, not a flaky FPS gate on shared CI hardware.
  expect(measurements.every((sample) => sample.frames > 0)).toBe(true);
  await testInfo.attach('simplified-effects-preview', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
