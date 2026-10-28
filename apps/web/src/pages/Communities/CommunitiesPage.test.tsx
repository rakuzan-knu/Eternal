import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunitySummary } from '@social-network/shared-contracts';
import CommunitiesPage from './CommunitiesPage';

const mocks = vi.hoisted(() => ({
  authenticated: true,
  directory: vi.fn(),
  mine: vi.fn(),
  retry: vi.fn(),
}));

vi.mock('@/shared/model/useAuthStore', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mocks.authenticated }),
}));
vi.mock('@/shared/seo', () => ({ SEOHead: () => null }));
vi.mock('@/features/communities', () => ({
  useCommunityDirectory: mocks.directory,
  useMyCommunities: mocks.mine,
}));
vi.mock('@/widgets/communities', () => ({
  CommunityCreateDialog: ({ onCreated }: { onCreated: (id: string) => void }) => (
    <button onClick={() => onCreated('new-community')}>Finish creation</button>
  ),
}));

const community: CommunitySummary = {
  id: 'creative-room',
  name: 'Creative Room',
  description: 'Share work and make things together.',
  avatar: null,
  memberCount: 24,
  createdAt: '2026-10-01T00:00:00Z',
};
function result(data = [community], nextCursor: string | null = null) {
  return {
    data: { data, nextCursor },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: mocks.retry,
  };
}
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Location">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate('/communities?q=restored')}>Restore search</button>
    </>
  );
}
function setup(url = '/communities') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CommunitiesPage />
      <Location />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.authenticated = true;
  mocks.directory.mockReturnValue(result());
  mocks.mine.mockReturnValue(result());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Communities discovery', () => {
  it('retains useful community identity, membership counts and navigation', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Find your people.' })).toBeInTheDocument();
    const mine = screen.getByRole('region', { name: 'Your communities' });
    const directory = screen.getByRole('region', { name: 'Discover communities' });
    expect(within(mine).getByRole('link', { name: /Creative Room/ })).toHaveAttribute(
      'href',
      '/communities/creative-room',
    );
    expect(within(directory).getByText(community.description)).toBeInTheDocument();
    expect(within(directory).getByText('24 members')).toBeInTheDocument();
    expect(within(directory).getByRole('link', { name: /Open community/ })).toHaveAttribute(
      'href',
      '/communities/creative-room',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create community' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish creation' }));
    expect(screen.getByLabelText('Location')).toHaveTextContent('/communities/new-community');
  });

  it('debounces search, preserves other URL state and clears pending searches immediately', () => {
    setup('/communities?view=all');
    const input = screen.getByRole('searchbox', { name: 'Search communities' });
    fireEvent.change(input, { target: { value: 'drawing' } });
    act(() => vi.advanceTimersByTime(299));
    expect(mocks.directory).toHaveBeenLastCalledWith('', undefined);
    act(() => vi.advanceTimersByTime(1));
    expect(mocks.directory).toHaveBeenLastCalledWith('drawing', undefined);
    expect(screen.getByLabelText('Location')).toHaveTextContent('view=all&q=drawing');
    fireEvent.change(input, { target: { value: 'pending' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(mocks.directory).toHaveBeenLastCalledWith('', undefined);
    act(() => vi.advanceTimersByTime(500));
    expect(mocks.directory).toHaveBeenLastCalledWith('', undefined);
    expect(screen.getByLabelText('Location')).toHaveTextContent('/communities?view=all');
  });

  it('waits for IME completion and submits an explicit search immediately', () => {
    setup();
    const input = screen.getByRole('searchbox');
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '創作' } });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.submit(screen.getByRole('search'));
    expect(mocks.directory).toHaveBeenLastCalledWith('', undefined);
    fireEvent.compositionEnd(input);
    fireEvent.submit(screen.getByRole('search'));
    expect(mocks.directory).toHaveBeenLastCalledWith('創作', undefined);
  });

  it('restores a navigated query and cancels a pending draft', () => {
    setup('/communities?q=initial');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pending' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('restored');
    act(() => vi.advanceTimersByTime(500));
    expect(mocks.directory).toHaveBeenLastCalledWith('restored', undefined);
  });

  it('keeps independent directory and membership paging and resets search paging', () => {
    mocks.directory.mockReturnValue(result([community], 'directory-next'));
    mocks.mine.mockReturnValue(result([community], 'mine-next'));
    setup();
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Community pages' })).getByRole('button', {
        name: 'Next',
      }),
    );
    expect(mocks.directory).toHaveBeenLastCalledWith('', 'directory-next');
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Your communities pages' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    );
    expect(mocks.mine).toHaveBeenLastCalledWith(true, 'mine-next');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'new' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(mocks.directory).toHaveBeenLastCalledWith('new', undefined);
    expect(mocks.mine).toHaveBeenLastCalledWith(true, 'mine-next');
  });

  it('keeps logged-out entry and recoverable directory failures', () => {
    mocks.authenticated = false;
    mocks.directory.mockReturnValue({ ...result(), isError: true });
    setup();
    expect(screen.getByRole('link', { name: 'Sign in to create' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.queryByRole('region', { name: 'Your communities' })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Try again' }));
    expect(mocks.retry).toHaveBeenCalledOnce();
  });
});

it('shows loading and no-results recovery without hiding the search', () => {
  mocks.directory.mockReturnValue({ ...result(), isPending: true });
  mocks.mine.mockReturnValue({ ...result(), isPending: true });
  const view = setup('/communities?q=missing');
  expect(screen.getByText('Finding communities…')).toHaveAttribute('role', 'status');
  expect(screen.getByText('Loading your communities…')).toHaveAttribute('role', 'status');
  expect(screen.getByRole('searchbox')).toHaveValue('missing');
  view.unmount();
  mocks.directory.mockReturnValue(result([]));
  mocks.mine.mockReturnValue(result([]));
  setup('/communities?q=missing');
  expect(screen.getByText('No communities match this search')).toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Discover communities' })).getByRole('button', {
      name: 'Clear search',
    }),
  );
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByText('The next community could be yours')).toBeInTheDocument();
});

it('falls back to the community monogram when an avatar cannot load', () => {
  mocks.directory.mockReturnValue(
    result([{ ...community, avatar: 'https://example.com/avatar.png' }]),
  );
  setup();
  const card = within(screen.getByRole('region', { name: 'Discover communities' })).getByRole(
    'link',
  );
  const image = card.querySelector('img');
  expect(image).not.toBeNull();
  if (image) fireEvent.error(image);
  expect(within(card).getByText('CR')).toBeInTheDocument();
  expect(card.querySelector('img')).toBeNull();
});
