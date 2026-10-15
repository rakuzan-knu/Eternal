import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import VideoEditorModal from '../VideoEditorModal';
import CircularProgress from '../CircularProgress';

describe('VideoEditorModal and CircularProgress', () => {
  const mockFile = new File(['fake-video-bytes'], 'video.mp4', { type: 'video/mp4' });

  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-video');
    window.URL.revokeObjectURL = vi.fn();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('renders CircularProgress with correct percentage and progress bar attributes', () => {
    const { container } = render(<CircularProgress percent={47} size={60} />);
    expect(screen.getByText('47%')).toBeInTheDocument();
    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '47');
  });

  it('renders VideoEditorModal, switches tabs, adjusts tune sliders, toggles mute, and saves', () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();

    render(
      <VideoEditorModal
        file={mockFile}
        onCancel={onCancel}
        onSave={onSave}
        initialMuted={false}
        initialSpoiler={false}
      />,
    );

    // Header title
    expect(screen.getByText('Edit')).toBeInTheDocument();

    // Check video element
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();

    // Simulate metadata loaded (30 seconds)
    Object.defineProperty(video, 'duration', { value: 30, configurable: true });
    fireEvent.loadedMetadata(video!);

    // Play / Pause button
    const playBtn = screen.getByTitle('Play');
    fireEvent.click(playBtn);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    // Mute button
    const muteBtn = screen.getByTitle('Mute video');
    fireEvent.click(muteBtn);
    expect(screen.getByTitle('Unmute video')).toBeInTheDocument();

    // Switch to Crop tab
    const cropTabBtn = screen.getByTitle('Crop');
    fireEvent.click(cropTabBtn);
    expect(screen.getByText('Aspect ratio')).toBeInTheDocument();
    expect(screen.getByText('Square')).toBeInTheDocument();

    // Switch to Text tab
    const textTabBtn = screen.getByTitle('Text');
    fireEvent.click(textTabBtn);
    expect(screen.getByPlaceholderText('Type text...')).toBeInTheDocument();

    // Switch to Stickers tab
    const stickersTabBtn = screen.getByTitle('Stickers');
    fireEvent.click(stickersTabBtn);
    expect(screen.getByText('Click emoji to add')).toBeInTheDocument();

    // Switch back to Tune tab
    const tuneTabBtn = screen.getByTitle('Tune');
    fireEvent.click(tuneTabBtn);
    expect(screen.getByText('Quality')).toBeInTheDocument();

    // Change quality preset
    fireEvent.click(screen.getByText('720p'));

    // Toggle Spoiler and Send as File
    fireEvent.click(screen.getByTitle('Toggle spoiler'));
    fireEvent.click(screen.getByTitle('Send as file'));

    // Click Done to save
    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    expect(onSave).toHaveBeenCalledWith(
      mockFile,
      expect.objectContaining({
        isMuted: true,
        isSpoiler: true,
        sendAsFile: true,
      }),
    );
  });

  it('opens SendVideoModal when clicking Send... and dispatches onSendDirectly', () => {
    const onSendDirectly = vi.fn();

    render(
      <VideoEditorModal
        file={mockFile}
        onCancel={vi.fn()}
        onSave={vi.fn()}
        onSendDirectly={onSendDirectly}
      />,
    );

    // Click Send...
    fireEvent.click(screen.getByText('Send...'));

    // SendVideoModal should be open
    expect(screen.getByText('Send Video')).toBeInTheDocument();
    const captionInput = screen.getByPlaceholderText('Add a caption...');
    fireEvent.change(captionInput, { target: { value: 'Look at this clip!' } });

    // Click Send
    const sendSubmitBtn = screen.getByTitle('Send');
    fireEvent.click(sendSubmitBtn);

    expect(onSendDirectly).toHaveBeenCalledWith(
      mockFile,
      'Look at this clip!',
      expect.objectContaining({
        isSpoiler: false,
      }),
    );
  });

  it('supports selecting Telegram aspect ratios in Crop tab', () => {
    render(<VideoEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    // Switch to Crop tab
    fireEvent.click(screen.getByTitle('Crop'));
    expect(screen.getByText('Aspect ratio')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Square')).toBeInTheDocument();

    // Select 2:3 portrait crop
    const btn2x3 = screen.getByText('2:3');
    fireEvent.click(btn2x3);

    // Select 16:9 landscape crop
    const btn16x9 = screen.getByText('16:9');
    fireEvent.click(btn16x9);
  });

  it('supports 5 drawing tools (Pen, Arrow, Marker, Neon, Eraser) and Color Mixer', () => {
    render(<VideoEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    // Switch to Draw tab
    fireEvent.click(screen.getByTitle('Draw'));

    // Check all 5 tools exist
    expect(screen.getByText('Pen')).toBeInTheDocument();
    expect(screen.getByText('Arrow')).toBeInTheDocument();
    expect(screen.getByText('Marker')).toBeInTheDocument();
    expect(screen.getByText('Neon')).toBeInTheDocument();
    expect(screen.getByText('Eraser')).toBeInTheDocument();

    // Switch tools
    fireEvent.click(screen.getByText('Arrow'));
    fireEvent.click(screen.getByText('Marker'));
    fireEvent.click(screen.getByText('Neon'));
    fireEvent.click(screen.getByText('Eraser'));
    fireEvent.click(screen.getByText('Pen'));

    // Toggle Color Mixer
    const colorWheelBtn = screen.getByTitle('Custom Color');
    fireEvent.click(colorWheelBtn);
    expect(screen.getByText('HEX')).toBeInTheDocument();
    expect(screen.getByText('RGB')).toBeInTheDocument();

    // Draw on canvas with pointer events
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    fireEvent.pointerDown(canvas!, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas!, { clientX: 150, clientY: 150 });
    fireEvent.pointerUp(canvas!);
  });

  it('supports adding and dragging text and stickers within video bounds', () => {
    render(<VideoEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    // Switch to Text tab
    fireEvent.click(screen.getByTitle('Text'));
    const input = screen.getByPlaceholderText('Type text...');
    fireEvent.change(input, { target: { value: 'My Awesome Title' } });
    fireEvent.click(screen.getByText('Add Text'));

    const textOverlay = screen.getByText('My Awesome Title');
    expect(textOverlay).toBeInTheDocument();

    // Simulate drag on text overlay
    fireEvent.pointerDown(textOverlay, { clientX: 200, clientY: 200 });
    fireEvent(window, new MouseEvent('pointermove', { clientX: 250, clientY: 250 }));
    fireEvent(window, new MouseEvent('pointerup'));

    // Switch to Stickers tab
    fireEvent.click(screen.getByTitle('Stickers'));
    const stickerBtns = screen.getAllByRole('button');
    const emojiBtn = stickerBtns.find((b) => b.querySelector('img[alt="🔥"]'));
    if (emojiBtn) {
      fireEvent.click(emojiBtn);
    }
  });

  it('closes immediately on Cancel or Escape when no changes were made', () => {
    const handleCancel = vi.fn();
    render(<VideoEditorModal file={mockFile} onCancel={handleCancel} onSave={vi.fn()} />);

    // Press Escape with 0 edits
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard Changes')).not.toBeInTheDocument();
  });

  it('shows Discard Changes modal when edits exist, toggles on Cancel/Escape, and discards on DISCARD', () => {
    const handleCancel = vi.fn();
    render(<VideoEditorModal file={mockFile} onCancel={handleCancel} onSave={vi.fn()} />);

    // Make an edit: add text
    fireEvent.click(screen.getByTitle('Text'));
    const input = screen.getByPlaceholderText('Type text...');
    fireEvent.change(input, { target: { value: 'Something' } });
    fireEvent.click(screen.getByText('Add Text'));

    // Press Escape: should NOT call onCancel, but should show Discard Changes modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).not.toHaveBeenCalled();
    expect(screen.getByText('Discard Changes')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to discard your changes?')).toBeInTheDocument();

    // Press Escape again: closes Discard Changes modal and returns to editing
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Discard Changes')).not.toBeInTheDocument();
    expect(handleCancel).not.toHaveBeenCalled();

    // Click Close (X) button: re-opens Discard Changes modal
    fireEvent.click(screen.getByTitle('Cancel'));
    expect(screen.getByText('Discard Changes')).toBeInTheDocument();

    // Click CANCEL button: closes dialog, keeps editor open
    fireEvent.click(screen.getByText('CANCEL'));
    expect(screen.queryByText('Discard Changes')).not.toBeInTheDocument();
    expect(handleCancel).not.toHaveBeenCalled();

    // Click Close again, then click DISCARD: calls onCancel
    fireEvent.click(screen.getByTitle('Cancel'));
    expect(screen.getByText('Discard Changes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('DISCARD'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
