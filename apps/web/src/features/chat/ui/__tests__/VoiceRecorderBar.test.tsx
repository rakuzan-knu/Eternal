import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VoiceRecorderBar from '../VoiceRecorderBar';
import React from 'react';

describe('VoiceRecorderBar', () => {
  it('renders recording state with timer, live visualizer, and slide hints', () => {
    render(
      <VoiceRecorderBar
        recordState="recording"
        duration={5}
        liveAmplitudes={[0.2, 0.5, 0.8, 0.3]}
        previewPayload={null}
        dragOffset={{ x: 0, y: 0 }}
        onDiscard={vi.fn()}
        onPausePreview={vi.fn()}
        onSend={vi.fn()}
      />,
    );

    expect(screen.getByTestId('voice-recorder-bar')).toBeInTheDocument();
    expect(screen.getByText('0:05')).toBeInTheDocument();
    expect(screen.getByText('Slide to cancel')).toBeInTheDocument();
  });

  it('renders locked state with discard, pause, and send buttons', () => {
    const onDiscard = vi.fn();
    const onPausePreview = vi.fn();
    const onSend = vi.fn();

    render(
      <VoiceRecorderBar
        recordState="locked"
        duration={12}
        liveAmplitudes={[0.4]}
        previewPayload={null}
        dragOffset={{ x: 0, y: 0 }}
        onDiscard={onDiscard}
        onPausePreview={onPausePreview}
        onSend={onSend}
      />,
    );

    expect(screen.getByText('0:12')).toBeInTheDocument();

    const discardBtn = screen.getByTitle('Discard recording');
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalled();

    const pauseBtn = screen.getByTitle('Pause to listen');
    fireEvent.click(pauseBtn);
    expect(onPausePreview).toHaveBeenCalled();

    const sendBtn = screen.getByTitle('Send voice note');
    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalled();
  });

  it('renders preview state and toggles audio preview playback', async () => {
    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    const pauseSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {});

    const mockFile = new File([''], 'audio.webm', { type: 'audio/webm' });
    const { unmount } = render(
      <VoiceRecorderBar
        recordState="preview"
        duration={15}
        liveAmplitudes={[]}
        previewPayload={{
          file: mockFile,
          mode: 'voice',
          duration: 15,
          previewUrl: 'blob:audio-note',
        }}
        dragOffset={{ x: 0, y: 0 }}
        onDiscard={vi.fn()}
        onPausePreview={vi.fn()}
        onSend={vi.fn()}
      />,
    );

    expect(screen.getByText('0:15')).toBeInTheDocument();
    const playBtn = screen.getByTestId('voice-recorder-bar').querySelector('button')!;

    await act(async () => {
      fireEvent.click(playBtn);
    });
    expect(playSpy).toHaveBeenCalled();

    // Pause click
    await act(async () => {
      fireEvent.click(playBtn);
    });
    expect(pauseSpy).toHaveBeenCalled();

    unmount();
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });
});
