import { describe, it, expect } from 'vitest';
import { prioritizeVideoCodecs, injectVP9SVC, mungeSDP } from '../webrtc/sdpMunger';

const SAMPLE_SDP = `v=0
o=- 123456789 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111 103
a=rtpmap:111 opus/48000/2
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101
a=rtpmap:96 VP8/90000
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:98 VP9/90000
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 AV1/90000
a=rtpmap:101 H264/90000
`;

describe('sdpMunger', () => {
  it('prioritizes AV1 as the first video codec in m=video line', () => {
    const munged = prioritizeVideoCodecs(SAMPLE_SDP, 'av1');
    const mVideoLine = munged.split('\r\n').find((l) => l.startsWith('m=video'));
    expect(mVideoLine).toBeDefined();

    // 100 is AV1, so 100 should be the first payload type after SAVPF
    expect(mVideoLine).toBe('m=video 9 UDP/TLS/RTP/SAVPF 100 96 97 98 99 101');
  });

  it('prioritizes VP9 and preserves its RTX retransmission payload type next to it', () => {
    const munged = prioritizeVideoCodecs(SAMPLE_SDP, 'vp9');
    const mVideoLine = munged.split('\r\n').find((l) => l.startsWith('m=video'));
    expect(mVideoLine).toBeDefined();

    // 98 is VP9, 99 is RTX for VP9 (apt=98)
    expect(mVideoLine).toBe('m=video 9 UDP/TLS/RTP/SAVPF 98 99 96 97 100 101');
  });

  it('injects VP9 SVC parameters into SDP', () => {
    const injected = injectVP9SVC(SAMPLE_SDP);
    expect(injected).toContain('a=fmtp:98 profile-id=0;scalability-mode=L3T3_KEY');
  });

  it('applies full mungeSDP pipeline correctly', () => {
    const result = mungeSDP(SAMPLE_SDP, 'av1');
    const mVideoLine = result.split('\r\n').find((l) => l.startsWith('m=video'));
    expect(mVideoLine?.startsWith('m=video 9 UDP/TLS/RTP/SAVPF 100 98 99')).toBe(true);
    expect(result).toContain('scalability-mode=L3T3_KEY');
  });

  it('returns original SDP if invalid or auto', () => {
    expect(mungeSDP('', 'av1')).toBe('');
    expect(mungeSDP(SAMPLE_SDP, 'auto')).toBe(SAMPLE_SDP);
  });
});
