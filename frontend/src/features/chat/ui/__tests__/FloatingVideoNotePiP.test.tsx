import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FloatingVideoNotePiP from '../FloatingVideoNotePiP';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

describe('FloatingVideoNotePiP', () => {
  beforeEach(() => {
    useActiveMediaPlaybackStore.getState().stopAll();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('renders nothing when no video note is active or user is in current chat', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/feed']}>
        <FloatingVideoNotePiP />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="floating-video-pip"]')).toBeNull();
  });

  it('renders floating circular PiP widget when video is active and user is on /feed', () => {
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'video-note-1',
      mediaType: 'video',
      url: 'https://example.com/video_note.mp4',
      senderName: 'Ayate',
      conversationId: 'conv-123',
    });

    render(
      <MemoryRouter initialEntries={['/feed']}>
        <FloatingVideoNotePiP />
      </MemoryRouter>,
    );

    const pip = screen.getByTestId('floating-video-pip');
    expect(pip).toBeInTheDocument();
  });

  it('toggles size on double click/tap gesture', () => {
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'video-note-1',
      mediaType: 'video',
      url: 'https://example.com/video_note.mp4',
      senderName: 'Ayate',
      conversationId: 'conv-123',
    });

    render(
      <MemoryRouter initialEntries={['/feed']}>
        <FloatingVideoNotePiP />
      </MemoryRouter>,
    );

    const pip = screen.getByTestId('floating-video-pip');
    expect(pip).toHaveStyle({ width: '128px' });

    // Double tap
    fireEvent.click(pip);
    fireEvent.click(pip);

    expect(pip).toHaveStyle({ width: '192px' });
  });

  it('closes PiP and stops playback when close button is clicked', () => {
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'video-note-1',
      mediaType: 'video',
      url: 'https://example.com/video_note.mp4',
      senderName: 'Ayate',
      conversationId: 'conv-123',
    });

    render(
      <MemoryRouter initialEntries={['/feed']}>
        <FloatingVideoNotePiP />
      </MemoryRouter>,
    );

    const closeBtn = screen.getByTitle('Close PiP');
    fireEvent.click(closeBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBeNull();
  });
});
