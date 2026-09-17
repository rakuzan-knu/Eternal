import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSpotifyPlayerStore, SpotifyTrack } from '../useSpotifyPlayerStore';

vi.mock('@/shared/api/integrationsApi', () => ({
  integrationsApi: {
    likeSpotifyTrack: vi.fn().mockResolvedValue({ success: true, isLiked: true }),
    checkSpotifyTrackLiked: vi.fn().mockResolvedValue({ isLiked: false }),
    setSpotifyRepeatMode: vi.fn().mockResolvedValue({ success: true }),
    setSpotifyShuffle: vi.fn().mockResolvedValue({ success: true }),
    getSpotifyLyrics: vi.fn().mockResolvedValue({ synced: true, lines: [] }),
    getSpotifyQueue: vi.fn().mockResolvedValue({
      source: 'infinite-audio',
      tracks: [
        {
          id: 'track-2',
          title: 'Syndrom',
          artist: 'Viktor Sheen',
          albumArt: 'https://example.com/art2.jpg',
          durationMs: 152000,
          previewUrl: 'https://example.com/preview2.mp3',
          spotifyUrl: 'https://open.spotify.com/track/track-2',
        },
      ],
    }),
  },
}));

vi.mock('@/shared/lib/audioCoordinator', () => ({
  audioCoordinator: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

describe('useSpotifyPlayerStore', () => {
  const sampleTrack1: SpotifyTrack = {
    id: 'track-1',
    title: 'VYZEE',
    artist: 'SOPHIE',
    albumArt: 'https://example.com/art1.jpg',
    durationMs: 200000,
    previewUrl: 'https://example.com/preview1.mp3',
    spotifyUrl: 'https://open.spotify.com/track/track-1',
  };

  const sampleTrack2: SpotifyTrack = {
    id: 'track-2',
    title: 'Syndrom',
    artist: 'Viktor Sheen',
    albumArt: 'https://example.com/art2.jpg',
    durationMs: 152000,
    previewUrl: 'https://example.com/preview2.mp3',
    spotifyUrl: 'https://open.spotify.com/track/track-2',
  };

  beforeEach(() => {
    useSpotifyPlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      progressMs: 0,
      durationMs: 180000,
      volume: 0.8,
      isMuted: false,
      repeatMode: 0,
      isShuffled: false,
      queue: [],
      unshuffledQueue: [],
      history: [],
      isLiked: false,
      isDockVisible: false,
      isLyricsOpen: false,
      isQueueOpen: false,
    });
  });

  it('should play a track and make the dock visible', () => {
    const { playTrack } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1);

    const state = useSpotifyPlayerStore.getState();
    expect(state.currentTrack?.id).toBe('track-1');
    expect(state.isPlaying).toBe(true);
    expect(state.isDockVisible).toBe(true);
    expect(state.durationMs).toBe(200000);
    expect(state.progressMs).toBe(0);
  });

  it('should toggle play and pause correctly', () => {
    const { playTrack, togglePlay } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1);

    togglePlay();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);

    togglePlay();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);
  });

  it('should preserve progressMs when paused and not reset to 0:00', () => {
    const { playTrack, seek, pause, resume } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1);
    seek(57000); // 57 seconds in

    expect(useSpotifyPlayerStore.getState().progressMs).toBe(57000);
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);

    pause();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);
    expect(useSpotifyPlayerStore.getState().progressMs).toBe(57000);

    resume();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);
    expect(useSpotifyPlayerStore.getState().progressMs).toBe(57000);
  });

  it('prevTrack: should seek to 0:00 if progress > 3000ms', () => {
    const { playTrack, seek, prevTrack } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1);
    seek(15000); // 15 seconds into the track

    prevTrack();
    expect(useSpotifyPlayerStore.getState().progressMs).toBe(0);
    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('track-1');
  });

  it('prevTrack: should switch to previous track in history if progress <= 3000ms', () => {
    const { playTrack, prevTrack } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1);
    playTrack(sampleTrack2);

    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('track-2');
    expect(useSpotifyPlayerStore.getState().history.length).toBe(1);

    // Progress is 0 <= 3000ms, should go back to track-1
    prevTrack();
    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('track-1');
  });

  it('nextTrack: should advance to next track in queue', () => {
    const { playTrack, nextTrack } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1, [sampleTrack2]);

    expect(useSpotifyPlayerStore.getState().queue.length).toBe(1);

    nextTrack();
    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('track-2');
    expect(useSpotifyPlayerStore.getState().history.length).toBe(1);
    expect(useSpotifyPlayerStore.getState().history[0].id).toBe('track-1');
  });

  it('toggleRepeat: should cycle correctly 0 -> 1 -> 2 -> 0', () => {
    const { toggleRepeat } = useSpotifyPlayerStore.getState();

    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(0);
    toggleRepeat();
    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(1);
    toggleRepeat();
    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(2);
    toggleRepeat();
    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(0);
  });

  it('toggleShuffle: should shuffle and restore original queue', () => {
    const tracks = [sampleTrack1, sampleTrack2];
    useSpotifyPlayerStore.setState({ queue: tracks, unshuffledQueue: tracks });

    const { toggleShuffle } = useSpotifyPlayerStore.getState();
    toggleShuffle();
    expect(useSpotifyPlayerStore.getState().isShuffled).toBe(true);

    toggleShuffle();
    expect(useSpotifyPlayerStore.getState().isShuffled).toBe(false);
    expect(useSpotifyPlayerStore.getState().queue).toEqual(tracks);
  });

  it('volume and mute toggles', () => {
    const { setVolume, toggleMute } = useSpotifyPlayerStore.getState();

    setVolume(0.5);
    expect(useSpotifyPlayerStore.getState().volume).toBe(0.5);
    expect(useSpotifyPlayerStore.getState().isMuted).toBe(false);

    toggleMute();
    expect(useSpotifyPlayerStore.getState().isMuted).toBe(true);

    toggleMute();
    expect(useSpotifyPlayerStore.getState().isMuted).toBe(false);
  });

  it('closeDock: should pause and hide dock and popovers', () => {
    const { playTrack, closeDock } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1);
    useSpotifyPlayerStore.setState({ isLyricsOpen: true, isQueueOpen: true });

    closeDock();
    const state = useSpotifyPlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.isDockVisible).toBe(false);
    expect(state.isDockMinimized).toBe(false);
    expect(state.isLyricsOpen).toBe(false);
    expect(state.isQueueOpen).toBe(false);
  });

  it('dock minimization: should toggle and close popovers when minimized', () => {
    const { toggleDockMinimized, setDockMinimized } = useSpotifyPlayerStore.getState();
    useSpotifyPlayerStore.setState({
      isDockVisible: true,
      isDockMinimized: false,
      isLyricsOpen: true,
      isQueueOpen: true,
      isVolumeOpen: true,
    });

    toggleDockMinimized();
    let state = useSpotifyPlayerStore.getState();
    expect(state.isDockMinimized).toBe(true);
    expect(state.isLyricsOpen).toBe(false);
    expect(state.isQueueOpen).toBe(false);
    expect(state.isVolumeOpen).toBe(false);

    setDockMinimized(false);
    state = useSpotifyPlayerStore.getState();
    expect(state.isDockMinimized).toBe(false);
  });

  it('game mode: should toggle and set game mode open state', () => {
    const { toggleGameMode, setGameModeOpen } = useSpotifyPlayerStore.getState();
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);

    toggleGameMode();
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(true);

    toggleGameMode();
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);

    setGameModeOpen(true);
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(true);

    setGameModeOpen(false);
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);
  });

  it('nextTrack: should dynamically load Infinite Audio queue and advance when queue is empty (without opening queue popover)', async () => {
    const { playTrack, nextTrack } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1, []); // queue is intentionally empty

    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('track-1');
    expect(useSpotifyPlayerStore.getState().queue.length).toBe(0);

    // Call nextTrack when queue is empty
    await nextTrack();

    const state = useSpotifyPlayerStore.getState();
    // It should have fetched Infinite Audio in the background and played track-2
    expect(state.currentTrack?.id).toBe('track-2');
    expect(state.isPlaying).toBe(true);
    expect(state.history.some((h) => h.id === 'track-1')).toBe(true);
  });

  it('loadInfiniteAudioQueue: should append tracks without duplicates when append=true', async () => {
    const { playTrack, loadInfiniteAudioQueue } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1, [sampleTrack1]);

    useSpotifyPlayerStore.setState({ queue: [{ ...sampleTrack1, id: 'track-existing' }] });

    await loadInfiniteAudioQueue(true, true);

    const queue = useSpotifyPlayerStore.getState().queue;
    expect(queue.length).toBe(2);
    expect(queue[0].id).toBe('track-existing');
    expect(queue[1].id).toBe('track-2');
  });

  it('seek: seeking within 1500ms of end should advance to the next track automatically', () => {
    const { playTrack, seek } = useSpotifyPlayerStore.getState();
    playTrack(sampleTrack1, [sampleTrack2]);

    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('track-1');
    expect(useSpotifyPlayerStore.getState().durationMs).toBe(200000);

    // Seek to 199500 (within 1500ms of 200000)
    seek(199500);

    const state = useSpotifyPlayerStore.getState();
    expect(state.currentTrack?.id).toBe('track-2');
    expect(state.isPlaying).toBe(true);
  });
});
