import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelVideoPool } from '../reelVideoPool';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const hlsInstances = vi.hoisted(
  () =>
    [] as Array<{
      destroy: ReturnType<typeof vi.fn>;
      stopLoad: ReturnType<typeof vi.fn>;
      detachMedia: ReturnType<typeof vi.fn>;
      attachMedia: ReturnType<typeof vi.fn>;
    }>,
);
const hlsFailure = vi.hoisted(() => ({ attach: false }));

vi.mock('hls.js', () => ({
  default: class {
    static isSupported() {
      return true;
    }
    static Events = { ERROR: 'error' };
    destroy = vi.fn();
    stopLoad = vi.fn();
    detachMedia = vi.fn();
    attachMedia = vi.fn(() => {
      if (hlsFailure.attach) throw new Error('attach failed');
    });
    loadSource = vi.fn();
    on = vi.fn();
    constructor() {
      hlsInstances.push(this);
    }
  },
}));

describe('ReelVideoPool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hlsInstances.length = 0;
    hlsFailure.attach = false;
  });

  it('recycles at most three physical video nodes across 500 reels', async () => {
    const pool = new ReelVideoPool();
    const host = document.createElement('div');
    const identities = new Set<HTMLVideoElement>();
    for (let index = 0; index < 500; index += 1) {
      const lease = pool.acquire(host)!;
      identities.add(lease.video);
      await lease.setSource(`/reel-${index}.mp4`);
      expect(host.querySelectorAll('video')).toHaveLength(1);
      lease.release();
    }
    expect(identities.size).toBe(3);
    pool.dispose();
  });

  it('does not allocate a fourth node while three are leased', () => {
    const pool = new ReelVideoPool();
    const leases = Array.from({ length: 3 }, () => pool.acquire(document.createElement('div'))!);
    expect(new Set(leases.map((lease) => lease.video)).size).toBe(3);
    expect(pool.acquire(document.createElement('div'))).toBeNull();
    pool.dispose();
  });

  it('keeps an authorized native play event playing after production optimization', async () => {
    // Build in Node: esbuild cannot run inside jsdom's mixed Uint8Array realms.
    const code = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { build } from 'vite';
         const result = await build({
           configFile: false, logLevel: 'silent',
           build: { write: false, target: 'es2022',
             lib: { entry: process.argv[1], name: 'CompiledReelPool', formats: ['iife'] },
             rollupOptions: { external: ['hls.js'] }
           }
         });
         const bundle = Array.isArray(result) ? result[0] : result;
         console.log(bundle.output.find(chunk => chunk.type === 'chunk').code);`,
        resolve(__dirname, '../reelVideoPool.ts'),
      ],
      { cwd: resolve(__dirname, '../../../../..'), encoding: 'utf8' },
    );
    const compiled = new Function(`${code}; return CompiledReelPool;`)() as {
      ReelVideoPool: typeof ReelVideoPool;
    };
    const pool = new compiled.ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/reel.mp4');
    const pause = vi.spyOn(lease.video, 'pause');
    pause.mockClear();
    vi.spyOn(lease.video, 'play').mockImplementation(async () => {
      lease.video.dispatchEvent(new Event('play'));
    });

    expect(await lease.play()).toBe(true);
    expect(pause).not.toHaveBeenCalled();
    lease.pause();
    pause.mockClear();
    lease.video.dispatchEvent(new Event('play'));
    expect(pause).toHaveBeenCalledOnce();
    pool.dispose();
  });

  it('releases media sources and decoder state before a node becomes reusable', async () => {
    const pool = new ReelVideoPool();
    const host = document.createElement('div');
    const lease = pool.acquire(host)!;
    await lease.setSource('/reel.mp4');
    const video = lease.video;
    const source = document.createElement('source');
    source.src = '/another.mp4';
    video.appendChild(source);
    Object.defineProperty(video, 'srcObject', { value: {}, writable: true });
    const pause = vi.spyOn(video, 'pause');
    const load = vi.spyOn(video, 'load');

    lease.release();

    expect(pause).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(video.getAttribute('src')).toBeNull();
    expect(video.srcObject).toBeNull();
    expect(video.querySelector('source')).toBeNull();
    expect(video.parentNode).toBeNull();
    pool.dispose();
  });

  it('ignores a play promise resolved after its lease was released', async () => {
    let finishPlay!: () => void;
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/reel.mp4');
    vi.spyOn(lease.video, 'play').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishPlay = resolve;
        }),
    );
    const pending = lease.play();
    await Promise.resolve();
    lease.release();
    finishPlay();
    expect(await pending).toBe(false);
    pool.dispose();
  });

  it('a stale lease cannot play, pause or clear a node now leased to another reel', async () => {
    const pool = new ReelVideoPool();
    const oldLease = pool.acquire(document.createElement('div'))!;
    oldLease.release();
    const second = pool.acquire(document.createElement('div'))!;
    const third = pool.acquire(document.createElement('div'))!;
    const nextLease = pool.acquire(document.createElement('div'))!;
    expect(nextLease.video).toBe(oldLease.video);
    await nextLease.setSource('/new-reel.mp4');
    const pause = vi.spyOn(nextLease.video, 'pause');
    pause.mockClear();
    oldLease.pause();
    oldLease.release();
    expect(await oldLease.play()).toBe(false);
    expect(nextLease.video.getAttribute('src')).toBe('/new-reel.mp4');
    expect(pause).not.toHaveBeenCalled();
    second.release();
    third.release();
    pool.dispose();
  });

  it('destroys HLS before clearing the leased video source', async () => {
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/fallback.mp4', '/stream.m3u8');
    expect(hlsInstances).toHaveLength(1);
    const runtime = hlsInstances[0];
    lease.release();
    expect(runtime.stopLoad).toHaveBeenCalledOnce();
    expect(runtime.detachMedia).toHaveBeenCalledOnce();
    expect(runtime.destroy).toHaveBeenCalledOnce();
    expect(lease.video.getAttribute('src')).toBeNull();
    pool.dispose();
  });

  it('cannot attach HLS after an asynchronous source setup was released', async () => {
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    const pending = lease.setSource('/fallback.mp4', '/stream.m3u8');
    lease.release();
    await pending;
    expect(hlsInstances).toHaveLength(0);
    expect(lease.video.getAttribute('src')).toBeNull();
    pool.dispose();
  });

  it('still clears the decoder when an HLS teardown method throws', async () => {
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/fallback.mp4', '/stream.m3u8');
    lease.video.src = 'blob:media-source';
    hlsInstances[0].stopLoad.mockImplementation(() => {
      throw new Error('already stopped');
    });
    expect(() => lease.release()).not.toThrow();
    expect(hlsInstances[0].destroy).toHaveBeenCalledOnce();
    expect(lease.video.getAttribute('src')).toBeNull();
    expect(lease.video.parentNode).toBeNull();
    pool.dispose();
  });

  it('exits picture in picture before recycling its video', async () => {
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/reel.mp4');
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: lease.video,
      configurable: true,
    });
    const exit = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'exitPictureInPicture', { value: exit, configurable: true });
    lease.release();
    expect(exit).toHaveBeenCalledOnce();
    expect(lease.video.getAttribute('src')).toBeNull();
    Object.defineProperty(document, 'pictureInPictureElement', { value: null, configurable: true });
    pool.dispose();
  });

  it('uses native HLS when available and clears it on release', async () => {
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    vi.spyOn(lease.video, 'canPlayType').mockReturnValue('maybe');
    await lease.setSource('/fallback.mp4', '/stream.m3u8');
    expect(lease.video.getAttribute('src')).toBe('/stream.m3u8');
    expect(hlsInstances).toHaveLength(0);
    lease.release();
    expect(lease.video.getAttribute('src')).toBeNull();
    pool.dispose();
  });

  it('destroys a partially initialized HLS runtime before falling back to MP4', async () => {
    hlsFailure.attach = true;
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/fallback.mp4', '/stream.m3u8');
    expect(lease.video.getAttribute('src')).toBe('/fallback.mp4');
    expect(hlsInstances[0].destroy).toHaveBeenCalledOnce();
    pool.dispose();
  });

  it('pausing invalidates a pending play and a late browser play event', async () => {
    let finishPlay!: () => void;
    const pool = new ReelVideoPool();
    const lease = pool.acquire(document.createElement('div'))!;
    await lease.setSource('/reel.mp4');
    vi.spyOn(lease.video, 'play').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishPlay = resolve;
        }),
    );
    const pending = lease.play();
    await Promise.resolve();
    lease.pause();
    finishPlay();
    expect(await pending).toBe(false);
    const pause = vi.spyOn(lease.video, 'pause');
    pause.mockClear();
    lease.video.dispatchEvent(new Event('play'));
    expect(pause).toHaveBeenCalledOnce();
    pool.dispose();
  });

  it('clears every leased node when its page unmounts', async () => {
    const pool = new ReelVideoPool();
    const hosts = Array.from({ length: 3 }, () => document.createElement('div'));
    const leases = hosts.map((host) => pool.acquire(host)!);
    await Promise.all(leases.map((lease, index) => lease.setSource(`/reel-${index}.mp4`)));
    pool.dispose();
    for (const lease of leases) {
      expect(lease.video.getAttribute('src')).toBeNull();
      expect(lease.video.parentNode).toBeNull();
      expect(await lease.play()).toBe(false);
    }
  });
});
