import { describe, it, expect, vi } from 'vitest';
import {
  serializeRtpPacket,
  parseRtpPacket,
  packetizeEncodedChunk,
  RtpFrameReassembler,
  RTP_MAGIC,
  FLAG_KEYFRAME,
  FLAG_END_OF_FRAME,
} from '../webCodecsRtpPipeline';

describe('webCodecsRtpPipeline', () => {
  it('serializes and parses RTP packet headers with zero loss', () => {
    const payload = new Uint8Array([10, 20, 30, 40, 50]);
    const header = {
      magic: RTP_MAGIC,
      frameId: 42,
      seq: 101,
      chunkIdx: 0,
      chunkCount: 1,
      flags: FLAG_KEYFRAME | FLAG_END_OF_FRAME,
      timestamp: 999999,
    };

    const packet = serializeRtpPacket(header, payload);
    const parsed = parseRtpPacket(packet);

    expect(parsed).not.toBeNull();
    expect(parsed?.header.magic).toBe(RTP_MAGIC);
    expect(parsed?.header.frameId).toBe(42);
    expect(parsed?.header.seq).toBe(101);
    expect(parsed?.header.chunkIdx).toBe(0);
    expect(parsed?.header.chunkCount).toBe(1);
    expect(parsed?.header.flags).toBe(FLAG_KEYFRAME | FLAG_END_OF_FRAME);
    expect(parsed?.header.timestamp).toBe(999999);
    expect(Array.from(parsed!.payload)).toEqual([10, 20, 30, 40, 50]);
  });

  it('rejects invalid or corrupted magic bytes', () => {
    const packet = new Uint8Array(20);
    packet[0] = 0x99; // Not RTP_MAGIC (0x56)
    expect(parseRtpPacket(packet)).toBeNull();
  });

  it('slices large video frames into MTU-safe datagrams', () => {
    // 3500 bytes frame: with MAX_RTP_PAYLOAD_SIZE = 1164, should produce ceil(3500/1164) = 4 packets
    const frameData = new Uint8Array(3500);
    for (let i = 0; i < frameData.length; i++) {
      frameData[i] = i % 256;
    }

    const packets = packetizeEncodedChunk(frameData, 10, true, 12345, 0);
    expect(packets.length).toBe(4);

    // Verify all packets are <= 1180 bytes (16 header + 1164 payload)
    for (const pkt of packets) {
      expect(pkt.byteLength).toBeLessThanOrEqual(1180);
    }

    // Verify flags
    const firstPkt = parseRtpPacket(packets[0])!;
    expect(firstPkt.header.flags & FLAG_KEYFRAME).toBeTruthy();
    expect(firstPkt.header.flags & FLAG_END_OF_FRAME).toBeFalsy();

    const lastPkt = parseRtpPacket(packets[3])!;
    expect(lastPkt.header.flags & FLAG_END_OF_FRAME).toBeTruthy();
  });

  it('reassembles chunks into the exact original frame', () => {
    const original = new Uint8Array(3000);
    for (let i = 0; i < original.length; i++) {
      original[i] = (i * 7) % 256;
    }

    const onFrameReady = vi.fn();
    const onRequestPli = vi.fn();
    const reassembler = new RtpFrameReassembler(onFrameReady, onRequestPli);

    const packets = packetizeEncodedChunk(original, 55, false, 5000);

    for (const pkt of packets) {
      reassembler.pushPacket(pkt);
    }

    expect(onFrameReady).toHaveBeenCalledTimes(1);
    expect(onRequestPli).not.toHaveBeenCalled();

    const [assembledData, isKeyframe, timestamp] = onFrameReady.mock.calls[0];
    expect(isKeyframe).toBe(false);
    expect(timestamp).toBe(5000);
    expect(Array.from(assembledData as Uint8Array)).toEqual(Array.from(original));
  });

  it('fires PLI request when previous frame chunks are dropped', () => {
    const onFrameReady = vi.fn();
    const onRequestPli = vi.fn();
    const reassembler = new RtpFrameReassembler(onFrameReady, onRequestPli);

    // Frame 1: 3 packets
    const frame1 = new Uint8Array(2500);
    const packets1 = packetizeEncodedChunk(frame1, 1, false, 100);

    // Push only packet 0 (packet 1 and 2 lost)
    reassembler.pushPacket(packets1[0]);

    // Now Frame 2 arrives: reassembler detects frame 1 was incomplete
    const frame2 = new Uint8Array(100);
    const packets2 = packetizeEncodedChunk(frame2, 2, true, 133);
    reassembler.pushPacket(packets2[0]);

    expect(onRequestPli).toHaveBeenCalledTimes(1);
  });
});
