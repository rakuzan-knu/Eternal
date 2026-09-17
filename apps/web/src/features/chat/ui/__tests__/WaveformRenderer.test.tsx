import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WaveformRenderer } from '../WaveformRenderer';

describe('WaveformRenderer', () => {
  it('renders waveform bars and handles pointer seek, hover, and scrubbing interactions', () => {
    const onSeek = vi.fn();
    const onHoverFractionChange = vi.fn();
    const mockPeaks = [0.2, 0.4, 0.8, 0.5, 0.3, 0.9, 0.1];

    const rect = {
      left: 0,
      top: 0,
      width: 100,
      height: 24,
      right: 100,
      bottom: 24,
      x: 0,
      y: 0,
      toJSON: () => {},
    };

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);

    render(
      <WaveformRenderer
        peaks={mockPeaks}
        progressFraction={0.4}
        totalDuration={30}
        onSeek={onSeek}
        onHoverFractionChange={onHoverFractionChange}
        isOwnMessage={true}
      />,
    );

    const waveform = screen.getByTestId('waveform-renderer');
    expect(waveform).toBeInTheDocument();

    waveform.getBoundingClientRect = vi.fn().mockReturnValue(rect);
    waveform.setPointerCapture = vi.fn();
    waveform.releasePointerCapture = vi.fn();

    const createPointerEvent = (type: string, clientX: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
      });
      Object.defineProperty(event, 'clientX', { value: clientX });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      return event;
    };

    // Pointer down -> seek
    fireEvent(waveform, createPointerEvent('pointerdown', 50));
    expect(onSeek).toHaveBeenCalledWith(0.5);

    // Pointer move -> scrub
    fireEvent(waveform, createPointerEvent('pointermove', 75));
    expect(onSeek).toHaveBeenCalledWith(0.75);

    // Pointer up -> end scrub
    fireEvent(waveform, createPointerEvent('pointerup', 80));
    expect(onSeek).toHaveBeenCalledWith(0.8);

    // Pointer leave
    fireEvent.pointerLeave(waveform);
    expect(onHoverFractionChange).toHaveBeenCalledWith(null);

    // Pointer cancel
    fireEvent(waveform, createPointerEvent('pointerdown', 20));
    fireEvent(waveform, createPointerEvent('pointercancel', 20));
    expect(onHoverFractionChange).toHaveBeenCalledWith(null);
  });

  it('handles hasPointerCapture true and clientX fallback from nativeEvent', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <WaveformRenderer
        peaks={[0.5, 0.5]}
        progressFraction={0}
        totalDuration={10}
        onSeek={onSeek}
        isOwnMessage={false}
      />,
    );

    const waveform = container.firstChild as HTMLElement;
    waveform.hasPointerCapture = vi.fn().mockReturnValue(true);
    waveform.releasePointerCapture = vi.fn();

    // Trigger pointerup with hasPointerCapture true
    const upEvent = new MouseEvent('pointerup', { bubbles: true });
    Object.defineProperty(upEvent, 'pointerId', { value: 2 });
    Object.defineProperty(upEvent, 'clientX', { value: 50 });
    fireEvent(waveform, upEvent);
    expect(waveform.releasePointerCapture).toHaveBeenCalledWith(2);

    // Trigger pointercancel with hasPointerCapture true
    const cancelEvent = new MouseEvent('pointercancel', { bubbles: true });
    Object.defineProperty(cancelEvent, 'pointerId', { value: 2 });
    Object.defineProperty(cancelEvent, 'clientX', { value: 50 });
    fireEvent(waveform, cancelEvent);
    expect(waveform.releasePointerCapture).toHaveBeenCalledWith(2);

    // Pointer event with clientX NaN falling back to nativeEvent
    const customEvent = new Event('pointermove', { bubbles: true });
    Object.defineProperty(customEvent, 'clientX', { value: NaN });
    Object.defineProperty(customEvent, 'nativeEvent', { value: { clientX: 40 } });
    fireEvent(waveform, customEvent);
  });
});
