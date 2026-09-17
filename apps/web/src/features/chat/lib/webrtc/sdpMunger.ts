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
 * Applies full SDP munging pipeline (codec prioritization + VP9 SVC injection)
 */
export function mungeSDP(sdp: string, preferredCodec: VideoCodecPreference = 'av1'): string {
  if (!sdp || preferredCodec === 'auto') return sdp;

  // Prioritize selected codec first, followed by high efficiency backups
  const fallbackOrder: VideoCodecPreference[] =
    preferredCodec === 'av1'
      ? ['av1', 'vp9', 'h264', 'vp8']
      : preferredCodec === 'vp9'
        ? ['vp9', 'av1', 'h264', 'vp8']
        : preferredCodec === 'h264'
          ? ['h264', 'vp9', 'av1', 'vp8']
          : ['vp8', 'vp9', 'h264', 'av1'];

  let result = prioritizeVideoCodecs(sdp, fallbackOrder);

  if (preferredCodec === 'vp9' || fallbackOrder.includes('vp9')) {
    result = injectVP9SVC(result);
  }

  return result;
}
