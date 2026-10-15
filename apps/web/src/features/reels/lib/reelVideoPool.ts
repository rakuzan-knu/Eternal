import type Hls from 'hls.js';

export interface ReelVideoLease {
  id: number;
  video: HTMLVideoElement;
  isCurrent: () => boolean;
  setSource: (src: string, hlsUrl?: string | null) => Promise<void>;
  play: () => Promise<boolean>;
  pause: () => void;
  release: () => void;
}

class VideoSlot {
  owner: symbol | null = null;
  wantsPlay = false;
  hls: Hls | null = null;
  release: (() => void) | null = null;

  constructor(readonly video: HTMLVideoElement) {}

  guardPlayback = () => {
    // A browser may deliver play after pause/load or a promise cancellation.
    if (!this.owner || !this.wantsPlay || document.hidden) this.video.pause();
  };
}

/** Owns physical nodes separately from the short-lived cards in the snap feed. */
export class ReelVideoPool {
  private slots: VideoSlot[] = [];
  private nextSlot = 0;
  private nextLease = 0;

  acquire(host: HTMLElement): ReelVideoLease | null {
    if (this.slots.length === 0) {
      this.slots = Array.from({ length: 3 }, (_, index) => {
        const video = document.createElement('video');
        video.dataset.reelVideoSlot = String(index);
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        const slot = new VideoSlot(video);
        video.addEventListener('play', slot.guardPlayback);
        return slot;
      });
    }

    let slot: VideoSlot | undefined;
    for (let offset = 0; offset < this.slots.length; offset += 1) {
      const index = (this.nextSlot + offset) % this.slots.length;
      if (!this.slots[index].owner) {
        slot = this.slots[index];
        this.nextSlot = (index + 1) % this.slots.length;
        break;
      }
    }
    if (!slot) return null;

    const ownedSlot = slot;
    const video = slot.video;
    const owner = Symbol('reel-video-lease');
    let sourceVersion = 0;
    let playVersion = 0;
    let sourceReady = Promise.resolve();
    slot.owner = owner;
    host.appendChild(video);
    const isCurrent = () => ownedSlot.owner === owner;

    const clearSource = () => {
      ownedSlot.wantsPlay = false;
      playVersion += 1;
      video.pause();
      if (ownedSlot.hls) {
        const hls = ownedSlot.hls;
        ownedSlot.hls = null;
        // Destroy workers, MediaSource and queued segments before reusing the node.
        for (const teardown of [
          () => hls.stopLoad(),
          () => hls.detachMedia(),
          () => hls.destroy(),
        ]) {
          try {
            teardown();
          } catch {
            /* Continue releasing the remaining resources. */
          }
        }
      }
      video.srcObject = null;
      video.removeAttribute('src');
      video.replaceChildren();
      video.preload = 'none';
      video.load();
    };

    const lease: ReelVideoLease = {
      id: ++this.nextLease,
      video,
      isCurrent,
      setSource: (src, hlsUrl) => {
        if (!isCurrent()) return Promise.resolve();
        const version = ++sourceVersion;
        clearSource();
        video.preload = 'auto';
        const sourceIsCurrent = () => isCurrent() && sourceVersion === version;
        sourceReady = (async () => {
          if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            return;
          }
          if (hlsUrl) {
            try {
              const { default: HlsRuntime } = await import('hls.js');
              if (!sourceIsCurrent()) return;
              if (HlsRuntime.isSupported()) {
                const hls = new HlsRuntime({
                  enableWorker: true,
                  maxBufferLength: 10,
                  maxMaxBufferLength: 20,
                  backBufferLength: 0,
                });
                ownedSlot.hls = hls;
                hls.on(HlsRuntime.Events.ERROR, (_event, data) => {
                  if (!data.fatal || !sourceIsCurrent()) return;
                  const resume = ownedSlot.wantsPlay;
                  sourceVersion += 1;
                  clearSource();
                  video.preload = 'auto';
                  video.src = src;
                  if (resume) void lease.play();
                });
                hls.loadSource(hlsUrl);
                hls.attachMedia(video);
                return;
              }
            } catch {
              // The original MP4 remains available if HLS cannot initialize.
              if (sourceIsCurrent()) clearSource();
            }
          }
          if (sourceIsCurrent()) {
            video.preload = 'auto';
            video.src = src;
          }
        })();
        return sourceReady;
      },
      play: async () => {
        if (!isCurrent() || document.hidden) return false;
        const version = ++playVersion;
        ownedSlot.wantsPlay = true;
        await sourceReady;
        if (!isCurrent() || version !== playVersion || document.hidden) return false;
        try {
          await video.play();
          return isCurrent() && version === playVersion && ownedSlot.wantsPlay && !document.hidden;
        } catch {
          if (isCurrent() && version === playVersion) ownedSlot.wantsPlay = false;
          return false;
        }
      },
      pause: () => {
        if (!isCurrent()) return;
        ownedSlot.wantsPlay = false;
        playVersion += 1;
        video.pause();
      },
      release: () => {
        if (!isCurrent()) return;
        sourceVersion += 1;
        // Invalidate ownership first: pause events cannot resurrect this source.
        ownedSlot.owner = null;
        ownedSlot.release = null;
        if (document.pictureInPictureElement === video && document.exitPictureInPicture) {
          void document.exitPictureInPicture().catch(() => {});
        }
        clearSource();
        video.removeAttribute('poster');
        video.removeAttribute('style');
        video.className = '';
        video.playbackRate = 1;
        video.muted = true;
        video.remove();
      },
    };
    ownedSlot.release = lease.release;
    return lease;
  }

  dispose(): void {
    for (const slot of this.slots) {
      slot.release?.();
      slot.video.removeEventListener('play', slot.guardPlayback);
      slot.video.remove();
    }
    this.slots = [];
    this.nextSlot = 0;
  }
}
