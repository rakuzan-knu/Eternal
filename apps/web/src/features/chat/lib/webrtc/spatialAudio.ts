/**
 * Spatial Audio / 3D-Sound Manager (HRTF Binaural Stage)
 * Positions remote participants in virtual acoustic space based on their grid layout.
 */

export interface SpatialNodeEntry {
  source: MediaStreamAudioSourceNode;
  panner: PannerNode;
  gain: GainNode;
  stream: MediaStream;
}

export class SpatialAudioManager {
  private audioContext: AudioContext | null = null;
  private nodes: Map<string, SpatialNodeEntry> = new Map();
  private isEnabled = false;

  constructor(enabled = false) {
    this.isEnabled = enabled;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.recalculatePanners();
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public addParticipant(userId: string, stream: MediaStream): void {
    if (this.nodes.has(userId)) {
      this.removeParticipant(userId);
    }

    if (!stream || stream.getAudioTracks().length === 0) return;

    try {
      const ctx = this.getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const panner = ctx.createPanner();

      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.coneInnerAngle = 360;

      const gain = ctx.createGain();
      gain.gain.value = 1.0;

      source.connect(panner);
      panner.connect(gain);
      gain.connect(ctx.destination);

      this.nodes.set(userId, { source, panner, gain, stream });
      this.recalculatePanners();
    } catch (err) {
      console.warn(`[SpatialAudio] Failed to attach stream for ${userId}:`, err);
    }
  }

  private manualPositions: Map<string, { x: number; z: number }> = new Map();

  public setParticipantManualPosition(userId: string, x: number, z: number): void {
    this.manualPositions.set(userId, { x, z });
    const entry = this.nodes.get(userId);
    if (entry && this.isEnabled) {
      this.setPannerPosition(entry.panner, x, 0, z);
    }
  }

  public clearParticipantManualPosition(userId: string): void {
    this.manualPositions.delete(userId);
    this.recalculatePanners();
  }

  public clearAllManualPositions(): void {
    this.manualPositions.clear();
    this.recalculatePanners();
  }

  public getParticipantPositions(): Map<string, { x: number; z: number; isManual: boolean }> {
    const map = new Map<string, { x: number; z: number; isManual: boolean }>();
    this.nodes.forEach((_, userId) => {
      if (this.manualPositions.has(userId)) {
        const p = this.manualPositions.get(userId)!;
        map.set(userId, { x: p.x, z: p.z, isManual: true });
      } else {
        map.set(userId, { x: 0, z: -1, isManual: false });
      }
    });
    return map;
  }

  public removeParticipant(userId: string): void {
    const entry = this.nodes.get(userId);
    if (!entry) return;

    try {
      entry.source.disconnect();
      entry.panner.disconnect();
      entry.gain.disconnect();
    } catch {
      // Ignored during cleanup
    }

    this.nodes.delete(userId);
    this.manualPositions.delete(userId);
    this.recalculatePanners();
  }

  public updatePositions(orderedUserIds: string[]): void {
    const count = orderedUserIds.length;
    if (count === 0) return;

    orderedUserIds.forEach((userId, index) => {
      const entry = this.nodes.get(userId);
      if (!entry) return;

      if (!this.isEnabled) {
        // Center position when spatial audio is disabled
        this.setPannerPosition(entry.panner, 0, 0, -1);
        return;
      }

      // Check for manual drag-and-drop position
      if (this.manualPositions.has(userId)) {
        const manual = this.manualPositions.get(userId)!;
        this.setPannerPosition(entry.panner, manual.x, 0, manual.z);
        return;
      }

      let x = 0;
      if (count === 1) {
        x = 0;
      } else if (count === 2) {
        x = index === 0 ? -2.0 : 2.0;
      } else {
        // Distribute across -3.0 to +3.0 on the soundstage
        const step = 6.0 / (count - 1);
        x = -3.0 + index * step;
      }

      this.setPannerPosition(entry.panner, x, 0, -1);
    });
  }

  private recalculatePanners(): void {
    const userIds = Array.from(this.nodes.keys());
    this.updatePositions(userIds);
  }

  private setPannerPosition(panner: PannerNode, x: number, y: number, z: number): void {
    if (panner.positionX && typeof panner.positionX.setValueAtTime === 'function') {
      const time = this.audioContext?.currentTime ?? 0;
      panner.positionX.setValueAtTime(x, time);
      panner.positionY.setValueAtTime(y, time);
      panner.positionZ.setValueAtTime(z, time);
    } else if (typeof panner.setPosition === 'function') {
      panner.setPosition(x, y, z);
    }
  }

  /**
   * Update listener head orientation in 3D HRTF space
   * @param forward 3D unit forward vector [x, y, z]
   * @param up 3D unit up vector [x, y, z]
   */
  public updateHeadOrientation(
    forward: [number, number, number],
    up: [number, number, number],
  ): void {
    if (!this.audioContext || this.audioContext.state === 'closed') return;

    try {
      const listener = this.audioContext.listener;
      const [fx, fy, fz] = forward;
      const [ux, uy, uz] = up;

      if (listener.forwardX && typeof listener.forwardX.setValueAtTime === 'function') {
        const time = this.audioContext.currentTime;
        listener.forwardX.setValueAtTime(fx, time);
        listener.forwardY.setValueAtTime(fy, time);
        listener.forwardZ.setValueAtTime(fz, time);
        listener.upX.setValueAtTime(ux, time);
        listener.upY.setValueAtTime(uy, time);
        listener.upZ.setValueAtTime(uz, time);
      } else if (
        typeof (
          listener as unknown as {
            setOrientation: (
              fx: number,
              fy: number,
              fz: number,
              ux: number,
              uy: number,
              uz: number,
            ) => void;
          }
        ).setOrientation === 'function'
      ) {
        (
          listener as unknown as {
            setOrientation: (
              fx: number,
              fy: number,
              fz: number,
              ux: number,
              uy: number,
              uz: number,
            ) => void;
          }
        ).setOrientation(fx, fy, fz, ux, uy, uz);
      }
    } catch {
      // Ignored for environments without AudioListener AudioParam support
    }
  }

  /**
   * Reset head orientation to default neutral facing forward (0, 0, -1) and up (0, 1, 0)
   */
  public resetHeadOrientation(): void {
    this.updateHeadOrientation([0, 0, -1], [0, 1, 0]);
  }

  public destroy(): void {
    this.nodes.forEach((entry) => {
      try {
        entry.source.disconnect();
        entry.panner.disconnect();
        entry.gain.disconnect();
      } catch {
        // Ignored
      }
    });
    this.nodes.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}
