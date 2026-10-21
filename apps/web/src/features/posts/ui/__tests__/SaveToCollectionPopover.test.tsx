import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveToCollectionPopover } from '../SaveToCollectionPopover';
import { useSavedCollectionsStore } from '@/entities/post/model/useSavedCollectionsStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'test-user', username: 'tester' } }),
}));

describe('SaveToCollectionPopover', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useSavedCollectionsStore.setState({
      collections: [
        {
          id: 'col-1',
          userId: 'test-user',
          name: 'Tech Articles',
          postIds: [],
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  it('renders null when not open', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SaveToCollectionPopover postId="post-1" isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders collections, toggles post in collection, creates a new collection, and closes', () => {
    const onClose = vi.fn();
    const onPostSaved = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <SaveToCollectionPopover
          postId="post-1"
          isOpen={true}
          onClose={onClose}
          onPostSaved={onPostSaved}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Save to collection')).toBeInTheDocument();
    expect(screen.getByText('Tech Articles')).toBeInTheDocument();

    // Toggle post-1 into Tech Articles
    fireEvent.click(screen.getByText('Tech Articles'));
    expect(useSavedCollectionsStore.getState().collections[0].postIds).toContain('post-1');
    expect(onPostSaved).toHaveBeenCalled();

    // Untoggle post-1
    fireEvent.click(screen.getByText('Tech Articles'));
    expect(useSavedCollectionsStore.getState().collections[0].postIds).not.toContain('post-1');

    // Create new collection
    fireEvent.click(screen.getByText('New collection'));
    const input = screen.getByPlaceholderText('Collection name');
    fireEvent.change(input, { target: { value: 'Design Ideas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      useSavedCollectionsStore.getState().collections.some((c) => c.name === 'Design Ideas'),
    ).toBe(true);

    // Close button
    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('escapes a clipped card and closes on Escape or outside click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <div style={{ overflow: 'hidden', transform: 'translateY(0)' }}>
        <SaveToCollectionPopover postId="post-1" isOpen onClose={onClose} />
      </div>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Save to collection' });
    expect(dialog.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveStyle({ position: 'fixed', zIndex: '10000' });
    fireEvent.mouseDown(screen.getByText('Tech Articles'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows empty collections state when no custom collections exist', () => {
    useSavedCollectionsStore.setState({ collections: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <SaveToCollectionPopover postId="post-1" isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('No custom collections yet')).toBeInTheDocument();
  });
});
