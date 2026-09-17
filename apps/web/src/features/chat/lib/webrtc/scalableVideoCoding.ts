/**
 * Direct Scalable Video Coding (SVC) & Transceiver Parameters
 *
 * Configures single-stream spatio-temporal scalable encoding (AV1 / VP9)
 * replacing legacy multi-stream simulcast. Supports dynamic on-the-fly
 * layer switching without SDP renegotiation via RTCRtpSender.setParameters().
 */

declare global {
  interface RTCRtpEncodingParameters {
    scalabilityMode?: string;
  }
}

export type SVCScalabilityMode =
  | 'L3T3' // 3 spatial layers + 3 temporal layers (Full/Half/Quarter, 60/30/15 fps)
  | 'L3T1' // 3 spatial layers + 1 temporal layer
  | 'L2T2' // 2 spatial layers + 2 temporal layers
  | 'L1T3' // 1 spatial layer + 3 temporal layers (Eco / Low Bandwidth)
  | 'L1T2' // 1 spatial layer + 2 temporal layers
  | 'L1T1'; // Baseline single layer

export interface SVCOptions {
  rid?: string;
  scalabilityMode?: SVCScalabilityMode;
  maxBitrate?: number; // bits per second (e.g. 2_500_000)
  maxFramerate?: number; // frames per second (e.g. 60)
  scaleResolutionDownBy?: number;
  active?: boolean;
}

export const SVC_PRESETS: Record<string, SVCOptions> = {
  HIGH_RES_60FPS: {
    rid: 'h',
    scalabilityMode: 'L3T3',
    maxBitrate: 2_500_000,
    maxFramerate: 60,
    active: true,
  },
  BALANCED_30FPS: {
    rid: 'h',
    scalabilityMode: 'L2T2',
    maxBitrate: 1_200_000,
    maxFramerate: 30,
    active: true,
  },
  LOW_BANDWIDTH: {
    rid: 'h',
    scalabilityMode: 'L1T3',
    maxBitrate: 500_000,
    maxFramerate: 30,
    active: true,
  },
  SAVER_15FPS: {
    rid: 'h',
    scalabilityMode: 'L1T1',
    maxBitrate: 200_000,
    maxFramerate: 15,
    active: true,
  },
};

/**
 * Checks if the current browser environment reports SVC scalabilityMode capability
 */
export function isSVCScalabilitySupported(preferredCodec = 'video/VP9'): boolean {
  if (typeof RTCRtpSender === 'undefined' || typeof RTCRtpSender.getCapabilities !== 'function') {
    return false;
  }

  try {
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (!capabilities) return false;

    // Check if VP9 or AV1 codecs with scalabilityModes are present
    const hasTargetCodec = capabilities.codecs.some(
      (c) => c.mimeType.toLowerCase() === preferredCodec.toLowerCase(),
    );

    // If browser exposes scalabilityModes array in capabilities
    const hasScalability =
      Array.isArray((capabilities as any).scalabilityModes) &&
      (capabilities as any).scalabilityModes.length > 0;

    return hasTargetCodec || hasScalability;
  } catch {
    return false;
  }
}

/**
 * Directly applies SVC parameters (e.g. L3T3) to an RTCRtpSender
 */
export async function configureSenderSVC(
  sender: RTCRtpSender,
  options: Partial<SVCOptions> = {},
): Promise<boolean> {
  if (!sender || typeof sender.getParameters !== 'function') return false;

  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }

    const config: SVCOptions = {
      ...SVC_PRESETS.HIGH_RES_60FPS,
      ...options,
    };

    // Update primary encoding with SVC parameters
    const existingEncoding = params.encodings[0];
    const resolvedRid = config.rid ?? existingEncoding.rid;
    params.encodings[0] = {
      ...existingEncoding,
      ...(resolvedRid ? { rid: resolvedRid } : {}),

      scalabilityMode: config.scalabilityMode as any,
      maxBitrate: config.maxBitrate,
      maxFramerate: config.maxFramerate,
      scaleResolutionDownBy: config.scaleResolutionDownBy ?? 1,
      active: config.active ?? true,
    };

    await sender.setParameters(params);
    return true;
  } catch (err) {
    console.warn('[SVC] Failed to set SVC parameters on sender:', err);
    return false;
  }
}

/**
 * Activates or deactivates the primary video encoding layer on the fly
 */
export async function setSVCLayerActive(sender: RTCRtpSender, active: boolean): Promise<boolean> {
  if (!sender || typeof sender.getParameters !== 'function') return false;

  try {
    const params = sender.getParameters();
    if (params.encodings && params.encodings[0]) {
      params.encodings[0].active = active;
      await sender.setParameters(params);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[SVC] Failed to toggle active layer state:', err);
    return false;
  }
}

/**
 * Switches the active scalabilityMode and target bitrate without renegotiation
 */
export async function switchSVCScalabilityMode(
  sender: RTCRtpSender,
  mode: SVCScalabilityMode,
  maxBitrate?: number,
): Promise<boolean> {
  if (!sender || typeof sender.getParameters !== 'function') return false;

  try {
    const params = sender.getParameters();
    if (params.encodings && params.encodings[0]) {
      (params.encodings[0] as any).scalabilityMode = mode;
      if (maxBitrate !== undefined) {
        params.encodings[0].maxBitrate = maxBitrate;
      }
      await sender.setParameters(params);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[SVC] Failed to switch scalabilityMode to ${mode}:`, err);
    return false;
  }
}

/**
 * Automatically scales the SVC profile based on measured available bandwidth
 */
export async function scaleSVCForBandwidth(
  sender: RTCRtpSender,
  estimatedBandwidthBps: number,
): Promise<{ mode: SVCScalabilityMode; bitrate: number }> {
  let targetPreset: SVCOptions;

  if (estimatedBandwidthBps >= 2_000_000) {
    targetPreset = SVC_PRESETS.HIGH_RES_60FPS;
  } else if (estimatedBandwidthBps >= 800_000) {
    targetPreset = SVC_PRESETS.BALANCED_30FPS;
  } else if (estimatedBandwidthBps >= 350_000) {
    targetPreset = SVC_PRESETS.LOW_BANDWIDTH;
  } else {
    targetPreset = SVC_PRESETS.SAVER_15FPS;
  }

  await switchSVCScalabilityMode(
    sender,
    targetPreset.scalabilityMode || 'L3T3',
    targetPreset.maxBitrate,
  );

  return {
    mode: targetPreset.scalabilityMode || 'L3T3',
    bitrate: targetPreset.maxBitrate || 2_500_000,
  };
}
