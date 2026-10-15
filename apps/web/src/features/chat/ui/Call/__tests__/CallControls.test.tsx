import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallControls } from '../CallControls';

describe('CallControls Component', () => {
  it('renders all call control buttons and triggers callbacks', () => {
    const onToggleMute = vi.fn();
    const onToggleVideo = vi.fn();
    const onToggleScreenShare = vi.fn();
    const onEndCall = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <CallControls
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onEndCall={onEndCall}
        onOpenSettings={onOpenSettings}
      />,
    );

    const muteBtn = screen.getByLabelText(/mute microphone/i);
    const videoBtn = screen.getByLabelText(/^(stop|start) camera/i);
    const shareBtn = screen.getByLabelText(/share screen/i);
    const endBtn = screen.getByLabelText(/leave call/i);

    expect(muteBtn).toBeDefined();
    expect(videoBtn).toBeDefined();
    expect(shareBtn).toBeDefined();
    expect(endBtn).toBeDefined();

    fireEvent.click(muteBtn);
    expect(onToggleMute).toHaveBeenCalledTimes(1);

    fireEvent.click(videoBtn);
    expect(onToggleVideo).toHaveBeenCalledTimes(1);

    fireEvent.click(shareBtn);
    expect(onToggleScreenShare).toHaveBeenCalledTimes(1);

    fireEvent.click(endBtn);
    expect(onEndCall).toHaveBeenCalledTimes(1);
  });

  it('toggles microphone popover when chevron button is clicked', () => {
    const onToggleMute = vi.fn();
    const onToggleVideo = vi.fn();
    const onToggleScreenShare = vi.fn();
    const onEndCall = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <CallControls
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onEndCall={onEndCall}
        onOpenSettings={onOpenSettings}
      />,
    );

    const micSettingsBtn = screen.getByLabelText(/device settings/i);
    fireEvent.click(micSettingsBtn);

    // Popover content should now be visible
    expect(screen.getByText('Input Device')).toBeDefined();
    expect(screen.getByText('Input Sensitivity')).toBeDefined();
  });
});
