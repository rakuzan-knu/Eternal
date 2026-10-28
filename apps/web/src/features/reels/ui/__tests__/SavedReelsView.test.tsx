import { fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DEFAULT_SEED_REELS } from '@/entities/reel';
import { SavedReelsView } from '../SavedReelsView';

const saved = vi.hoisted(() => ({ query: vi.fn(), refetch: vi.fn() }));
vi.mock('../../api/reelsApi', () => ({ useSavedReels: saved.query }));

beforeEach(() => saved.query.mockReset());

describe('Saved reels', () => {
  it('offers exploration when empty without inventing content', () => {
    saved.query.mockReturnValue({
      data: { data: [], meta: { hasNextPage: false, nextCursor: null } },
    });
    renderWithProviders(<SavedReelsView userId="owner" />);
    expect(screen.getByText('Keep the reels you want to revisit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore reels' })).toHaveAttribute('href', '/reels');
  });

  it('exposes failed loading with retry instead of an empty collection', () => {
    saved.query.mockReturnValue({ isError: true, refetch: saved.refetch });
    renderWithProviders(<SavedReelsView userId="owner" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Saved reels could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(saved.refetch).toHaveBeenCalledOnce();
    expect(screen.queryByText('Keep the reels you want to revisit')).not.toBeInTheDocument();
  });

  it('uses opaque cursors and allows returning to the previous page', () => {
    saved.query.mockImplementation((_userId: string, after?: string) => ({
      data: {
        data: [DEFAULT_SEED_REELS[0]],
        meta: { hasNextPage: !after, nextCursor: after ? null : 'saved-row-2' },
      },
    }));
    renderWithProviders(<SavedReelsView userId="owner" />);
    expect(
      screen.getByRole('link', { name: `Watch ${DEFAULT_SEED_REELS[0].caption}` }),
    ).toHaveAttribute('href', `/reels?id=${DEFAULT_SEED_REELS[0].id}`);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(saved.query).toHaveBeenLastCalledWith('owner', 'saved-row-2');
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(saved.query).toHaveBeenLastCalledWith('owner', undefined);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});
