import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StoryMusicCustomizerModal } from '../StoryMusicCustomizerModal';
import { StoryMusicStickerView } from '../StoryMusicStickerView';
import type { AudioOverlay } from '../../model/types';
import type { StoryMusicTrack } from '../StoryMusicSearchModal';

// Mock Audio
const mockAudioPlay = vi.fn().mockResolvedValue(undefined);
const mockAudioPause = vi.fn();
const mockAudioLoad = vi.fn();

class MockAudio {
  src = '';
  volume = 1;
  currentTime = 0;
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

describe('StoryMusicCustomizerModal', () => {
  const mockTrack: StoryMusicTrack = {
    id: 'sc-999',
    title: 'Neon Drift',
    artist: 'Synthwave Boy',
    albumArt: 'https://example.com/art.png',
    durationMs: 180000,
    streamUrl: 'https://cdn.example.com/neon-drift.mp3',
    audioUrl: 'https://cdn.example.com/neon-drift.mp3',
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 4 style buttons and controls when open', () => {
    render(
      <StoryMusicCustomizerModal
        isOpen={true}
        track={mockTrack}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.getByText('Cancel')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
    expect(screen.getByTitle('Audio Only')).toBeDefined();
    expect(screen.getByTitle('Large Cover')).toBeDefined();
    expect(screen.getByTitle('Cover Card')).toBeDefined();
    expect(screen.getByTitle('Vinyl Record')).toBeDefined();
    expect(screen.getByText('NEW')).toBeDefined();
  });

  it('switches styles and cycles color when color wheel is clicked', () => {
    render(
      <StoryMusicCustomizerModal
        isOpen={true}
        track={mockTrack}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    // Switch to Vinyl
    const vinylBtn = screen.getByTitle('Vinyl Record');
    fireEvent.click(vinylBtn);

    // Switch to Cover
    const coverBtn = screen.getByTitle('Large Cover');
    fireEvent.click(coverBtn);

    // Color wheel button should be present for cover
    const colorBtn = screen.getByTitle('Change color');
    expect(colorBtn).toBeDefined();
    fireEvent.click(colorBtn);
  });

  it('opens duration picker and allows selecting 20s clip duration', () => {
    render(
      <StoryMusicCustomizerModal
        isOpen={true}
        track={mockTrack}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    // Click duration button (initial is 15)
    const durationBtn = screen.getByTitle('Clip duration (sec)');
    expect(durationBtn.textContent).toBe('15');
    fireEvent.click(durationBtn);

    // Select 20s
    const sec20Btn = screen.getByText('20s');
    fireEvent.click(sec20Btn);

    expect(durationBtn.textContent).toBe('20');
  });

  it('calls onConfirm with complete configuration on "Done" click', () => {
    render(
      <StoryMusicCustomizerModal
        isOpen={true}
        track={mockTrack}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    // Select vinyl mode
    const vinylBtn = screen.getByTitle('Vinyl Record');
    fireEvent.click(vinylBtn);

    // Click Done
    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Neon Drift',
        artist: 'Synthwave Boy',
        musicStyle: 'vinyl',
        clipDurationSeconds: 15,
        streamUrl: 'https://cdn.example.com/neon-drift.mp3',
      }),
    );
  });

  it('stops event propagation so clicks on color wheel, buttons, or scrubber do not trigger parent handlers', () => {
    const parentClickMock = vi.fn();

    render(
      <div onClick={parentClickMock}>
        <StoryMusicCustomizerModal
          isOpen={true}
          track={mockTrack}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      </div>,
    );

    // Click color wheel
    const colorBtn = screen.getByTitle('Change color');
    fireEvent.click(colorBtn);
    expect(parentClickMock).not.toHaveBeenCalled();

    // Click mode buttons
    const vinylBtn = screen.getByTitle('Vinyl Record');
    fireEvent.click(vinylBtn);
    expect(parentClickMock).not.toHaveBeenCalled();

    // Click duration button
    const durationBtn = screen.getByTitle('Clip duration (sec)');
    fireEvent.click(durationBtn);
    expect(parentClickMock).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('waveform selection box uses purple gradients and does not contain yellow/amber classes', () => {
    const { container } = render(
      <StoryMusicCustomizerModal
        isOpen={true}
        track={mockTrack}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    const htmlContent = container.innerHTML;
    // Should contain purple gradients
    expect(htmlContent).toContain('from-purple-600 via-fuchsia-500 to-indigo-600');
    // Should NOT contain amber-400 or yellow classes
    expect(htmlContent).not.toContain('from-amber-400');
    expect(htmlContent).not.toContain('amber');
  });
});

describe('StoryMusicStickerView', () => {
  const baseOverlay: AudioOverlay = {
    id: 'ov-1',
    type: 'audio',
    title: 'Cyberpunk Song',
    artist: 'Future Band',
    albumArt: 'https://example.com/cover.jpg',
    xPercent: 50,
    yPercent: 50,
  };

  it('renders nothing in viewer when style is "none"', () => {
    const { container } = render(
      <StoryMusicStickerView overlay={{ ...baseOverlay, musicStyle: 'none' }} isEditor={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders minimal tag in editor when style is "none"', () => {
    render(
      <StoryMusicStickerView overlay={{ ...baseOverlay, musicStyle: 'none' }} isEditor={true} />,
    );
    expect(screen.getByText('Audio only')).toBeDefined();
  });

  it('renders card with album art, title, and artist', () => {
    render(
      <StoryMusicStickerView
        overlay={{ ...baseOverlay, musicStyle: 'card', stickerColor: '#FFFFFF' }}
        isEditor={false}
      />,
    );
    expect(screen.getByText('Cyberpunk Song')).toBeDefined();
    expect(screen.getByText('Future Band')).toBeDefined();
  });

  it('renders cover with title in custom text color', () => {
    render(
      <StoryMusicStickerView
        overlay={{ ...baseOverlay, musicStyle: 'cover', stickerColor: '#EC4899' }}
        isEditor={false}
      />,
    );
    const title = screen.getByText('Cyberpunk Song');
    expect(title).toBeDefined();
    expect(title.style.color).toBe('rgb(236, 72, 153)');
  });

  it('renders vinyl with rotating disc and spindle', () => {
    const { container } = render(
      <StoryMusicStickerView overlay={{ ...baseOverlay, musicStyle: 'vinyl' }} isEditor={false} />,
    );
    expect(screen.getByText('Cyberpunk Song')).toBeDefined();
    expect(container.querySelector('.rounded-full')).toBeDefined();
  });
});
