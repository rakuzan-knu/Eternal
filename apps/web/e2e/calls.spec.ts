import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { mockApi, fulfillApi } from './fixtures';
import { createCallSignalingFixture } from './call-signaling-fixture';

const ALICE = { id: 'usr-alice-e2e', username: 'alice', displayName: 'Alice E2E', avatar: null };
const BOB = { id: 'usr-bob-e2e', username: 'bob', displayName: 'Bob E2E', avatar: null };
const CONVERSATION = {
  id: 'conv-e2e-1',
  type: 'DIRECT',
  name: null,
  avatar: null,
  participants: [ALICE, BOB].map((user) => ({
    userId: user.id,
    user,
    role: 'MEMBER',
    nickname: null,
    theme: 'default',
    muteLevel: 'NONE',
    mutedUntil: null,
    joinedAt: '2024-01-01T00:00:00.000Z',
  })),
  lastMessage: null,
  unreadCount: 0,
  myTheme: 'default',
  myMuteLevel: 'NONE',
  myNickname: null,
  isArchived: false,
  isPinned: false,
  pinnedMessages: [],
  blockedByMe: false,
  participantCount: 2,
  hasMoreParticipants: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
type CallWindow = Window & {
  __CALL_STORE__: typeof import('../src/features/chat/model/callStore').useCallStore;
  __PC__: RTCPeerConnection;
  __e2eTracks: MediaStreamTrack[];
};
async function callSnapshot(page: Page) {
  return page.evaluate(() => {
    const current = window as unknown as CallWindow;
    const state = current.__CALL_STORE__.getState();
    return {
      status: state.callStatus,
      connection: current.__PC__?.connectionState,
      e2ee: state.e2eeStatus,
      sas: state.sasCode,
      fingerprint: state.e2eeFingerprint,
      localTracks: state.localStream?.getTracks().map((track) => track.kind) ?? [],
      remoteTracks: Object.values(state.remoteStreams).flatMap((stream) =>
        stream.getTracks().map((track) => track.kind),
      ),
    };
  });
}
for (const callType of ['audio', 'video'] as const) {
  test(`two users negotiate an encrypted ${callType} call, exchange media and peer data, and hang up cleanly`, async ({
    browser,
  }) => {
    const relay = await createCallSignalingFixture([ALICE, BOB]);
    const contexts: BrowserContext[] = [];
    const identities = new Map<
      string,
      { publicKey: string; algorithm: string; updatedAt: string }
    >();
    try {
      for (const _user of [ALICE, BOB]) {
        contexts.push(
          await browser.newContext({
            permissions: ['camera', 'microphone'],
            viewport: { width: 1280, height: 720 },
          }),
        );
      }
      const pages = await Promise.all(contexts.map((context) => context.newPage()));
      for (const [index, page] of pages.entries()) {
        const user = [ALICE, BOB][index];
        await page.addInitScript(
          ({ user, port }) => {
            localStorage.setItem(
              'auth-session',
              JSON.stringify({ state: { userId: user.id, isAuthenticated: true }, version: 0 }),
            );
            localStorage.setItem('accessToken', 'token-' + user.id);
            localStorage.setItem('refreshToken', 'refresh-' + user.id);
            // Only redirect the transport endpoint; real application handlers still
            // negotiate every SDP, ICE candidate, and ephemeral ECDH public key.
            const NativeWebSocket = window.WebSocket;
            window.WebSocket = class extends NativeWebSocket {
              constructor(url: string | URL, protocols?: string | string[]) {
                const destination = new URL(String(url));
                if (destination.pathname.startsWith('/socket.io/')) {
                  destination.hostname = '127.0.0.1';
                  destination.port = String(port);
                  destination.protocol = 'ws:';
                }
                super(destination.toString(), protocols);
              }
            };
          },
          { user, port: relay.port },
        );
        await page.route(/:3000\/(?:v1\/)?/, (route) => route.abort('blockedbyclient'));
        await mockApi(page, '/users/me', { json: user });
        await mockApi(page, '/users/' + user.id, { json: user });
        await mockApi(page, '/auth/refresh', {
          json: { accessToken: 'token-' + user.id, refreshToken: 'refresh-' + user.id },
        });
        await mockApi(page, '/notifications/unread-count', { json: { count: 0 } });
        await mockApi(page, '/conversations/page', {
          json: { data: [CONVERSATION], hasMore: false, nextCursor: null, order: 'activityAt' },
        });
        await mockApi(page, '/conversations/unread-count', { json: { count: 0 } });
        await mockApi(page, '/conversations/conv-e2e-1', { json: CONVERSATION });
        await mockApi(page, '/conversations/conv-e2e-1/messages', {
          json: { data: [], hasMore: false, nextCursor: null },
        });
        await mockApi(page, '/calls/ice-servers', { json: { iceServers: [], ttlSec: 86400 } });
        await mockApi(page, '/calls/webtransport-session', { json: {} });
        await mockApi(page, '/calls/telemetry**', { json: { success: true }, status: 201 });
        await page.route(/:3000\/(?:v1\/)?e2ee\/keys(?:\/[^?]+)?(?:\?.*)?$/, (route) => {
          if (route.request().method() === 'OPTIONS') return fulfillApi(route);
          if (route.request().method() === 'POST') {
            const body = route.request().postDataJSON();
            if (body.purpose === 'call')
              identities.set(user.id, {
                publicKey: body.publicKey,
                algorithm: body.algorithm,
                updatedAt: new Date().toISOString(),
              });
            return fulfillApi(route, { json: { success: true } });
          }
          const peerId = decodeURIComponent(
            new URL(route.request().url()).pathname.split('/').pop()!,
          );
          const identity = identities.get(peerId);
          return fulfillApi(route, {
            status: identity ? 200 : 404,
            json: identity ?? { message: 'Not registered' },
          });
        });
        await page.goto('/messages/conv-e2e-1');
        await expect(page.getByRole('button', { name: `Start ${callType} call` })).toBeVisible();
      }
      const [alice, bob] = pages;
      await expect.poll(() => relay.connectedUsers.size).toBe(2);
      await alice.getByRole('button', { name: `Start ${callType} call` }).click();
      await expect(alice.getByText(new RegExp(`Calling ${callType}`, 'i')).first()).toBeVisible();
      await expect(
        bob
          .getByText(new RegExp(`Incoming ${callType === 'audio' ? 'voice' : 'video'} call`, 'i'))
          .first(),
      ).toBeVisible();
      await bob.locator('button[title="Accept"]').first().click();
      for (const page of pages) {
        await expect
          .poll(() => callSnapshot(page))
          .toMatchObject({ status: 'connected', connection: 'connected', e2ee: 'unverified' });
        const media = await callSnapshot(page);
        expect(media.localTracks).toEqual(
          expect.arrayContaining(callType === 'video' ? ['audio', 'video'] : ['audio']),
        );
        expect(media.remoteTracks).toEqual(
          expect.arrayContaining(callType === 'video' ? ['audio', 'video'] : ['audio']),
        );
        // Connected signaling and a working data channel do not prove that the
        // answerer attached its sender to a negotiated media section.
        await expect
          .poll(async () =>
            page.evaluate(async () => {
              const pc = (window as unknown as CallWindow).__PC__;
              const stats = await pc.getStats();
              const reports = Array.from(stats.values());
              return ['inbound-rtp', 'outbound-rtp'].every((type) =>
                reports.some(
                  (report) =>
                    report.type === type &&
                    report.kind === 'audio' &&
                    Number(type === 'inbound-rtp' ? report.bytesReceived : report.bytesSent) > 0,
                ),
              );
            }),
          )
          .toBe(true);
      }
      await expect.poll(() => identities.size).toBe(2);
      expect(relay.handshakes).toHaveLength(2);
      for (const bundle of relay.handshakes) {
        expect(bundle.ephemeralKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(bundle.signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
      }
      const [aliceSession, bobSession] = await Promise.all(pages.map(callSnapshot));
      expect(aliceSession.sas).not.toBe('');
      expect(aliceSession.fingerprint).not.toBe('');
      expect(bobSession.sas).toBe(aliceSession.sas);
      expect(bobSession.fingerprint).toBe(aliceSession.fingerprint);
      // Exchange data over the app's actual peer pair across browser contexts.
      await bob.evaluate(() => {
        (window as unknown as CallWindow).__PC__.addEventListener('datachannel', ({ channel }) => {
          if (channel.label === 'app-call-e2e')
            channel.onmessage = ({ data }) => {
              if (data === 'PING_P2P_E2E') channel.send('PONG_P2P_E2E');
            };
        });
      });
      const delivered = await alice.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const channel = (window as unknown as CallWindow).__PC__.createDataChannel(
              'app-call-e2e',
            );
            const timer = setTimeout(() => {
              channel.close();
              resolve(false);
            }, 5000);
            channel.onopen = () => channel.send('PING_P2P_E2E');
            channel.onmessage = ({ data }) => {
              if (data === 'PONG_P2P_E2E') {
                clearTimeout(timer);
                channel.close();
                resolve(true);
              }
            };
          }),
      );
      expect(delivered).toBe(true);
      for (const page of pages)
        await page.evaluate(() => {
          const current = window as unknown as CallWindow;
          current.__e2eTracks = current.__CALL_STORE__.getState().localStream!.getTracks();
        });
      await alice.getByRole('button', { name: 'Leave call', exact: true }).click();
      for (const page of pages) {
        await expect
          .poll(() => callSnapshot(page))
          .toMatchObject({ status: 'idle', connection: 'closed' });
        expect(
          await page.evaluate(() =>
            (window as unknown as CallWindow).__e2eTracks.every(
              (track) => track.readyState === 'ended',
            ),
          ),
        ).toBe(true);
        await expect(
          page.getByRole('button', { name: 'Leave call', exact: true }),
        ).not.toBeVisible();
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
      await relay.close();
    }
  });
}
