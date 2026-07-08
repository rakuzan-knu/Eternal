import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../Profile';
import { useUIStore } from '../../../shared/model/useUIStore';
import { resetUIStore } from '../../../test/resetUIStore';

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="mock-emoji-picker" />,
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

function renderProfile(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<ProfilePage />} />
        <Route path="/:username" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  afterEach(() => {
    resetUIStore();
    vi.restoreAllMocks();
  });

  it('falls back to "my_profile" when no username route param is present', () => {
    renderProfile(['/']);

    expect(screen.getByText('@my_profile')).toBeInTheDocument();
  });

  it('uses the username from the route param when present', () => {
    renderProfile(['/kolya_dev']);

    expect(screen.getByText('@kolya_dev')).toBeInTheDocument();
  });

  it('shows the posts tab content by default', () => {
    renderProfile();

    expect(screen.getByText('Thats fire!')).toBeInTheDocument();
    expect(screen.getByText('Eternal CEO is here!')).toBeInTheDocument();
    expect(screen.queryByText('New update available!')).not.toBeInTheDocument();
  });

  it('shows the reposts tab content after switching tabs', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText('Репости'));

    expect(screen.getByText('New update available!')).toBeInTheDocument();
    expect(screen.queryByText('Thats fire!')).not.toBeInTheDocument();
  });

  it('hides the create-post composer on the reposts tab', async () => {
    const user = userEvent.setup();
    renderProfile();
    expect(screen.getByPlaceholderText('Що нового?')).toBeInTheDocument();

    await user.click(screen.getByText('Репости'));

    expect(screen.queryByPlaceholderText('Що нового?')).not.toBeInTheDocument();
  });

  it('calls openEditProfile when the edit button is clicked', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText('Редагувати'));

    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
  });

  it('logs the new post payload when submitting from the profile composer', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    renderProfile();

    await user.type(screen.getByPlaceholderText('Що нового?'), 'From my profile');
    await user.click(screen.getByText('Опублікувати'));

    expect(consoleSpy).toHaveBeenCalledWith(
      'Пост створено з профілю користувача:',
      expect.objectContaining({ text: 'From my profile' }),
    );
  });

  it('opens the comment modal with the clicked post', async () => {
    const user = userEvent.setup();
    renderProfile();

    const commentButton = screen.getByText('2').closest('button')!;
    await user.click(commentButton);

    expect(useUIStore.getState().isCommentModalOpen).toBe(true);
    expect(useUIStore.getState().activePostForComments?.text).toBe('Thats fire!');
  });
});
