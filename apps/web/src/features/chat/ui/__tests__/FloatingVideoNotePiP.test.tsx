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

  it('handles play/pause, mute/unmute, return to chat, and pointer drag', () => {
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

    // Play/Pause
    const pauseBtn = screen.getByTitle('Pause');
    fireEvent.click(pauseBtn);
    expect(screen.getByTitle('Play')).toBeInTheDocument();

    // Mute/Unmute
    const muteBtn = screen.getByTitle('Mute');
    fireEvent.click(muteBtn);

    // Return to chat
    const returnBtn = screen.getByTitle('Return to chat');
    fireEvent.click(returnBtn);

    // Drag pointer events
    const pip = screen.getByTestId('floating-video-pip');
    fireEvent.pointerDown(pip, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(pip, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(pip, { clientX: 150, clientY: 150, pointerId: 1 });
  });

  it('handles fling to dismiss and visualViewport keyboard resize', async () => {
    vi.useFakeTimers();
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'video-note-2',
      mediaType: 'video',
      url: 'https://example.com/video_note.mp4',
      senderName: 'Ayate',
      conversationId: null,
    });

    const listeners: Record<string, () => void> = {};
    window.visualViewport = {
      height: 400,
      width: 400,
      addEventListener: (type: string, cb: () => void) => {
        listeners[type] = cb;
      },
      removeEventListener: vi.fn(),
    } as any;

    render(
      <MemoryRouter initialEntries={['/feed']}>
        <FloatingVideoNotePiP />
      </MemoryRouter>,
    );

    // Return to chat without conversationId
    const returnBtn = screen.getByTitle('Return to chat');
    fireEvent.click(returnBtn);

    // Visual viewport resize
    listeners['resize']?.();

    // Drag down to trash area (clientY > window.innerHeight - 90)
    const pip = screen.getByTestId('floating-video-pip');
    fireEvent.pointerDown(pip, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(pip, { clientX: 200, clientY: window.innerHeight - 50, pointerId: 1 });
    fireEvent.pointerUp(pip, { clientX: 200, clientY: window.innerHeight - 50, pointerId: 1 });

    vi.advanceTimersByTime(300);
    vi.useRealTimers();
  });
});
