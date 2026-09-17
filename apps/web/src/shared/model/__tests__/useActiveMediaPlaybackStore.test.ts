import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveMediaPlaybackStore, ActiveMediaInfo } from '../useActiveMediaPlaybackStore';

describe('useActiveMediaPlaybackStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useActiveMediaPlaybackStore.getState().stopAll();
  });

  const sampleMedia1: ActiveMediaInfo = {
    id: 'm1',
    mediaType: 'voice',
    url: 'https://voice1.mp3',
    senderName: 'Alice',
    conversationId: 'c1',
    duration: 30,
  };

  const sampleMedia2: ActiveMediaInfo = {
    id: 'm2',
    mediaType: 'video',
    url: 'https://video2.mp4',
    senderName: 'Bob',
    conversationId: 'c1',
    duration: 45,
  };

  it('sets active media and updates state', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);

    const state = useActiveMediaPlaybackStore.getState();
    expect(state.activeMediaId).toBe('m1');
    expect(state.mediaType).toBe('voice');
    expect(state.url).toBe('https://voice1.mp3');
    expect(state.senderName).toBe('Alice');
    expect(state.isPlaying).toBe(true);
    expect(state.playlist).toHaveLength(1);
    expect(state.currentIndex).toBe(0);
  });

  it('handles setActiveMediaId', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('m1');

    store.setActiveMediaId('custom-id');
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('custom-id');

    store.setActiveMediaId(null);
    const state = useActiveMediaPlaybackStore.getState();
    expect(state.activeMediaId).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it('handles playlist navigation: playNext and playPrev with boundary conditions', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);
    store.setPlaylist([sampleMedia1, sampleMedia2], 'c1');

    expect(useActiveMediaPlaybackStore.getState().currentIndex).toBe(0);

    // playPrev when currentIndex is 0 seeks to 0 and returns false
    const prevAtStart = useActiveMediaPlaybackStore.getState().playPrev();
    expect(prevAtStart).toBe(false);
    expect(useActiveMediaPlaybackStore.getState().currentTime).toBe(0);

    // playNext
    const hasNext = useActiveMediaPlaybackStore.getState().playNext();
    expect(hasNext).toBe(true);
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('m2');
    expect(useActiveMediaPlaybackStore.getState().nextIndicator).toBe('Next: Bob');

    // advance timers for nextIndicator timeout
    vi.advanceTimersByTime(1300);
    expect(useActiveMediaPlaybackStore.getState().nextIndicator).toBeNull();

    // playNext when at end of playlist returns false
    const hasNextAtEnd = useActiveMediaPlaybackStore.getState().playNext();
    expect(hasNextAtEnd).toBe(false);

    // playPrev from end
    const hasPrev = useActiveMediaPlaybackStore.getState().playPrev();
    expect(hasPrev).toBe(true);
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('m1');
  });

  it('handles volume, mute, playbackRate, and seeking', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);

    store.setIsLoading(true);
    expect(useActiveMediaPlaybackStore.getState().isLoading).toBe(true);

    store.setDuration(100);
    expect(useActiveMediaPlaybackStore.getState().duration).toBe(100);

    store.setVolume(0.8);
    expect(useActiveMediaPlaybackStore.getState().volume).toBe(0.8);
    expect(useActiveMediaPlaybackStore.getState().isMuted).toBe(false);

    store.setVolume(0);
    expect(useActiveMediaPlaybackStore.getState().isMuted).toBe(true);

    store.toggleMute();
    expect(useActiveMediaPlaybackStore.getState().isMuted).toBe(false);

    store.setPlaybackRate(1.5);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(1.5);

    store.setIsPlaying(true);
    expect(useActiveMediaPlaybackStore.getState().isPlaying).toBe(true);
    store.togglePlay();
    expect(useActiveMediaPlaybackStore.getState().isPlaying).toBe(false);

    store.seek(15);
    expect(useActiveMediaPlaybackStore.getState().currentTime).toBe(15);

    store.seekRelative(5);
    expect(useActiveMediaPlaybackStore.getState().currentTime).toBe(20);
  });

  it('handles PiP and stopping all playback', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);
    store.setPiPVisible(true);
    store.setCurrentViewingChatId('c2');

    expect(useActiveMediaPlaybackStore.getState().isPiPVisible).toBe(true);
    expect(useActiveMediaPlaybackStore.getState().currentViewingChatId).toBe('c2');

    store.stopAll();
    const finalState = useActiveMediaPlaybackStore.getState();
    expect(finalState.activeMediaId).toBeNull();
    expect(finalState.isPlaying).toBe(false);
    expect(finalState.playlist).toHaveLength(0);
  });

  it('ignores setPlaylist when incoming conversationId does not match active playback conversation', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia({ ...sampleMedia1, conversationId: 'conv-active' });
    expect(useActiveMediaPlaybackStore.getState().conversationId).toBe('conv-active');

    // Attempt to set playlist for another conversation
    store.setPlaylist([sampleMedia2], 'conv-different');
    expect(useActiveMediaPlaybackStore.getState().playlist[0].id).toBe('m1');

    // Setting without conversationId or matching works
    store.setPlaylist([sampleMedia2], undefined);
    expect(useActiveMediaPlaybackStore.getState().playlist[0].id).toBe('m2');
  });

  it('handles seek and seekRelative when duration is 0 or uninitialized', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setDuration(0);
    store.setCurrentTime(0);

    store.seek(25);
    expect(useActiveMediaPlaybackStore.getState().currentTime).toBe(25);

    store.seekRelative(10);
    expect(useActiveMediaPlaybackStore.getState().currentTime).toBe(35);
  });
});
