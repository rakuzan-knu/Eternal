// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMusicJam } from './useMusicJam';
import { trackSchema } from './music';

const socket = vi.hoisted(() => ({
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: true,
  on: vi.fn(),
}));
const connectSocket = vi.hoisted(() => vi.fn());
vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => {
    connectSocket(...args);
    return socket;
  },
}));
vi.mock('socket.io-msgpack-parser', () => ({ default: {} }));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => ({ user: { id: 'listener' }, accessToken: 'test-token' }) },
}));
vi.mock('@/shared/api/client', () => ({
  apiOrigin: 'https://core.example',
  messengerOrigin: 'https://messenger.example',
  getMobileApi: () => ({ get: vi.fn() }),
}));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const handlers = new Map<string, (data: unknown) => void>();
const current = trackSchema.parse({
  id: 'sc-short',
  title: 'Short song',
  artist: 'Artist',
  durationMs: 20_000,
});
const other = trackSchema.parse({
  id: 'sc-long',
  title: 'Long song',
  artist: 'Artist',
  durationMs: 120_000,
});
let jam: ReturnType<typeof useMusicJam> | undefined;
let dispose: (() => Promise<void>) | undefined;
const player = {
  userId: 'listener',
  enabled: true,
  lowPower: false,
  current,
  playing: false,
  position: 0,
  duration: 20_000,
  play: vi.fn(),
  seekTo: vi.fn(),
  setPlaying: vi.fn(),
  addToQueue: vi.fn(),
};
function Probe() {
  jam = useMusicJam(player);
  return null;
}
function session() {
  if (!jam) throw new Error('No session');
  return jam;
}
function room(hostUserId = 'host') {
  return {
    roomId: 'jam_host',
    hostUserId,
    hostUsername: 'Host',
    queuePolicy: 'open_queue',
    listeners: [{ id: 'listener', username: 'Listener' }],
    queue: [],
    currentTrack: other,
    positionMs: 50_000,
    isPlaying: false,
    updatedAt: Date.now(),
  };
}
beforeEach(() => {
  player.lowPower = false;
  handlers.clear();
  socket.on.mockImplementation((event: string, handler: (data: unknown) => void) => {
    handlers.set(event, handler);
    return socket;
  });
});
afterEach(async () => {
  await dispose?.();
  dispose = undefined;
  jam = undefined;
  vi.clearAllMocks();
});
async function mount() {
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(<Probe />));
  dispose = async () => {
    await act(async () => root.unmount());
  };
  return async () => {
    await act(async () => root.render(<Probe />));
  };
}
it('connects Jam to messenger while the API origin remains core', async () => {
  await mount();
  expect(connectSocket).toHaveBeenCalledWith(
    'https://messenger.example/messenger',
    expect.anything(),
  );
});
it('starts a different host track at its own position without clamping against the old duration', async () => {
  await mount();
  await act(async () => handlers.get('jam:state_update')?.(room()));
  expect(player.play).toHaveBeenCalledWith(other, 50_000, false);
  expect(player.seekTo).not.toHaveBeenCalled();
});
it('rejects invalid room codes and accepts a web invitation link', async () => {
  await mount();
  await act(async () => session().join('invalid'));
  expect(session().error).toContain('valid Jam');
  expect(socket.emit).not.toHaveBeenCalledWith('jam:join', expect.anything());
  await act(async () => session().join('https://eternal.example/music?jam=jam_host'));
  expect(socket.emit).toHaveBeenCalledWith('jam:join', { roomId: 'jam_host' });
});
it('does not resume playback from late synchronization after leaving a room', async () => {
  await mount();
  await act(async () => handlers.get('jam:state_update')?.(room()));
  await act(async () => session().leave());
  player.play.mockClear();
  player.setPlaying.mockClear();
  await act(async () =>
    handlers.get('jam:sync_event')?.({
      currentTrack: other,
      positionMs: 50_000,
      isPlaying: true,
      timestamp: Date.now(),
    }),
  );
  expect(player.play).not.toHaveBeenCalled();
  expect(player.setPlaying).not.toHaveBeenCalled();
});
it('appends repeated tracks only once for each server queue entry', async () => {
  await mount();
  const value = { ...room('listener'), queue: [other, other] };
  await act(async () => handlers.get('jam:state_update')?.(value));
  await act(async () => handlers.get('jam:state_update')?.(value));
  expect(player.addToQueue).toHaveBeenCalledTimes(2);
});

it('disconnects idle presence in Game Mode and restores it on exit', async () => {
  const render = await mount();
  player.lowPower = true;
  await render();
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
  socket.on.mockClear();
  player.lowPower = false;
  await render();
  expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
});
it('keeps an active Jam connected while Game Mode is running', async () => {
  const render = await mount();
  await act(async () => handlers.get('jam:state_update')?.(room()));
  player.lowPower = true;
  await render();
  expect(socket.disconnect).not.toHaveBeenCalled();
  expect(session().room?.roomId).toBe('jam_host');
});
