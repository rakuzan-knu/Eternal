import { describe, it, expect } from 'vitest';
import { formatSpotifyTrackAddedDate } from '../model/types';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

describe('formatSpotifyTrackAddedDate', () => {
  const makeTrack = (addedAt: string): SpotifyTrack => ({
    id: 'test-1',
    title: 'Test Song',
    artist: 'Test Artist',
    albumArt: '',
    durationMs: 180000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com',
    source: 'soundcloud',
    addedAt,
  });

  it('formats "just now" for tracks added less than 1 minute ago', () => {
    const now = new Date();
    const track = makeTrack(new Date(now.getTime() - 20 * 1000).toISOString());
    expect(formatSpotifyTrackAddedDate(track)).toBe('just now');
  });

  it('formats "1 minute ago" for 1 minute ago', () => {
    const now = new Date();
    const track = makeTrack(new Date(now.getTime() - 65 * 1000).toISOString());
    expect(formatSpotifyTrackAddedDate(track)).toBe('1 minute ago');
  });

  it('formats "N minutes ago" for 2-4 minutes ago', () => {
    const now = new Date();
    const track = makeTrack(new Date(now.getTime() - 3 * 60 * 1000).toISOString());
    expect(formatSpotifyTrackAddedDate(track)).toBe('3 minutes ago');
  });

  it('formats "N minutes ago" for 5-59 minutes ago', () => {
    const now = new Date();
    const track = makeTrack(new Date(now.getTime() - 15 * 60 * 1000).toISOString());
    expect(formatSpotifyTrackAddedDate(track)).toBe('15 minutes ago');
  });

  it('formats "1 hour ago" for 1 hour ago within today', () => {
    const now = new Date();
    // Only test if current hour > 1 to stay within today
    if (now.getHours() >= 2) {
      const track = makeTrack(new Date(now.getTime() - 65 * 60 * 1000).toISOString());
      expect(formatSpotifyTrackAddedDate(track)).toBe('1 hour ago');
    }
  });

  it('formats "Yesterday at HH:MM" for tracks added yesterday', () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 30);
    const track = makeTrack(yesterday.toISOString());
    expect(formatSpotifyTrackAddedDate(track)).toBe('Yesterday at 14:30');
  });

  it('formats "2 days ago" for tracks added 2 days ago', () => {
    const now = new Date();
    const track = makeTrack(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString());
    expect(formatSpotifyTrackAddedDate(track)).toBe('2 days ago');
  });
});
