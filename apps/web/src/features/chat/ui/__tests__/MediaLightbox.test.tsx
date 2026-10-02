import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MediaLightbox from '../MediaLightbox';
import { MediaItem } from '../../model/chatMediaTypes';
import { MessageView, AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('MediaLightbox', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const items: MediaItem[] = [
    {
      message: {
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'alice', displayName: null, avatar: null },
        body: 'photo',
        createdAt: '2026-01-01',
        reactions: [],
        attachments: [],
      } as unknown as MessageView,
      attachment: {
        id: 'a1',
        type: 'IMAGE',
        url: 'https://example.com/photo.png',
        fileName: 'photo.png',
        size: 1024,
      } as unknown as AttachmentView,
    },
    {
      message: {
        id: 'm2',
        conversationId: 'c1',
        senderId: 'u2',
        sender: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: null },
        body: 'video',
        createdAt: '2026-01-02',
        reactions: [],
        attachments: [],
      } as unknown as MessageView,
      attachment: {
        id: 'a2',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        fileName: null,
        size: 2048,
      } as unknown as AttachmentView,
    },
  ];

  it('renders lightbox view for media, navigates items, downloads and closes', () => {
    const onIndexChange = vi.fn();
    const onClose = vi.fn();
    const onJumpToMessage = vi.fn();

    const { rerender } = render(
      <MediaLightbox
        items={items}
        index={0}
        onIndexChange={onIndexChange}
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
      />,
    );

    expect(screen.getByText('alice')).toBeInTheDocument();

    // Download button
    const downloadBtn = screen.getByTitle('Download');
    fireEvent.click(downloadBtn);

    // Go to message button was removed per design
    expect(screen.queryByTitle('Go to message')).not.toBeInTheDocument();

    // Key navigation
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenCalledWith(1);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    // Switch to index 1 (video)
    rerender(
      <MediaLightbox
        items={items}
        index={1}
        onIndexChange={onIndexChange}
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
      />,
    );

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(document.querySelector('video')).toBeInTheDocument();

    // ArrowLeft at index 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onIndexChange).toHaveBeenCalledWith(0);

    // Download when fileName is null (covers line 47)
    const downloadBtn2 = screen.getByTitle('Download');
    fireEvent.click(downloadBtn2);

    // Close button with animation timer
    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);
    // Second close while closing (covers line 26)
    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalled();

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('handles Delete, Forward, Rotate, and Zoom controls', () => {
    const onDelete = vi.fn();
    const onForward = vi.fn();
    const onClose = vi.fn();

    render(
      <MediaLightbox
        items={items}
        index={0}
        onIndexChange={vi.fn()}
        onClose={onClose}
        onDelete={onDelete}
        onForward={onForward}
        originRect={{ top: 100, left: 100, width: 200, height: 150 } as DOMRect}
      />,
    );

    // Forward button
    const fwdBtn = screen.getByTitle('Forward');
    fireEvent.click(fwdBtn);
    expect(onForward).toHaveBeenCalledWith(items[0].message);

    // Rotate button
    const rotateBtn = screen.getByTitle('Turn 90°');
    fireEvent.click(rotateBtn);
    const img = screen.getByAltText('photo.png');
    expect(img).toHaveStyle('transform: translate3d(0px, 0px, 0) scale(1) rotate(90deg)');

    // Zoom toggle button (first click zooms in to 2x)
    const zoomInBtn = screen.getByTitle('Zoom in');
    fireEvent.click(zoomInBtn);
    expect(img).toHaveStyle('transform: translate3d(0px, 0px, 0) scale(2) rotate(90deg)');

    // Zoom out button (second click resets to 1x)
    const zoomOutBtn = screen.getAllByTitle('Zoom out')[0];
    fireEvent.click(zoomOutBtn);
    expect(img).toHaveStyle('transform: translate3d(0px, 0px, 0) scale(1) rotate(90deg)');

    // Delete button opens modal
    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);
    expect(screen.getByText('Delete message')).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getAllByRole('button', { name: /^delete$/i })[1];
    fireEvent.click(confirmBtn);
    expect(onDelete).toHaveBeenCalledWith('m1', true);
  });

  it('returns null when current item is undefined', () => {
    const { container } = render(
      <MediaLightbox
        items={[]}
        index={0}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        onJumpToMessage={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Copy button for static images and copies image, but hides it for videos and gifs', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        write: writeMock,
        writeText: writeTextMock,
      },
    });
    (global as any).ClipboardItem = vi.fn();
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['image data'], { type: 'image/png' }),
    });

    const gifItem: MediaItem = {
      message: {
        id: 'm3',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'alice', displayName: null, avatar: null },
        body: 'funny gif',
        createdAt: '2026-01-03',
        reactions: [],
        attachments: [],
      } as unknown as MessageView,
      attachment: {
        id: 'a3',
        type: 'GIF',
        url: 'https://example.com/anime.gif',
        fileName: 'anime.gif',
        size: 5000,
      } as unknown as AttachmentView,
    };

    const allItems = [...items, gifItem];

    // Index 0: regular image -> Copy button enabled and visible
    const { rerender } = render(
      <MediaLightbox items={allItems} index={0} onIndexChange={vi.fn()} onClose={vi.fn()} />,
    );

    const copyBtn = screen.getByTitle('Copy image');
    expect(copyBtn).toBeInTheDocument();
    expect(copyBtn).not.toBeDisabled();

    // Click copy
    fireEvent.click(copyBtn);
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeMock).toHaveBeenCalled();
    expect(screen.getByTitle('Copied to clipboard')).toBeInTheDocument();

    // Switch to index 1 (video) -> copy button disabled and hidden
    rerender(
      <MediaLightbox items={allItems} index={1} onIndexChange={vi.fn()} onClose={vi.fn()} />,
    );
    const videoCopyBtn = screen.getByTitle('Copy image');
    expect(videoCopyBtn).toBeDisabled();

    // Switch to index 2 (gif) -> copy button disabled and hidden
    rerender(
      <MediaLightbox items={allItems} index={2} onIndexChange={vi.fn()} onClose={vi.fn()} />,
    );
    const gifCopyBtn = screen.getByTitle('Copy image');
    expect(gifCopyBtn).toBeDisabled();
  });

  it('applies slide animations when navigating next and previous', () => {
    const { rerender } = render(
      <MediaLightbox items={items} index={0} onIndexChange={vi.fn()} onClose={vi.fn()} />,
    );

    // Initial render without navigation shouldn't have slide animation
    expect(document.querySelector('.animate-lightboxSlideNext')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-lightboxSlidePrev')).not.toBeInTheDocument();

    // Navigate to next index (0 -> 1)
    rerender(<MediaLightbox items={items} index={1} onIndexChange={vi.fn()} onClose={vi.fn()} />);
    expect(document.querySelector('.animate-lightboxSlideNext')).toBeInTheDocument();

    // Navigate back to prev index (1 -> 0)
    rerender(<MediaLightbox items={items} index={0} onIndexChange={vi.fn()} onClose={vi.fn()} />);
    expect(document.querySelector('.animate-lightboxSlidePrev')).toBeInTheDocument();
  });

  it('provides Telegram-style custom video controls (play/pause, volume slider, speed menu, PiP, fullscreen)', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();
    const pipMock = vi.fn().mockResolvedValue(undefined);
    const fsMock = vi.fn().mockResolvedValue(undefined);

    HTMLMediaElement.prototype.play = playMock;
    HTMLMediaElement.prototype.pause = pauseMock;
    (HTMLVideoElement.prototype as any).requestPictureInPicture = pipMock;
    Element.prototype.requestFullscreen = fsMock;

    render(
      <MediaLightbox
        items={items}
        index={1} // video item
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const video = document.querySelector('video')!;
    expect(video).toBeInTheDocument();

    // Trigger loadedmetadata to populate duration and set playing state
    Object.defineProperty(video, 'duration', { value: 65, configurable: true });
    Object.defineProperty(video, 'paused', { value: false, writable: true, configurable: true });
    pauseMock.mockImplementation(() => {
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
    });
    playMock.mockImplementation(() => {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      return Promise.resolve();
    });
    fireEvent.loadedMetadata(video);

    // Initial state after autoplay attempt
    expect(screen.getByTitle('Pause')).toBeInTheDocument();

    // Click Pause
    fireEvent.click(screen.getByTitle('Pause'));
    expect(pauseMock).toHaveBeenCalled();

    // Fire onPause event to update state
    fireEvent.pause(video);
    expect(screen.getByTitle('Play')).toBeInTheDocument();

    // Click Play
    fireEvent.click(screen.getByTitle('Play'));
    expect(playMock).toHaveBeenCalled();

    // Volume button and slider
    const muteBtn = screen.getByTitle('Mute');
    expect(muteBtn).toBeInTheDocument();

    // Click mute toggles to unmute
    fireEvent.click(muteBtn);
    expect(video.muted).toBe(true);

    // Speed menu
    const speedBtn = screen.getByTitle('Playback Speed');
    expect(speedBtn).toBeInTheDocument();
    fireEvent.click(speedBtn);

    // Speed options should now be visible
    expect(screen.getByText('2x')).toBeInTheDocument();
    fireEvent.click(screen.getByText('2x'));
    expect(video.playbackRate).toBe(2);

    // Picture-in-Picture
    const pipBtn = screen.getByTitle('Picture-in-Picture');
    expect(pipBtn).toBeInTheDocument();
    fireEvent.click(pipBtn);
    expect(pipMock).toHaveBeenCalled();

    // Fullscreen
    const fsBtn = screen.getByTitle('Fullscreen');
    expect(fsBtn).toBeInTheDocument();
    fireEvent.click(fsBtn);
    expect(fsMock).toHaveBeenCalled();
  });
});
