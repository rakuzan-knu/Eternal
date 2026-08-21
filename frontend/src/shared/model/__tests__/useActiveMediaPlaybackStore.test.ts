import { describe, it, expect, beforeEach } from 'vitest';
import { useActiveMediaPlaybackStore, ActiveMediaInfo } from '../useActiveMediaPlaybackStore';

describe('useActiveMediaPlaybackStore', () => {
  beforeEach(() => {
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

  it('handles playlist navigation: playNext and playPrev', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);
    store.setPlaylist([sampleMedia1, sampleMedia2], 'c1');

    expect(useActiveMediaPlaybackStore.getState().currentIndex).toBe(0);

    const hasNext = useActiveMediaPlaybackStore.getState().playNext();
    expect(hasNext).toBe(true);
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('m2');

    const hasPrev = useActiveMediaPlaybackStore.getState().playPrev();
    expect(hasPrev).toBe(true);
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('m1');
  });

  it('handles volume, mute, playbackRate, and seeking', () => {
    const store = useActiveMediaPlaybackStore.getState();
    store.setActiveMedia(sampleMedia1);

    store.setVolume(0.8);
    expect(useActiveMediaPlaybackStore.getState().volume).toBe(0.8);
    expect(useActiveMediaPlaybackStore.getState().isMuted).toBe(false);

    store.setVolume(0);
    expect(useActiveMediaPlaybackStore.getState().isMuted).toBe(true);

    store.toggleMute();
    expect(useActiveMediaPlaybackStore.getState().isMuted).toBe(false);

    store.setPlaybackRate(1.5);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(1.5);

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
});
