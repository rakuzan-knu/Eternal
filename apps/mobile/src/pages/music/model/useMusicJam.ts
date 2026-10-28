import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import parser from 'socket.io-msgpack-parser';
import { z } from 'zod';
import { useAuthStore } from '@social-network/shared-stores';
import { messengerOrigin, getMobileApi } from '@/shared/api/client';
import { trackSchema, type Track } from './music';
import { tr } from '@/shared/lib/i18n';

const roomSchema = z.object({
  roomId: z.string(),
  hostUserId: z.string(),
  hostUsername: z.string(),
  queuePolicy: z.enum(['dj_only', 'open_queue']),
  listeners: z.array(z.object({ id: z.string(), username: z.string() })),
  queue: z.array(trackSchema).default([]),
  currentTrack: trackSchema.nullable(),
  positionMs: z.number(),
  isPlaying: z.boolean(),
  updatedAt: z.number(),
});
const syncSchema = z.object({
  currentTrack: trackSchema.nullish(),
  positionMs: z.number(),
  isPlaying: z.boolean(),
  timestamp: z.number(),
});
type Room = z.infer<typeof roomSchema>;
interface Player {
  userId: string;
  enabled: boolean;
  lowPower?: boolean;
  current: Track | null;
  playing: boolean;
  position: number;
  duration: number;
  play: (track: Track, startMs: number, playing: boolean) => void;
  seekTo: (ms: number) => void;
  setPlaying: (value: boolean) => void;
  addToQueue: (track: Track) => void;
}
export function useMusicJam(player: Player) {
  const [room, setRoom] = React.useState<Room | null>(null);
  const connectionEnabled = player.enabled && (!player.lowPower || !!room);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paused, setPaused] = React.useState(false);
  const socket = React.useRef<Socket | null>(null);
  const latest = React.useRef(player);
  latest.current = player;
  const roomRef = React.useRef(room);
  roomRef.current = room;
  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;
  const offset = React.useRef(0);
  const added = React.useRef(0);
  const hostState = React.useRef<z.infer<typeof syncSchema> | null>(null);
  const sync = React.useCallback((state: z.infer<typeof syncSchema>) => {
    hostState.current = state;
    if (
      !roomRef.current ||
      pausedRef.current ||
      roomRef.current.hostUserId === latest.current.userId
    )
      return;
    const track = state.currentTrack || latest.current.current;
    if (!track) return;
    const changed = track.id !== latest.current.current?.id;
    const target = Math.max(
      0,
      state.positionMs +
        (state.isPlaying
          ? Math.min(5000, Math.max(0, Date.now() + offset.current - state.timestamp))
          : 0),
    );
    if (changed) latest.current.play(track, target, state.isPlaying);
    else {
      if (Math.abs(target - latest.current.position) > 1500) latest.current.seekTo(target);
      latest.current.setPlaying(state.isPlaying);
    }
  }, []);
  React.useEffect(() => {
    if (!connectionEnabled) return;
    const connection = io(`${messengerOrigin}/messenger`, {
      parser,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      auth: (callback) => {
        const auth = useAuthStore.getState();
        callback({ token: auth.user?.id === player.userId ? auth.accessToken : undefined });
      },
    });
    socket.current = connection;
    let refreshed = false;
    connection.on('connect', () => {
      setConnected(true);
      setError(null);
      connection.emit('jam:ping', { t0: Date.now() });
      if (roomRef.current) connection.emit('jam:join', { roomId: roomRef.current.roomId });
    });
    connection.on('disconnect', () => setConnected(false));
    connection.on('connect_error', () => {
      setConnected(false);
      if (!refreshed) {
        refreshed = true;
        void getMobileApi()
          .get('/users/me')
          .then(() => {
            if (socket.current === connection) connection.connect();
          })
          .catch(() => setError(tr('Live listening is unavailable. Reconnect and try again.')));
      } else setError(tr('Live listening is unavailable. Reconnect and try again.'));
    });
    connection.on('jam:pong', (data: unknown) => {
      const parsed = z.object({ t0: z.number(), serverTime: z.number() }).safeParse(data);
      if (parsed.success)
        offset.current = parsed.data.serverTime + (Date.now() - parsed.data.t0) / 2 - Date.now();
    });
    const state = (data: unknown) => {
      const parsed = roomSchema.safeParse(data);
      if (!parsed.success) return;
      const value = parsed.data;
      if (roomRef.current?.roomId !== value.roomId) added.current = 0;
      roomRef.current = value;
      setRoom(value);
      setError(null);
      if (value.hostUserId === player.userId) {
        for (const track of value.queue.slice(added.current)) latest.current.addToQueue(track);
        added.current = value.queue.length;
      } else
        sync({
          currentTrack: value.currentTrack,
          positionMs: value.positionMs,
          isPlaying: value.isPlaying,
          timestamp: value.updatedAt,
        });
    };
    connection.on('jam:state_update', state);
    connection.on('jam:listener_joined', (data: unknown) => {
      const parsed = z.object({ room: z.unknown() }).safeParse(data);
      if (parsed.success) state(parsed.data.room);
    });
    connection.on('jam:sync_event', (data: unknown) => {
      const parsed = syncSchema.safeParse(data);
      if (parsed.success) sync(parsed.data);
    });
    connection.on('jam:room_closed', () => {
      roomRef.current = null;
      setRoom(null);
      latest.current.setPlaying(false);
    });
    connection.on('jam:error', (data: unknown) => {
      const parsed = z.object({ message: z.string() }).safeParse(data);
      setError(parsed.success ? parsed.data.message : 'The listening session is unavailable.');
    });
    const timer = setInterval(() => {
      const value = latest.current;
      const currentRoom = roomRef.current;
      if (currentRoom?.hostUserId === value.userId && connection.connected)
        connection.emit('jam:host_sync', {
          roomId: currentRoom.roomId,
          trackId: value.current?.id,
          currentTrack: value.current,
          positionMs: value.position,
          isPlaying: value.playing,
          timestamp: Date.now() + offset.current,
        });
    }, 3000);
    const presence = setInterval(() => {
      const value = latest.current;
      if (connection.connected && value.current)
        connection.emit('user:activity:platform_music', {
          track: value.current,
          isPlaying: value.playing,
          progressMs: value.position,
          durationMs: value.duration,
          jamRoomId: roomRef.current?.roomId,
        });
    }, 15000);
    return () => {
      clearInterval(timer);
      clearInterval(presence);
      connection.emit('user:activity:platform_music', {
        track: null,
        isPlaying: false,
        progressMs: 0,
        durationMs: 0,
      });
      connection.disconnect();
      socket.current = null;
      setConnected(false);
    };
  }, [player.userId, connectionEnabled, sync]);
  React.useEffect(() => {
    const connection = socket.current;
    if (!connection?.connected) return;
    connection.emit('user:activity:platform_music', {
      track: player.current,
      isPlaying: player.playing,
      progressMs: player.position,
      durationMs: player.duration,
      jamRoomId: room?.roomId,
    });
    if (room?.hostUserId === player.userId)
      connection.emit('jam:host_sync', {
        roomId: room.roomId,
        currentTrack: player.current,
        trackId: player.current?.id,
        positionMs: player.position,
        isPlaying: player.playing,
        timestamp: Date.now() + offset.current,
      });
  }, [player.current?.id, player.playing, room?.roomId, connected]);
  function emit(event: string, payload: unknown) {
    if (!socket.current?.connected) {
      setError(tr('Connect to live listening before continuing.'));
      return;
    }
    setError(null);
    socket.current.emit(event, payload);
  }
  return {
    room,
    connected,
    error,
    paused,
    isHost: room?.hostUserId === player.userId,
    create: () => emit('jam:create', { initialTrack: player.current, queuePolicy: 'dj_only' }),
    join: (input: string) => {
      const id = input.match(/[?&]jam=([^&]+)/)?.[1] || input.trim();
      if (!/^jam_[a-zA-Z0-9_-]{1,64}$/.test(id)) {
        setError(tr('Enter a valid Jam room code or invitation link.'));
        return;
      }
      setPaused(false);
      pausedRef.current = false;
      emit('jam:join', { roomId: id });
    },
    leave: () => {
      if (room) emit('jam:leave', { roomId: room.roomId });
      setRoom(null);
      roomRef.current = null;
      setPaused(false);
      added.current = 0;
    },
    policy: (queuePolicy: 'dj_only' | 'open_queue') => {
      if (room) emit('jam:update_policy', { roomId: room.roomId, queuePolicy });
    },
    add: (track: Track) => {
      if (room) emit('jam:queue_add', { roomId: room.roomId, track });
    },
    togglePause: () => {
      const next = !paused;
      pausedRef.current = next;
      setPaused(next);
      if (next) player.setPlaying(false);
      else if (hostState.current) sync(hostState.current);
    },
  };
}
