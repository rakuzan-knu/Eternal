import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInfoSection from '../ChatInfoSection';
import React from 'react';

describe('ChatInfoSection', () => {
  it('renders chat info expandable section with counts and triggers actions', () => {
    const onToggle = vi.fn();
    const onOpenPinned = vi.fn();
    const onOpenGallery = vi.fn();

    render(
      <ChatInfoSection
        isOpen={true}
        onToggle={onToggle}
        pinnedCount={3}
        mediaCount={10}
        fileCount={2}
        linkCount={5}
        onOpenPinned={onOpenPinned}
        onOpenGallery={onOpenGallery}
      />,
    );

    expect(screen.getByText('Chat info')).toBeInTheDocument();
    expect(screen.getByText('Pinned messages')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('10 loaded')).toBeInTheDocument();

    const mediaBtn = screen.getByText('Media');
    fireEvent.click(mediaBtn);
    expect(onOpenGallery).toHaveBeenCalledWith('media');
  });
});
