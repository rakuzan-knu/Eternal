import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacySupportSection from '../PrivacySupportSection';
import React from 'react';

describe('PrivacySupportSection', () => {
  it('renders privacy and support section actions', () => {
    const onToggle = vi.fn();
    const onToggleMute = vi.fn();
    const onOpenPermissions = vi.fn();
    const onOpenRestrict = vi.fn();
    const onBlock = vi.fn();
    const onOpenReport = vi.fn();

    render(
      <PrivacySupportSection
        isOpen={true}
        onToggle={onToggle}
        isMuted={false}
        onToggleMute={onToggleMute}
        isGroup={false}
        otherUserId="u2"
        onOpenPermissions={onOpenPermissions}
        onOpenRestrict={onOpenRestrict}
        onBlock={onBlock}
        onOpenReport={onOpenReport}
      />,
    );

    expect(screen.getByText('Privacy and support')).toBeInTheDocument();
    expect(screen.getByText('Mute notifications')).toBeInTheDocument();
    expect(screen.getByText('Message permissions')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mute notifications'));
    expect(onToggleMute).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Block'));
    expect(onBlock).toHaveBeenCalledWith('u2');
  });
});
