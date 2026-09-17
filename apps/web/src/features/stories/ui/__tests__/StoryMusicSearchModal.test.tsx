import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StoryMusicSearchModal } from '../StoryMusicSearchModal';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';

// Mock integrationsApi
vi.mock('@/entities/showcase/api/integrationsApi', () => ({
  integrationsApi: {
    searchSoundCloudCatalog: vi.fn(),
    getSoundCloudStream: vi.fn(),
  },
}));

// Mock Audio
const mockAudioPlay = vi.fn().mockResolvedValue(undefined);
const mockAudioPause = vi.fn();
const mockAudioLoad = vi.fn();

class MockAudio {
  src = '';
  volume = 1;
  preload = '';
  onended: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  play = mockAudioPlay;
  pause = mockAudioPause;
  load = mockAudioLoad;
  canPlayType = vi.fn().mockReturnValue('');
  removeAttribute = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

(global as any).Audio = MockAudio;

describe('StoryMusicSearchModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(integrationsApi.searchSoundCloudCatalog).mockResolvedValue([
      {
        id: 'sc-12345',
        rawId: '12345',
        title: 'Cyberpunk Phonk',
        artist: 'Ghost Beats',
        albumArt: 'https://example.com/art.jpg',
        durationMs: 120000,
        streamUrl: '/api/integrations/soundcloud/stream/12345',
      },
    ]);

    vi.mocked(integrationsApi.getSoundCloudStream).mockResolvedValue({
      streamUrl: 'https://cdn.soundcloud.com/direct-stream.mp3',
      isHls: false,
      mimeType: 'audio/mpeg',
    });
  });

  it('renders modal with search bar and genre pills when isOpen is true', async () => {
    render(
      <StoryMusicSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTrack={mockOnSelectTrack}
      />,
    );

    expect(screen.getByText('Music for Story')).toBeDefined();
    expect(screen.getByPlaceholderText('Search music on SoundCloud...')).toBeDefined();
    expect(screen.getByText('For You')).toBeDefined();
    expect(screen.getByText('Phonk')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Phonk')).toBeDefined();
    });
  });

  it('plays preview track on clicking album art or card and resolves direct stream URL', async () => {
    render(
      <StoryMusicSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTrack={mockOnSelectTrack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Phonk')).toBeDefined();
    });

    const trackCard = screen.getByText('Cyberpunk Phonk');
    fireEvent.click(trackCard);

    await waitFor(() => {
      // Stream URL should have been fetched with clean rawId '12345'
      expect(integrationsApi.getSoundCloudStream).toHaveBeenCalledWith('12345');
      expect(mockAudioPlay).toHaveBeenCalled();
      expect(screen.getByText(/Playing/)).toBeDefined();
    });
  });

  it('pauses preview if playing track is clicked again', async () => {
    render(
      <StoryMusicSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTrack={mockOnSelectTrack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Phonk')).toBeDefined();
    });

    const trackCard = screen.getByText('Cyberpunk Phonk');
    fireEvent.click(trackCard);

    await waitFor(() => {
      expect(screen.getByText(/Playing/)).toBeDefined();
    });

    // Click again to pause/stop
    fireEvent.click(trackCard);
    expect(mockAudioPause).toHaveBeenCalled();
  });

  it('opens customizer and calls onSelectTrack on "Done"', async () => {
    render(
      <StoryMusicSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTrack={mockOnSelectTrack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Phonk')).toBeDefined();
    });

    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);

    // Customizer opens with "Done" button
    await waitFor(() => {
      expect(screen.getByText('Done')).toBeDefined();
    });

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    await waitFor(() => {
      expect(mockOnSelectTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sc-12345',
          title: 'Cyberpunk Phonk',
          audioUrl: 'https://cdn.soundcloud.com/direct-stream.mp3',
        }),
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
