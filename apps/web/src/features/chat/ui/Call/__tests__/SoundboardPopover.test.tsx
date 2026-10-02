import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SoundboardPopover } from '../SoundboardPopover';
import { useSoundboardStore } from '../../../model/soundboardStore';

// Mock CallContext
vi.mock('../../../model/CallContext', () => ({
  useCall: () => ({
    broadcastSoundboard: vi.fn(),
  }),
}));

describe('SoundboardPopover Component', () => {
  beforeEach(() => {
    useSoundboardStore.setState({
      mySounds: [],
      chatSounds: {},
      favorites: ['quack'],
      recent: [],
      soundboardVolume: 1.0,
      isSoundboardMuted: false,
    });
  });

  it('renders correctly when open', () => {
    const handleClose = vi.fn();
    render(
      <SoundboardPopover
        isOpen={true}
        onClose={handleClose}
        conversationId="conv-123"
        conversationTitle="General Chat"
      />,
    );

    expect(screen.getByPlaceholderText('Search sounds...')).toBeInTheDocument();
    expect(screen.getByText('Favorites (1)')).toBeInTheDocument();
    expect(screen.getAllByText('Quack').length).toBeGreaterThanOrEqual(1);
  });

  it('filters sounds using search bar', () => {
    const handleClose = vi.fn();
    render(<SoundboardPopover isOpen={true} onClose={handleClose} conversationId="conv-123" />);

    const searchInput = screen.getByPlaceholderText('Search sounds...');
    fireEvent.change(searchInput, { target: { value: 'Airhorn' } });

    expect(screen.getByText('Search results (1)')).toBeInTheDocument();
    expect(screen.getByText('Airhorn')).toBeInTheDocument();
  });

  it('toggles favorite on sound', () => {
    const handleClose = vi.fn();
    render(<SoundboardPopover isOpen={true} onClose={handleClose} conversationId="conv-123" />);

    // Initial state: 'quack' is favorited
    expect(useSoundboardStore.getState().isFavorite('quack')).toBe(true);

    // Find favorite button for quack
    const favButtons = screen.getAllByTitle('Remove from favorites');
    expect(favButtons.length).toBeGreaterThan(0);
    fireEvent.click(favButtons[0]);

    expect(useSoundboardStore.getState().isFavorite('quack')).toBe(false);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<SoundboardPopover isOpen={false} onClose={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });
});
