import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  WebRTCSignalingFSM,
  PerfectNegotiationFSM,
  type SignalingFSMEvent,
} from '../perfectNegotiationFSM';

// Mock PeerConnection factory for deterministic PBT runs
function createMockPeerConnection() {
  let signalingState: RTCSignalingState = 'stable';
  let localDesc: RTCSessionDescriptionInit | null = null;
  let remoteDesc: RTCSessionDescriptionInit | null = null;

  const mockTransceivers = [
    {
      direction: 'sendrecv' as RTCRtpTransceiverDirection,
      sender: { track: { kind: 'audio' } as MediaStreamTrack },
      receiver: { track: { kind: 'audio' } as MediaStreamTrack },
    },
    {
      direction: 'sendrecv' as RTCRtpTransceiverDirection,
      sender: { track: { kind: 'video' } as MediaStreamTrack },
      receiver: { track: { kind: 'video' } as MediaStreamTrack },
    },
  ];

  const pc = {
    get signalingState() {
      return signalingState;
    },
    get localDescription() {
      return localDesc;
    },
    get remoteDescription() {
      return remoteDesc;
    },
    setLocalDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      if (desc?.type === 'rollback') {
        signalingState = 'stable';
        localDesc = null;
      } else {
        localDesc = desc ?? { type: 'offer', sdp: 'v=0\r\no=local 1 1 IN IP4 127.0.0.1' };
        signalingState = desc?.type === 'answer' ? 'stable' : 'have-local-offer';
      }
    }),
    setRemoteDescription: vi.fn(async (desc: RTCSessionDescriptionInit) => {
      remoteDesc = desc;
      if (desc.type === 'offer') {
        signalingState = 'have-remote-offer';
      } else if (desc.type === 'answer') {
        signalingState = 'stable';
      }
    }),
    addIceCandidate: vi.fn(async () => {}),
    getTransceivers: vi.fn(() => mockTransceivers),
    onnegotiationneeded: null as (() => Promise<void> | void) | null,
    ontrack: null as ((event: RTCTrackEvent) => void) | null,
  } as unknown as RTCPeerConnection;

  return pc;
}

// Generators for WebRTC signaling events
const offerArrivedGen = fc.record({
  type: fc.constant('OFFER_ARRIVED' as const),
  offer: fc.record({
    type: fc.constant('offer' as const),
    sdp: fc.stringMatching(/^[a-zA-Z0-9_\r\n= -]{5,50}$/),
  }),
});

const answerArrivedGen = fc.record({
  type: fc.constant('ANSWER_ARRIVED' as const),
  answer: fc.record({
    type: fc.constant('answer' as const),
    sdp: fc.stringMatching(/^[a-zA-Z0-9_\r\n= -]{5,50}$/),
  }),
});

const iceArrivedGen = fc.record({
  type: fc.constant('ICE_ARRIVED' as const),
  candidate: fc.record({
    candidate: fc.stringMatching(
      /^candidate:[0-9]+ [0-9]+ [a-zA-Z]+ [0-9]+ [0-9.]+ [0-9]+ typ host$/,
    ),
    sdpMid: fc.option(fc.string({ minLength: 1, maxLength: 5 })),
    sdpMLineIndex: fc.option(fc.integer({ min: 0, max: 8 })),
  }),
});

const reconnectGen = fc.constant({ type: 'RECONNECT' as const });
const disconnectGen = fc.constant({ type: 'DISCONNECT' as const });
const dropConnectionGen = fc.constant({ type: 'DROP_CONNECTION' as const });
const connectedGen = fc.constant({ type: 'CONNECTED' as const });
const muteGen = fc.record({
  type: fc.constant('MUTE' as const),
  kind: fc.oneof(fc.constant('audio' as const), fc.constant('video' as const)),
  muted: fc.boolean(),
});

const signalingEventGen = fc.oneof(
  offerArrivedGen,
  answerArrivedGen,
  iceArrivedGen,
  reconnectGen,
  disconnectGen,
  dropConnectionGen,
  connectedGen,
  muteGen,
);

describe('Property-Based Testing: WebRTC Signaling FSM via fast-check', () => {
  it('Invariant 1: FSM state is always valid and never undefined across thousands of event sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isPolite
        fc.array(signalingEventGen, { minLength: 1, maxLength: 60 }),
        async (isPolite, events) => {
          const pc = createMockPeerConnection();
          const sendSignal = vi.fn();
          const fsm = new WebRTCSignalingFSM({ pc, isPolite, sendSignal });

          const VALID_STATES = [
            'idle',
            'connecting',
            'connected',
            'reconnecting',
            'failed',
            'disconnected',
          ];

          for (const event of events) {
            await fsm.dispatch(event as SignalingFSMEvent);
            // Invariant: state must always be in defined universe
            expect(VALID_STATES).toContain(fsm.state);
            expect(fsm.state).toBeDefined();
            expect(typeof fsm.state).toBe('string');
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Invariant 2: Polite peer rolls back cleanly while impolite peer ignores collision offers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isPolite
        fc.array(offerArrivedGen, { minLength: 2, maxLength: 10 }),
        async (isPolite, offers) => {
          const pc = createMockPeerConnection();
          const sendSignal = vi.fn();
          const negotiationFSM = new PerfectNegotiationFSM({ pc, isPolite, sendSignal });

          // Simulate draft local offer in progress (glare condition)
          await pc.setLocalDescription({ type: 'offer', sdp: 'local-draft' });

          for (const { offer } of offers) {
            const res = await negotiationFSM.handleOffer(offer);

            if (isPolite) {
              // Polite peer MUST NOT ignore, must roll back and answer
              expect(res.ignored).toBe(false);
              expect(res.answer).toBeDefined();
            } else {
              // Impolite peer MUST ignore concurrent offer to avoid collision glare
              expect(res.ignored).toBe(true);
            }
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('Invariant 3: Terminal disconnect cleans up and preserves idempotence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(signalingEventGen, { minLength: 5, maxLength: 30 }),
        async (events) => {
          const pc = createMockPeerConnection();
          const fsm = new WebRTCSignalingFSM({ pc, isPolite: true, sendSignal: vi.fn() });

          for (const event of events) {
            await fsm.dispatch(event as SignalingFSMEvent);
          }

          // Disconnect event
          await fsm.dispatch({ type: 'DISCONNECT' });
          expect(fsm.state).toBe('disconnected');

          // Duplicate disconnect event is idempotent
          await fsm.dispatch({ type: 'DISCONNECT' });
          expect(fsm.state).toBe('disconnected');
        },
      ),
      { numRuns: 200 },
    );
  });
});
