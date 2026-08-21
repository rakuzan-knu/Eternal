import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoNoteRecorderCircle from '../VideoNoteRecorderCircle';
import React from 'react';

describe('VideoNoteRecorderCircle', () => {
  it('renders video note recorder in recording and locked state', () => {
    const onDiscard = vi.fn();
    const onPausePreview = vi.fn();
    const onSend = vi.fn();
    const onToggleFacing = vi.fn();

    render(
      <VideoNoteRecorderCircle
        recordState="locked"
        duration={15}
        stream={null}
        previewPayload={null}
        dragOffset={{ x: 0, y: 0 }}
        onToggleFacing={onToggleFacing}
        onDiscard={onDiscard}
        onPausePreview={onPausePreview}
        onSend={onSend}
      />,
    );

    expect(screen.getByTestId('video-note-recorder')).toBeInTheDocument();
    expect(screen.getByText('0:15')).toBeInTheDocument();

    const sendBtn = screen.getByTitle('Send video note');
    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalled();

    const discardBtn = screen.getByTitle('Discard video note');
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalled();
  });
});
