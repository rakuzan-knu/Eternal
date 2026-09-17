/**
 * Offscreen Particle Worker Bridge
 *
 * Coordinates thread offloading for reaction particle canvas rendering.
 * Transfers control to OffscreenCanvas Web Worker when supported, with
 * transparent fallback to main-thread ReactionParticleEngine.
 */

import { ReactionParticleEngine } from './reactionParticleEngine';

export interface ParticleBridgeHandle {
  spawn: (emoji: string, width: number, height: number, startX?: number) => void;
  resize: (width: number, height: number, dpr: number) => void;
  setTravelerMode: (enabled: boolean) => void;
  destroy: () => void;
  isOffscreen: boolean;
}

export function isOffscreenCanvasSupported(): boolean {
  return (
    typeof HTMLCanvasElement !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof Worker !== 'undefined'
  );
}

export function initOffscreenParticleBridge(
  canvas: HTMLCanvasElement,
  fallbackEngine: ReactionParticleEngine,
  initialWidth: number,
  initialHeight: number,
  initialDpr: number = 1,
): ParticleBridgeHandle {
  if (isOffscreenCanvasSupported()) {
    try {
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new Worker(new URL('./workers/videoProcessor.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.postMessage(
        {
          type: 'INIT_CANVAS',
          canvas: offscreen,
          width: initialWidth,
          height: initialHeight,
          dpr: initialDpr,
        },
        [offscreen],
      );

      return {
        isOffscreen: true,
        spawn: (emoji: string, width: number, height: number, startX?: number) => {
          worker.postMessage({
            type: 'SPAWN_PARTICLE',
            emoji,
            width,
            height,
            startX,
          });
        },
        resize: (width: number, height: number, dpr: number) => {
          worker.postMessage({
            type: 'RESIZE',
            width,
            height,
            dpr,
          });
        },
        setTravelerMode: (enabled: boolean) => {
          worker.postMessage({
            type: 'SET_TRAVELER_MODE',
            enabled,
          });
        },
        destroy: () => {
          worker.postMessage({ type: 'STOP' });
          worker.terminate();
        },
      };
    } catch (err) {
      console.warn(
        '[OffscreenBridge] Failed to initialize worker, falling back to main-thread:',
        err,
      );
    }
  }

  // Fallback to in-thread engine
  return {
    isOffscreen: false,
    spawn: (emoji: string, width: number, height: number, startX?: number) => {
      fallbackEngine.spawn(emoji, width, height, startX);
    },
    resize: (_width: number, _height: number, _dpr: number) => {},
    setTravelerMode: (_enabled: boolean) => {},
    destroy: () => {
      fallbackEngine.clear();
    },
  };
}
