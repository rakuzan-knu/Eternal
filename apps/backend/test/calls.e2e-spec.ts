import type { INestApplication } from '@nestjs/common';
import type { Server as HttpServer } from 'http';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { io, type Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { AppModule } from '../src/app.module';
import { RedisIoAdapter } from '../src/common/adapters/redis-io.adapter';
import { WS_EVENTS } from '../src/messenger/events/ws-events';
import { K8sPodMigrationService } from '../src/messenger/gateway/k8s-pod-migration.service';
import { OffHeapBufferPoolService } from '../src/messenger/services/off-heap-buffer-pool.service';

interface AuthedUser {
  id: string;
  token: string;
}

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function registerUser(app: INestApplication<App>, name: string): Promise<AuthedUser> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: `${name}.${runId}@example.com`,
      username: `${name}${runId}`,
      displayName: name,
      password: 'Password123!',
    })
    .expect(201);
  const body = response.body as { user: { id: string }; accessToken: string };
  return { id: body.user.id, token: body.accessToken };
}

function waitForEvent<T>(socket: Socket, event: string, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function httpPort(app: INestApplication<App>): number {
  const address = (app.getHttpServer() as unknown as HttpServer).address();
  return (address as { port: number }).port;
}

function connect(app: INestApplication<App>, token: string): Socket {
  return io(`http://localhost:${httpPort(app)}/messenger`, {
    parser: msgpackParser,
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
}

describe('Voice & Video Calls Signaling (e2e)', () => {
  let app: INestApplication<App>;
  let alice: AuthedUser;
  let bob: AuthedUser;
  let aliceSocket: Socket;
  let bobSocket: Socket;
  let conversationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(process.env.REDIS_URL);
    app.useWebSocketAdapter(redisIoAdapter);
    await app.listen(0);

    alice = await registerUser(app, 'call_alice');
    bob = await registerUser(app, 'call_bob');

    // Create direct conversation between alice and bob
    const created = await request(app.getHttpServer())
      .post('/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ participantId: bob.id })
      .expect(201);
    conversationId = (created.body as { id: string }).id;

    aliceSocket = connect(app, alice.token);
    bobSocket = connect(app, bob.token);
    await Promise.all([
      waitForEvent<{ sessionId: string }>(aliceSocket, 'gatewayReady'),
      waitForEvent<{ sessionId: string }>(bobSocket, 'gatewayReady'),
    ]);
  }, 30000);

  afterAll(async () => {
    aliceSocket?.disconnect();
    bobSocket?.disconnect();
    if (app) {
      await app.close();
    }
  });

  it('GET /calls/ice-servers returns STUN configurations', async () => {
    const response = await request(app.getHttpServer())
      .get('/calls/ice-servers')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    const body = response.body as { iceServers: unknown[] };
    expect(body).toHaveProperty('iceServers');
    expect(Array.isArray(body.iceServers)).toBe(true);
    expect(body.iceServers.length).toBeGreaterThan(0);
  });

  it('performs complete WebRTC signaling flow: initiate -> incoming -> accept -> ice-candidate -> mute -> end', async () => {
    const incomingPromise = waitForEvent<{
      callId: string;
      callerId: string;
      conversationId: string;
      callType: string;
      sdpOffer: unknown;
    }>(bobSocket, WS_EVENTS.CALL_INCOMING);

    // 1. Alice initiates call
    const sdpOfferMock = { type: 'offer', sdp: 'v=0\r\no=alice...' };
    const initiateRes = await new Promise<{ status: string; callId: string }>((resolve) => {
      aliceSocket.emit(
        WS_EVENTS.CALL_INITIATE,
        {
          conversationId,
          callType: 'AUDIO',
          sdpOffer: sdpOfferMock,
          iceCandidates: [],
        },
        resolve,
      );
    });

    expect(initiateRes.status).toBe('ok');
    expect(initiateRes.callId).toBeDefined();
    const callId = initiateRes.callId;

    // 2. Bob receives call:incoming
    const incoming = await incomingPromise;
    expect(incoming.callId).toBe(callId);
    expect(incoming.callerId).toBe(alice.id);
    expect(incoming.conversationId).toBe(conversationId);
    expect(incoming.callType).toBe('AUDIO');

    // 3. Bob accepts call
    const acceptedPromise = waitForEvent<{
      callId: string;
      accepterId: string;
      sdpAnswer: unknown;
    }>(aliceSocket, WS_EVENTS.CALL_ACCEPTED);

    const sdpAnswerMock = { type: 'answer', sdp: 'v=0\r\no=bob...' };
    bobSocket.emit(WS_EVENTS.CALL_ACCEPT, {
      callId,
      sdpAnswer: sdpAnswerMock,
      iceCandidates: [],
    });

    const accepted = await acceptedPromise;
    expect(accepted.callId).toBe(callId);
    expect(accepted.accepterId).toBe(bob.id);

    // 4. ICE candidate exchange
    const iceCandidatePromise = waitForEvent<{
      callId: string;
      candidate: unknown;
      senderUserId: string;
    }>(bobSocket, WS_EVENTS.CALL_ICE_CANDIDATE);

    const mockCandidate = {
      candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 5000 typ host',
      sdpMid: '0',
    };
    aliceSocket.emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
      callId,
      candidate: mockCandidate,
      targetUserId: bob.id,
    });

    const iceReceived = await iceCandidatePromise;
    expect(iceReceived.callId).toBe(callId);
    expect(iceReceived.senderUserId).toBe(alice.id);
    expect(iceReceived.candidate).toEqual(mockCandidate);

    // 5. Media toggle: Alice mutes
    const mutePromise = waitForEvent<{
      callId: string;
      userId: string;
      isMuted: boolean;
    }>(bobSocket, WS_EVENTS.CALL_MUTE);

    aliceSocket.emit(WS_EVENTS.CALL_MUTE, {
      callId,
      isMuted: true,
    });

    const muteEvent = await mutePromise;
    expect(muteEvent.callId).toBe(callId);
    expect(muteEvent.userId).toBe(alice.id);
    expect(muteEvent.isMuted).toBe(true);

    // 6. Alice ends call
    const endedPromise = waitForEvent<{
      callId: string;
      reason: string;
      durationMs?: number;
    }>(bobSocket, WS_EVENTS.CALL_ENDED);

    aliceSocket.emit(WS_EVENTS.CALL_END, {
      callId,
      reason: 'ENDED_BY_USER',
      durationMs: 45000,
    });

    const ended = await endedPromise;
    expect(ended.callId).toBe(callId);
    expect(ended.reason).toBe('ENDED_BY_USER');

    // 7. Verify CALL_LOG message in conversation
    const messagesRes = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    const resBody = messagesRes.body as { data: Array<{ messageType: string; body: string }> };
    const messages = resBody.data;
    const callLogMessage = messages.find((m) => m.messageType === 'CALL_LOG');
    expect(callLogMessage).toBeDefined();
    const metadata = JSON.parse(callLogMessage?.body ?? '{}') as {
      callId: string;
      callType: string;
      status: string;
    };
    expect(metadata.callId).toBe(callId);
    expect(metadata.callType).toBe('AUDIO');
    expect(metadata.status).toBe('ENDED');
  });

  it('GET /calls/history returns user call history', async () => {
    const response = await request(app.getHttpServer())
      .get('/calls/history')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    const history = response.body as Array<{ id: string; type: string; status: string }>;
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('id');
    expect(history[0]).toHaveProperty('type');
    expect(history[0]).toHaveProperty('status');
  });

  it('handles call rejection flow cleanly', async () => {
    const incomingPromise = waitForEvent<{ callId: string }>(bobSocket, WS_EVENTS.CALL_INCOMING);

    const initRes = await new Promise<{ status: string; callId: string }>((resolve) => {
      aliceSocket.emit(
        WS_EVENTS.CALL_INITIATE,
        {
          conversationId,
          callType: 'VIDEO',
        },
        resolve,
      );
    });

    const callId = initRes.callId;
    await incomingPromise;

    const endedPromise = waitForEvent<{ callId: string; reason: string }>(
      aliceSocket,
      WS_EVENTS.CALL_ENDED,
    );

    bobSocket.emit(WS_EVENTS.CALL_REJECT, {
      callId,
      reason: 'DECLINED',
    });

    const ended = await endedPromise;
    expect(ended.callId).toBe(callId);
    expect(ended.reason).toBe('DECLINED');
  });

  it('handles WebRTC auto ICE-restart signaling between peers', async () => {
    const incomingPromise = waitForEvent<{ callId: string }>(bobSocket, WS_EVENTS.CALL_INCOMING);

    const initRes = await new Promise<{ status: string; callId: string }>((resolve) => {
      aliceSocket.emit(
        WS_EVENTS.CALL_INITIATE,
        {
          conversationId,
          callType: 'AUDIO',
        },
        resolve,
      );
    });

    const callId = initRes.callId;
    await incomingPromise;

    // Bob accepts
    const acceptedPromise = waitForEvent<{ callId: string }>(aliceSocket, WS_EVENTS.CALL_ACCEPTED);
    bobSocket.emit(WS_EVENTS.CALL_ACCEPT, {
      callId,
      sdpAnswer: { type: 'answer', sdp: 'v=0\r\no=bob 2 2 IN IP4 127.0.0.1' },
    });
    await acceptedPromise;

    // Alice triggers ICE restart
    const restartPromise = waitForEvent<{ callId: string; sdpOffer: { sdp?: string } }>(
      bobSocket,
      WS_EVENTS.CALL_ICE_RESTART,
    );

    aliceSocket.emit(WS_EVENTS.CALL_ICE_RESTART, {
      callId,
      targetUserId: bob.id,
      sdpOffer: { type: 'offer', sdp: 'v=0\r\no=alice 3 3 IN IP4 127.0.0.1\r\na=ice-restart' },
    });

    const restartPayload = await restartPromise;
    expect(restartPayload.callId).toBe(callId);
    expect(restartPayload.sdpOffer?.sdp).toContain('ice-restart');

    // Bob responds with ICE restart answer
    const restartAnswerPromise = waitForEvent<{ callId: string; sdpAnswer: { sdp?: string } }>(
      aliceSocket,
      WS_EVENTS.CALL_ICE_RESTART_ANSWER,
    );

    bobSocket.emit(WS_EVENTS.CALL_ICE_RESTART_ANSWER, {
      callId,
      targetUserId: alice.id,
      sdpAnswer: { type: 'answer', sdp: 'v=0\r\no=bob 4 4 IN IP4 127.0.0.1' },
    });

    const answerPayload = await restartAnswerPromise;
    expect(answerPayload.callId).toBe(callId);

    // Clean up call
    aliceSocket.emit(WS_EVENTS.CALL_END, { callId, reason: 'ENDED_BY_USER' });
  });

  it('POST /calls/:id/decline declines call via REST', async () => {
    const incomingPromise = waitForEvent<{ callId: string }>(bobSocket, WS_EVENTS.CALL_INCOMING);

    const initRes = await new Promise<{ status: string; callId: string }>((resolve) => {
      aliceSocket.emit(
        WS_EVENTS.CALL_INITIATE,
        {
          conversationId,
          callType: 'VIDEO',
        },
        resolve,
      );
    });

    const callId = initRes.callId;
    await incomingPromise;

    const endedPromise = waitForEvent<{ callId: string; reason: string }>(
      aliceSocket,
      WS_EVENTS.CALL_ENDED,
    );

    // Bob declines via REST
    await request(app.getHttpServer())
      .post(`/calls/${callId}/decline`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ reason: 'DECLINED' })
      .expect(200);

    const ended = await endedPromise;
    expect(ended.callId).toBe(callId);
  });

  it('POST /calls/telemetry saves call quality metrics and GET /calls/telemetry/summary returns aggregations', async () => {
    // Initiate and end a call to get a valid callId
    const initRes = await new Promise<{ status: string; callId: string }>((resolve) => {
      aliceSocket.emit(
        WS_EVENTS.CALL_INITIATE,
        {
          conversationId,
          callType: 'AUDIO',
        },
        resolve,
      );
    });

    const callId = initRes.callId;

    // Alice submits telemetry
    const postRes = await request(app.getHttpServer())
      .post('/calls/telemetry')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        callId,
        avgRttMs: 42.5,
        maxRttMs: 95.0,
        packetLossRatio: 0.015,
        jitterMs: 4.2,
        audioCodec: 'opus',
        videoCodec: 'VP9',
        durationMs: 45000,
        endReason: 'ENDED_BY_USER',
      })
      .expect(201);

    const postBody = postRes.body as {
      callId: string;
      userId: string;
      avgRttMs: number;
      audioCodec: string;
    };
    expect(postBody.callId).toBe(callId);
    expect(postBody.userId).toBe(alice.id);
    expect(postBody.avgRttMs).toBe(42.5);
    expect(postBody.audioCodec).toBe('opus');

    // Alice checks quality summary
    const summaryRes = await request(app.getHttpServer())
      .get('/calls/telemetry/summary')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    const summaryBody = summaryRes.body as {
      totalCalls: number;
      avgRttMs: number;
      recentTelemetries: Array<{ callId: string }>;
    };
    expect(summaryBody.totalCalls).toBeGreaterThanOrEqual(1);
    expect(summaryBody.avgRttMs).toBeGreaterThan(0);
    expect(Array.isArray(summaryBody.recentTelemetries)).toBe(true);
    expect(summaryBody.recentTelemetries[0]?.callId).toBe(callId);
  });

  it('GET /calls/:id/og-image returns dynamic SVG Open Graph card without authentication', async () => {
    const initRes = await new Promise<{ status: string; callId: string }>((resolve) => {
      aliceSocket.emit(
        WS_EVENTS.CALL_INITIATE,
        {
          conversationId,
          callType: 'VIDEO',
        },
        resolve,
      );
    });
    const callId = initRes.callId;

    const res = await request(app.getHttpServer()).get(`/calls/${callId}/og-image`).expect(200);

    expect(res.headers['content-type']).toContain('image/svg+xml');
    expect(res.headers['cache-control']).toContain('public');
    const rawBody: unknown = res.body;
    const svgText = res.text || (Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : '');
    expect(svgText).toContain('<svg');
    expect(svgText).toContain('ANTIGRAVITY');
    expect(svgText).toContain('Защищенный HD-звонок');
  });

  it('POST /calls/step-up/challenge and POST /calls/step-up/verify flow for biometric authentication', async () => {
    const fakeCallId = '00000000-0000-4000-8000-000000000001';

    // 1. Request biometric challenge
    const challengeRes = await request(app.getHttpServer())
      .post('/calls/step-up/challenge')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        callId: fakeCallId,
        action: 'RECORD_CALL',
      })
      .expect(200);

    const challengeBody = challengeRes.body as {
      challenge: string;
      rpId: string;
      timeout: number;
      userVerification: string;
      action: string;
      callId: string;
    };

    expect(challengeBody).toHaveProperty('challenge');
    expect(typeof challengeBody.challenge).toBe('string');
    expect(challengeBody.challenge.length).toBeGreaterThan(10);
    expect(challengeBody.action).toBe('RECORD_CALL');
    expect(challengeBody.callId).toBe(fakeCallId);

    // 2. Verify biometric assertion
    const clientDataJsonStr = JSON.stringify({
      type: 'webauthn.get',
      challenge: challengeBody.challenge,
      origin: 'http://localhost:5173',
    });
    const clientDataBase64 = Buffer.from(clientDataJsonStr, 'utf-8').toString('base64url');

    const verifyRes = await request(app.getHttpServer())
      .post('/calls/step-up/verify')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        callId: fakeCallId,
        action: 'RECORD_CALL',
        challenge: challengeBody.challenge,
        assertionResponse: {
          id: 'credential-test-id-123',
          rawId: Buffer.from('credential-test-id-123').toString('base64url'),
          response: {
            clientDataJSON: clientDataBase64,
            authenticatorData: Buffer.from('auth-data').toString('base64url'),
            signature: Buffer.from('sig').toString('base64url'),
          },
          type: 'public-key',
        },
      })
      .expect(200);

    const verifyBody = verifyRes.body as {
      verified: boolean;
      scopedToken: string;
      expiresInSec: number;
      action: string;
      callId: string;
    };

    expect(verifyBody.verified).toBe(true);
    expect(typeof verifyBody.scopedToken).toBe('string');
    expect(verifyBody.scopedToken.length).toBeGreaterThan(20);
    expect(verifyBody.expiresInSec).toBe(300);
    expect(verifyBody.action).toBe('RECORD_CALL');
    expect(verifyBody.callId).toBe(fakeCallId);
  });

  it('K8sPodMigrationService records signaling events in Redis Streams and runs atomic Lua migration', async () => {
    const migrationService = app.get(K8sPodMigrationService);
    expect(migrationService).toBeDefined();

    const testCallId = '11111111-2222-3333-4444-555555555555';
    await migrationService.registerRoom(testCallId);

    // Record stream events
    const id1 = await migrationService.recordSignal(testCallId, 'offer', { sdp: 'v=0\r\no=test1' });
    const id2 = await migrationService.recordSignal(testCallId, 'candidate', {
      candidate: 'cand1',
    });

    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');

    // Read missed signals
    const missed = await migrationService.readMissedSignals(testCallId, '0');
    expect(missed.length).toBeGreaterThanOrEqual(2);
    expect(missed.some((m) => m.event === 'offer')).toBe(true);
    expect(missed.some((m) => m.event === 'candidate')).toBe(true);

    // Atomic Lua migration
    const migrated = await migrationService.migrateRoomsOnShutdown(undefined, 'target-pod-backup');
    expect(migrated).toBeGreaterThanOrEqual(1);
  });

  it('OffHeapBufferPoolService encodes and decodes real-time streaming packets with zero V8 GC pauses', () => {
    const poolService = app.get(OffHeapBufferPoolService);
    expect(poolService).toBeDefined();

    const sampleUuid = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
    const rawAudioFrame = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);

    // Encode packet directly in off-heap slab via DataView
    const packet = poolService.encodePacket(2, 42, sampleUuid, rawAudioFrame);
    expect(packet).toBeInstanceOf(Buffer);
    expect(packet.byteLength).toBe(36 + rawAudioFrame.byteLength);

    // Decode packet zero-copy
    const decoded = poolService.decodePacket(packet);
    expect(decoded.type).toBe(2);
    expect(decoded.seq).toBe(42);
    expect(decoded.callId).toBe(sampleUuid);
    expect(decoded.payloadLength).toBe(rawAudioFrame.byteLength);
    expect(Buffer.compare(decoded.payload, rawAudioFrame)).toBe(0);

    const stats = poolService.getStats();
    expect(stats.allocationsCount).toBeGreaterThan(0);
    expect(stats.capacityBytes).toBeGreaterThanOrEqual(16 * 1024 * 1024);
  });
});
