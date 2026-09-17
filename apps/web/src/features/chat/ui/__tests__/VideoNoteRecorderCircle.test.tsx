import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoNoteRecorderCircle from '../VideoNoteRecorderCircle';
import React from 'react';

describe('VideoNoteRecorderCircle', () => {
  it('renders video note recorder in recording and locked state, toggles camera and sends', () => {
    const onDiscard = vi.fn();
    const onPausePreview = vi.fn();
    const onSend = vi.fn();
    const onToggleFacing = vi.fn();
    const onSelectCamera = vi.fn();

    render(
      <VideoNoteRecorderCircle
        recordState="locked"
        duration={15}
        stream={null}
        previewPayload={null}
        dragOffset={{ x: 0, y: 0 }}
        availableCameras={[
          { deviceId: 'cam-1', label: 'Front Camera' },
          { deviceId: 'cam-2', label: 'Back Camera' },
        ]}
        activeCameraId="cam-1"
        cameraToast={{ text: 'Front Camera active', isFading: false }}
        onToggleFacing={onToggleFacing}
        onSelectCamera={onSelectCamera}
        onDiscard={onDiscard}
        onPausePreview={onPausePreview}
        onSend={onSend}
      />,
    );

    expect(screen.getByTestId('video-note-recorder')).toBeInTheDocument();
    expect(screen.getByText('0:15')).toBeInTheDocument();

    // Toggle camera facing
    const flipBtn = screen.getByTitle('Click to switch camera, right-click to choose camera');
    fireEvent.click(flipBtn);
    expect(onToggleFacing).toHaveBeenCalled();

    // Right-click to open camera menu
    fireEvent.contextMenu(flipBtn);
    expect(screen.getByText('Back Camera')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back Camera'));
    expect(onSelectCamera).toHaveBeenCalledWith('cam-2');

    // Send
    const sendBtn = screen.getByTitle('Send video note');
    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalled();

    // Discard
    const discardBtn = screen.getByTitle('Discard video note');
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalled();
  });

  it('renders in preview state with play/pause and send controls', () => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    const mockFile = new File([''], 'video.webm', { type: 'video/webm' });
    const { container } = render(
      <VideoNoteRecorderCircle
        recordState="preview"
        duration={25}
        stream={null}
        previewPayload={{
          file: mockFile,
          mode: 'video',
          duration: 25,
          previewUrl: 'blob:preview-vid',
        }}
        dragOffset={{ x: 0, y: 0 }}
        onToggleFacing={vi.fn()}
        onDiscard={vi.fn()}
        onPausePreview={vi.fn()}
        onSend={vi.fn()}
      />,
    );

    expect(screen.getByText('0:25')).toBeInTheDocument();
    const video = container.querySelector('video')!;
    expect(video).toBeInTheDocument();

    // Play/Pause button in center
    const playPauseBtn = container.querySelector('.absolute.inset-0.flex button')!;
    expect(playPauseBtn).toBeInTheDocument();

    // Pause
    fireEvent.click(playPauseBtn);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    // Play again
    fireEvent.click(playPauseBtn);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
