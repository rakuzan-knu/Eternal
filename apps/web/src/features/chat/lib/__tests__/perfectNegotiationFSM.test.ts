import { describe, it, expect, vi } from 'vitest';
import { PerfectNegotiationFSM } from '../webrtc/perfectNegotiationFSM';

describe('PerfectNegotiationFSM', () => {
  function createMockPeerConnection(signalingState: RTCSignalingState = 'stable') {
    return {
      signalingState,
      localDescription: { type: 'answer', sdp: 'mock-answer-sdp' } as RTCSessionDescriptionInit,
      remoteDescription: null as RTCSessionDescriptionInit | null,
      setLocalDescription: vi.fn().mockImplementation((desc) => {
        if (desc?.type === 'rollback') {
          return Promise.resolve();
        }
        return Promise.resolve();
      }),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      getTransceivers: vi.fn().mockReturnValue([
        {
          direction: 'sendrecv',
          sender: { track: { kind: 'video' } },
          receiver: { track: { kind: 'video' } },
        },
        {
          direction: 'sendrecv',
          sender: { track: { kind: 'audio' } },
          receiver: { track: { kind: 'audio' } },
        },
      ]),
      onnegotiationneeded: null,
      onicecandidate: null,
      ontrack: null,
    } as unknown as RTCPeerConnection;
  }

  it('impolite peer rejects and ignores incoming offer during glare collision', async () => {
    // Unstable state represents collision
    const pc = createMockPeerConnection('have-local-offer');
    const sendSignal = vi.fn();

    const fsm = new PerfectNegotiationFSM({
      pc,
      isPolite: false, // Impolite
      sendSignal,
    });

    const incomingOffer: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: 'incoming-remote-offer',
    };

    const res = await fsm.handleOffer(incomingOffer);
    expect(res.ignored).toBe(true);
    expect(pc.setRemoteDescription).not.toHaveBeenCalled();
    expect(sendSignal).not.toHaveBeenCalled();
  });

  it('polite peer rolls back local description and accepts remote offer during glare collision', async () => {
    const pc = createMockPeerConnection('have-local-offer');
    const sendSignal = vi.fn();

    const fsm = new PerfectNegotiationFSM({
      pc,
      isPolite: true, // Polite
      sendSignal,
    });

    const incomingOffer: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: 'incoming-remote-offer',
    };

    const res = await fsm.handleOffer(incomingOffer);
    expect(res.ignored).toBe(false);
    expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: 'rollback' });
    expect(pc.setRemoteDescription).toHaveBeenCalledWith(incomingOffer);
    expect(sendSignal).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.anything() }),
    );
  });

  it('polite peer accepts offer normally when signalingState is stable', async () => {
    const pc = createMockPeerConnection('stable');
    const sendSignal = vi.fn();

    const fsm = new PerfectNegotiationFSM({
      pc,
      isPolite: true,
      sendSignal,
    });

    const incomingOffer: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: 'normal-offer',
    };

    const res = await fsm.handleOffer(incomingOffer);
    expect(res.ignored).toBe(false);
    expect(pc.setRemoteDescription).toHaveBeenCalledWith(incomingOffer);
    expect(sendSignal).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.anything() }),
    );
  });

  it('updates transceiver directions without track recreation', () => {
    const pc = createMockPeerConnection('stable');
    const fsm = new PerfectNegotiationFSM({
      pc,
      isPolite: true,
      sendSignal: vi.fn(),
    });

    const changed = fsm.setTransceiverDirection('video', 'sendonly');
    expect(changed).toBe(true);
    const transceivers = pc.getTransceivers();
    expect(transceivers[0].direction).toBe('sendonly');
  });
});
