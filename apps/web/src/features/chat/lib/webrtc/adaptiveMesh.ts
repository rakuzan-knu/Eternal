/**
 * Adaptive Peer Mesh Engine for 3-6 Participants (Resource Optimization)
 *
 * Employs IntersectionObserver to detect off-screen/minimized video tiles and
 * dynamically controls WebRTC encodings via RTCRtpSender.setParameters().
 * Completely eliminates CPU overheating and lag without requiring an SFU server.
 */

export interface MeshOptimizationConfig {
  ecoBitrate?: number; // bps for hidden/background video (default: 50 kbps)
  activeBitrate?: number; // bps for visible video (default: 1.2 Mbps)
  speakerBitrate?: number; // bps for active speaker (default: 2.0 Mbps)
}

export class AdaptiveMeshController {
  private observer: IntersectionObserver | null = null;
  private watchedElements: Map<string, HTMLElement> = new Map();
  private visibilityMap: Map<string, boolean> = new Map();
  private activeSpeakerId: string | null = null;

  private ecoBitrate: number;
  private activeBitrate: number;
  private speakerBitrate: number;

  constructor(
    private readonly pcGetter: () => RTCPeerConnection | null,
    config: MeshOptimizationConfig = {},
  ) {
    this.ecoBitrate = config.ecoBitrate ?? 50_000;
    this.activeBitrate = config.activeBitrate ?? 1_200_000;
    this.speakerBitrate = config.speakerBitrate ?? 2_000_000;

    this.initObserver();
  }

  private initObserver(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          let targetUserId: string | null = null;
          for (const [userId, el] of this.watchedElements) {
            if (el === entry.target) {
              targetUserId = userId;
              break;
            }
          }

          if (targetUserId) {
            const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.15;
            this.visibilityMap.set(targetUserId, isVisible);
            void this.applyParametersForUser(targetUserId, isVisible);
          }
        });
      },
      {
        threshold: [0, 0.2, 0.5],
      },
    );
  }

  public registerElement(userId: string, element: HTMLElement): void {
    this.watchedElements.set(userId, element);
    this.visibilityMap.set(userId, true);
    this.observer?.observe(element);
  }

  public unregisterElement(userId: string): void {
    const el = this.watchedElements.get(userId);
    if (el && this.observer) {
      this.observer.unobserve(el);
    }
    this.watchedElements.delete(userId);
    this.visibilityMap.delete(userId);
  }

  public setActiveSpeaker(speakerUserId: string | null): void {
    this.activeSpeakerId = speakerUserId;
    this.watchedElements.forEach((_, userId) => {
      const isVisible = this.visibilityMap.get(userId) ?? true;
      void this.applyParametersForUser(userId, isVisible);
    });
  }

  private async applyParametersForUser(userId: string, isVisible: boolean): Promise<void> {
    const pc = this.pcGetter();
    if (!pc) return;

    const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
    if (!videoSender || typeof videoSender.getParameters !== 'function') return;

    try {
      const params = videoSender.getParameters();
      if (!params || !params.encodings || params.encodings.length === 0) return;

      const isSpeaker = this.activeSpeakerId === userId;

      if (!isVisible) {
        // Tile is off-screen / minimized: pause or lower encoding drastically
        params.encodings[0].active = false;
        params.encodings[0].maxBitrate = this.ecoBitrate;
        params.encodings[0].maxFramerate = 5;
      } else if (isSpeaker) {
        // Active speaker priority: full 30fps HD
        params.encodings[0].active = true;
        params.encodings[0].maxBitrate = this.speakerBitrate;
        params.encodings[0].maxFramerate = 30;
      } else {
        // Standard visible peer
        params.encodings[0].active = true;
        params.encodings[0].maxBitrate = this.activeBitrate;
        params.encodings[0].maxFramerate = 24;
      }

      await videoSender.setParameters(params);
    } catch {
      // Ignored if browser rejects on negotiation state
    }
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.watchedElements.clear();
    this.visibilityMap.clear();
  }
}
