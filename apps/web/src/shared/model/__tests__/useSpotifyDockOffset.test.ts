import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpotifyDockOffset } from '../useSpotifyDockOffset';
import { useSpotifyPlayerStore } from '../useSpotifyPlayerStore';

describe('useSpotifyDockOffset', () => {
  beforeEach(() => {
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: null,
        isDockVisible: false,
        isDockMinimized: false,
        isGameModeOpen: false,
      });
    });
    // Set default desktop window width
    window.innerWidth = 1024;
  });

  afterEach(() => {
    window.innerWidth = 1024;
  });

  it('returns zero offset and default padding when dock is closed', () => {
    const { result } = renderHook(() => useSpotifyDockOffset(8));

    expect(result.current.isDockActive).toBe(false);
    expect(result.current.isDockMinimized).toBe(false);
    expect(result.current.dockOffset).toBe(0);
    expect(result.current.composerPaddingBottom).toBe(8);
  });

  it('returns zero offset when dock is visible but no track is loaded', () => {
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: null,
        isDockVisible: true,
      });
    });

    const { result } = renderHook(() => useSpotifyDockOffset(8));
    expect(result.current.isDockActive).toBe(false);
    expect(result.current.dockOffset).toBe(0);
    expect(result.current.composerPaddingBottom).toBe(8);
  });

  it('returns full dock offset (100px) on desktop when full dock is open', () => {
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: {
          id: 'test-track',
          title: 'Sunny Afternoon',
          artist: 'JNK',
          albumArt: '',
          durationMs: 200000,
          previewUrl: null,
          spotifyUrl: '',
        },
        isDockVisible: true,
        isDockMinimized: false,
        isGameModeOpen: false,
      });
    });

    const { result } = renderHook(() => useSpotifyDockOffset(8));
    expect(result.current.isDockActive).toBe(true);
    expect(result.current.isDockMinimized).toBe(false);
    expect(result.current.dockOffset).toBe(100);
    expect(result.current.composerPaddingBottom).toBe(108);
  });

  it('returns minimized dock offset (42px) on desktop when dock is minimized', () => {
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: {
          id: 'test-track',
          title: 'Sunny Afternoon',
          artist: 'JNK',
          albumArt: '',
          durationMs: 200000,
          previewUrl: null,
          spotifyUrl: '',
        },
        isDockVisible: true,
        isDockMinimized: true,
        isGameModeOpen: false,
      });
    });

    const { result } = renderHook(() => useSpotifyDockOffset(8));
    expect(result.current.isDockActive).toBe(true);
    expect(result.current.isDockMinimized).toBe(true);
    expect(result.current.dockOffset).toBe(42);
    expect(result.current.composerPaddingBottom).toBe(50);
  });

  it('adapts to mobile window width (<640px)', () => {
    window.innerWidth = 400;

    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: {
          id: 'test-track',
          title: 'Sunny Afternoon',
          artist: 'JNK',
          albumArt: '',
          durationMs: 200000,
          previewUrl: null,
          spotifyUrl: '',
        },
        isDockVisible: true,
        isDockMinimized: false,
      });
    });

    const { result } = renderHook(() => useSpotifyDockOffset(8));
    expect(result.current.dockOffset).toBe(84);
    expect(result.current.composerPaddingBottom).toBe(92);
  });

  it('returns 0 offset when GameMode is open', () => {
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: {
          id: 'test-track',
          title: 'Sunny Afternoon',
          artist: 'JNK',
          albumArt: '',
          durationMs: 200000,
          previewUrl: null,
          spotifyUrl: '',
        },
        isDockVisible: true,
        isGameModeOpen: true,
      });
    });

    const { result } = renderHook(() => useSpotifyDockOffset(8));
    expect(result.current.isDockActive).toBe(false);
    expect(result.current.dockOffset).toBe(0);
    expect(result.current.composerPaddingBottom).toBe(8);
  });
});
