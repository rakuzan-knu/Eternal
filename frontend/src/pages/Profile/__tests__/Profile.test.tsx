import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from '../Profile';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import { resetUIStore } from '../../../test/resetUIStore';

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="mock-emoji-picker" />,
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

function renderProfile(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<ProfilePage />} />
          <Route path="/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('user-1');
  });

  afterEach(() => {
    resetUIStore();
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  it('falls back to "my_profile" when no username route param is present', async () => {
    renderProfile(['/']);

    expect(await screen.findByText('@my_profile')).toBeInTheDocument();
  });

  it('uses the username from the route param when present', async () => {
    renderProfile(['/kolya_dev']);

    expect(await screen.findByText('@kolya_dev')).toBeInTheDocument();
  });

  it('shows the posts tab content by default', async () => {
    renderProfile();

    expect(await screen.findByText('Thats fire!')).toBeInTheDocument();
    expect(await screen.findByText('Eternal CEO is here!')).toBeInTheDocument();
    expect(screen.queryByText('New update available!')).not.toBeInTheDocument();
  });

  it('shows the reposts tab content after switching tabs', async () => {
    const user = userEvent.setup();
    renderProfile();

    const repostsTab = await screen.findByText('Reposts');
    await user.click(repostsTab);

    expect(await screen.findByText('New update available!')).toBeInTheDocument();
    expect(screen.queryByText('Thats fire!')).not.toBeInTheDocument();
  });

  it('hides the create-post composer on the reposts tab', async () => {
    const user = userEvent.setup();
    renderProfile();

    expect(await screen.findByPlaceholderText("What's new?")).toBeInTheDocument();

    const repostsTab = await screen.findByText('Reposts');
    await user.click(repostsTab);

    expect(screen.queryByPlaceholderText("What's new?")).not.toBeInTheDocument();
  });

  it('calls openEditProfile when the edit button is clicked', async () => {
    const user = userEvent.setup();
    renderProfile();

    const editBtn = await screen.findByText('Edit');
    await user.click(editBtn);

    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
  });

  it('submits a new post from the profile composer and clears the input', async () => {
    const user = userEvent.setup();
    renderProfile();

    const composer = await screen.findByPlaceholderText("What's new?");
    await user.type(composer, 'From my profile');
    await user.click(screen.getByText('Publish'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("What's new?")).toHaveValue('');
    });
  });

  it('opens the comment modal with the clicked post', async () => {
    const user = userEvent.setup();
    renderProfile();

    await screen.findByText('Thats fire!');

    const commentButton = await screen.findByText('2');
    await user.click(commentButton);

    expect(useUIStore.getState().isCommentModalOpen).toBe(true);
    expect(useUIStore.getState().activePostForComments?.text).toBe('Thats fire!');
  });
});
