/**
 * SDP Munging Utility for WebRTC Video Codec Prioritization & VP9 SVC
 *
 * Reorders payload types in the m=video line to force the browser to negotiate
 * next-generation codecs (AV1: 40-50% bandwidth savings; VP9 SVC: multi-layer scalability).
 */

export type VideoCodecPreference = 'av1' | 'vp9' | 'h264' | 'vp8' | 'auto';

const CODEC_NAME_MAP: Record<string, string> = {
  av1: 'AV1',
  vp9: 'VP9',
  h264: 'H264',
  vp8: 'VP8',
};

/**
 * Reorders the payload types in the `m=video` line according to preferred codecs.
 */
export function prioritizeVideoCodecs(
  sdp: string,
  preferred: VideoCodecPreference | VideoCodecPreference[] = 'av1',
): string {
  if (!sdp || typeof sdp !== 'string') return sdp;

  const preferences = Array.isArray(preferred) ? preferred : [preferred];
  if (preferences.length === 0 || preferences[0] === 'auto') {
    return sdp;
  }

  // Normalize preferred names to uppercase SDP tokens (e.g. 'AV1', 'VP9')
  const targetTokens = preferences
    .map((p) => CODEC_NAME_MAP[p.toLowerCase()] || p.toUpperCase())
    .filter(Boolean);

  const lines = sdp.split(/\r\n|\r|\n/);
  const mVideoLineIndex = lines.findIndex((line) => line.startsWith('m=video '));

  if (mVideoLineIndex === -1) {
    return sdp;
  }

  // Find the boundaries of the video section (from m=video to next m= or end)
  let videoEndIndex = lines.length;
  for (let i = mVideoLineIndex + 1; i < lines.length; i++) {
    if (lines[i]?.startsWith('m=')) {
      videoEndIndex = i;
      break;
    }
  }

  // Parse rtpmap lines to map payload types to codec names: e.g. "a=rtpmap:96 VP8/90000"
  const ptToCodec = new Map<string, string>();
  const rtxMap = new Map<string, string>(); // apt (original PT) -> rtx PT

  for (let i = mVideoLineIndex; i < videoEndIndex; i++) {
    const line = lines[i];
    if (!line) continue;

    const rtpMatch = line.match(/^a=rtpmap:(\d+)\s+([A-Za-z0-9-]+)\//i);
    if (rtpMatch && rtpMatch[1] && rtpMatch[2]) {
      ptToCodec.set(rtpMatch[1], rtpMatch[2].toUpperCase());
    }

    const fmtpMatch = line.match(/^a=fmtp:(\d+)\s+apt=(\d+)/i);
    if (fmtpMatch && fmtpMatch[1] && fmtpMatch[2]) {
      rtxMap.set(fmtpMatch[2], fmtpMatch[1]);
    }
  }

  // Parse m=video line: e.g. "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 100 101"
  const mParts = lines[mVideoLineIndex]?.split(' ') || [];
  if (mParts.length < 4) {
    return sdp;
  }

  const prefix = mParts.slice(0, 3); // ["m=video", port, proto]
  const payloadTypes = mParts.slice(3); // ["96", "97", ...]

  const prioritizedPTs: string[] = [];
  const addedPTs = new Set<string>();

  // Add preferred codecs in order of priority
  for (const target of targetTokens) {
    for (const pt of payloadTypes) {
      if (addedPTs.has(pt)) continue;
      const codec = ptToCodec.get(pt);
      if (codec === target) {
        prioritizedPTs.push(pt);
        addedPTs.add(pt);

        // Include associated RTX retransmission payload type if present
        const rtxPt = rtxMap.get(pt);
        if (rtxPt && payloadTypes.includes(rtxPt) && !addedPTs.has(rtxPt)) {
          prioritizedPTs.push(rtxPt);
          addedPTs.add(rtxPt);
        }
      }
    }
  }

  // Append any remaining codecs
  for (const pt of payloadTypes) {
    if (!addedPTs.has(pt)) {
      prioritizedPTs.push(pt);
      addedPTs.add(pt);
    }
  }

  // Reassemble m=video line
  lines[mVideoLineIndex] = `${prefix.join(' ')} ${prioritizedPTs.join(' ')}`;

  return lines.join('\r\n');
}

/**
 * Injects VP9 Scalable Video Coding (SVC) parameters into the SDP.
 * Configures profile-id=0 and scalability-mode=L3T3_KEY (3 spatial layers, 3 temporal layers).
 */
export function injectVP9SVC(sdp: string): string {
  if (!sdp || typeof sdp !== 'string') return sdp;

  const lines = sdp.split(/\r\n|\r|\n/);
  const mVideoLineIndex = lines.findIndex((line) => line.startsWith('m=video '));
  if (mVideoLineIndex === -1) return sdp;

  // Find all payload types that correspond to VP9
  const vp9PTs = new Set<string>();
  for (let i = mVideoLineIndex; i < lines.length; i++) {
    const line = lines[i];
    if (i > mVideoLineIndex && line?.startsWith('m=')) break;
    if (!line) continue;

    const rtpMatch = line.match(/^a=rtpmap:(\d+)\s+VP9\//i);
    if (rtpMatch && rtpMatch[1]) {
      vp9PTs.add(rtpMatch[1]);
    }
  }

  if (vp9PTs.size === 0) {
    return sdp;
  }

  const modifiedLines: string[] = [];
  const handledFmtp = new Set<string>();

  for (const line of lines) {
    let handled = false;
    for (const pt of vp9PTs) {
      if (line.startsWith(`a=fmtp:${pt} `)) {
        // Enhance existing fmtp with scalability-mode if not already present
        let updated = line;
        if (!updated.includes('scalability-mode=')) {
          updated += ';scalability-mode=L3T3_KEY';
        }
        if (!updated.includes('profile-id=')) {
          updated += ';profile-id=0';
        }
        modifiedLines.push(updated);
        handledFmtp.add(pt);
        handled = true;
        break;
      }
    }

    if (!handled) {
      modifiedLines.push(line);
    }
  }

  // If any VP9 PT did not have an a=fmtp line, inject one right after its a=rtpmap line
  const finalLines: string[] = [];
  for (const line of modifiedLines) {
    finalLines.push(line);
    for (const pt of vp9PTs) {
      if (!handledFmtp.has(pt) && line.startsWith(`a=rtpmap:${pt} VP9`)) {
        finalLines.push(`a=fmtp:${pt} profile-id=0;scalability-mode=L3T3_KEY`);
        handledFmtp.add(pt);
      }
    }
  }

  return finalLines.join('\r\n');
}

/**
 * Injects Discord-grade Opus audio parameters (48kHz stereo, 128kbps, in-band FEC, minptime=10)
 */
export function optimizeOpusAudioSDP(sdp: string): string {
  if (!sdp || typeof sdp !== 'string') return sdp;

  const lines = sdp.split(/\r\n|\r|\n/);
  let opusPt: string | null = null;
  for (const line of lines) {
    const match = line.match(/^a=rtpmap:(\d+)\s+opus\/48000/i);
    if (match && match[1]) {
      opusPt = match[1];
      break;
    }
  }

  if (!opusPt) return sdp;

  const opusParams =
    'minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000;cbr=0';
  let fmtpFound = false;

  const updatedLines = lines.map((line) => {
    if (line.startsWith(`a=fmtp:${opusPt} `) || line.startsWith(`a=fmtp:${opusPt}=`)) {
      fmtpFound = true;
      const existingParams = line.slice(line.indexOf(' ') + 1);
      const paramMap = new Map<string, string>();
      for (const param of `${existingParams};${opusParams}`.split(';')) {
        const [k, v] = param.trim().split('=');
        if (k) paramMap.set(k.trim(), v ? v.trim() : '');
      }
      const merged = Array.from(paramMap.entries())
        .map(([k, v]) => (v ? `${k}=${v}` : k))
        .join(';');
      return `a=fmtp:${opusPt} ${merged}`;
    }
    return line;
  });

  if (!fmtpFound) {
    const rtpmapIndex = updatedLines.findIndex((line) => line.startsWith(`a=rtpmap:${opusPt} `));
    if (rtpmapIndex !== -1) {
      updatedLines.splice(rtpmapIndex + 1, 0, `a=fmtp:${opusPt} ${opusParams}`);
    }
  }

  return updatedLines.join('\r\n');
}

/**
 * Injects Discord-grade 1080p60 video parameters into SDP:
 * - b=AS:8000 (8 Mbps application-specific maximum bandwidth)
 * - b=TIAS:8000000 (Transport Independent Application Specific bandwidth)
 * - x-google-min-bitrate=3000;x-google-start-bitrate=6000;x-google-max-bitrate=12000
 */
export function optimizeVideoSDPForScreenShare(sdp: string, bitrateKbps: number = 6000): string {
  if (!sdp || typeof sdp !== 'string') return sdp;

  const lines = sdp.split(/\r\n|\r|\n/);
  const mVideoIndex = lines.findIndex((l) => l.startsWith('m=video '));
  if (mVideoIndex === -1) return sdp;

  // Insert b=AS and b=TIAS right after m=video or c= line within the video m-section
  let insertIndex = mVideoIndex + 1;
  while (
    insertIndex < lines.length &&
    (lines[insertIndex].startsWith('c=') || lines[insertIndex].startsWith('b='))
  ) {
    if (lines[insertIndex].startsWith('b=')) {
      // Remove any existing low bitrate line
      lines.splice(insertIndex, 1);
      continue;
    }
    insertIndex++;
  }

  const tiasBps = bitrateKbps * 1000;
  lines.splice(insertIndex, 0, `b=AS:${bitrateKbps}`, `b=TIAS:${tiasBps}`);

  // Build pt to codec map from rtpmap lines
  const ptToCodec = new Map<string, string>();
  for (let i = mVideoIndex; i < lines.length; i++) {
    if (i > mVideoIndex && lines[i]?.startsWith('m=')) break;
    const rtpMatch = lines[i]?.match(/^a=rtpmap:(\d+)\s+([A-Za-z0-9-]+)\//i);
    if (rtpMatch && rtpMatch[1] && rtpMatch[2]) {
      ptToCodec.set(rtpMatch[1], rtpMatch[2].toUpperCase());
    }
  }

  // Augment video a=fmtp lines ONLY for VP8 / VP9 (appending x-google-* to H264 breaks Chrome's RFC 6184 SDP parser!)
  const updatedLines: string[] = [];
  const handledFmtp = new Set<string>();

  for (const line of lines) {
    if (line.startsWith('a=fmtp:')) {
      const match = line.match(/^a=fmtp:(\d+)\s*(.*)$/);
      if (match) {
        const pt = match[1];
        const codec = ptToCodec.get(pt);
        if (codec === 'VP8' || codec === 'VP9') {
          handledFmtp.add(pt);
          let params = match[2];
          if (!params.includes('x-google-min-bitrate')) {
            params = params
              ? `${params};x-google-min-bitrate=3000;x-google-start-bitrate=5000;x-google-max-bitrate=10000`
              : `x-google-min-bitrate=3000;x-google-start-bitrate=5000;x-google-max-bitrate=10000`;
          }
          updatedLines.push(`a=fmtp:${pt} ${params}`);
          continue;
        }
      }
    }
    updatedLines.push(line);
  }

  // If VP8 or VP9 did not have an a=fmtp line, inject one right after its a=rtpmap line
  const finalLines: string[] = [];
  for (const line of updatedLines) {
    finalLines.push(line);
    for (const [pt, codec] of ptToCodec.entries()) {
      if (
        (codec === 'VP8' || codec === 'VP9') &&
        !handledFmtp.has(pt) &&
        line.startsWith(`a=rtpmap:${pt} `)
      ) {
        finalLines.push(
          `a=fmtp:${pt} x-google-min-bitrate=3000;x-google-start-bitrate=5000;x-google-max-bitrate=10000`,
        );
        handledFmtp.add(pt);
      }
    }
  }

  return finalLines.join('\r\n');
}

/**
 * Applies full SDP munging pipeline (Opus audio optimization + video codec prioritization + optional VP9 SVC + screen share 1080p60)
 */
export function mungeSDP(
  sdp: string,
  preferredCodec: VideoCodecPreference = 'vp8',
  enableVP9SVC: boolean = false,
  isScreenShare: boolean = false,
): string {
  if (!sdp || typeof sdp !== 'string') return sdp;
  if (preferredCodec === 'auto' && !isScreenShare) return sdp;

  let result = optimizeOpusAudioSDP(sdp);

  // For screen sharing, Discord-grade VP8 provides 100% reliable hardware/software encoding & decoding
  // across all Chromium browsers (Chrome, Edge, Opera) without MediaFoundation/DXVA GPU session limits.
  const effectiveCodec: VideoCodecPreference = isScreenShare ? 'vp8' : preferredCodec;

  if (effectiveCodec && effectiveCodec !== 'auto') {
    const fallbackOrder: VideoCodecPreference[] =
      effectiveCodec === 'vp8'
        ? ['vp8', 'vp9', 'h264', 'av1']
        : effectiveCodec === 'h264'
          ? ['h264', 'vp8', 'vp9', 'av1']
          : effectiveCodec === 'av1'
            ? ['av1', 'vp9', 'vp8', 'h264']
            : ['vp9', 'vp8', 'h264', 'av1'];

    result = prioritizeVideoCodecs(result, fallbackOrder);

    // CRITICAL: Only inject VP9 SVC (L3T3_KEY) if explicitly requested, NOT a screen share,
    // and effectiveCodec is strictly 'vp9'. Injecting L3T3_KEY on single-layer screen shares
    // causes the VP9 decoder to discard all frames and stay black.
    if (enableVP9SVC && !isScreenShare && effectiveCodec === 'vp9') {
      result = injectVP9SVC(result);
    }
  }

  if (isScreenShare) {
    result = optimizeVideoSDPForScreenShare(result, 6000);
  }

  return result;
}
