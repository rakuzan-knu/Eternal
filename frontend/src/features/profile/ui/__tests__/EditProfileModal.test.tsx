// @vitest-environment jsdom
// The default test environment is happy-dom, but this suite's userEvent typing
// into the masked username input does not register under it; jsdom is exact.
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import EditProfileModal from '../EditProfileModal';
import { useUIStore } from '../../../../shared/model/useUIStore';
import { useAuthStore } from '../../../../shared/model/useAuthStore';
import { resetUIStore } from '../../../../test/resetUIStore';
import { renderWithProviders } from '../../../../test/renderWithProviders';

class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,mock';
    this.onloadend?.();
  }
}

function getNameInput() {
  return (document.querySelector('input[name="displayName"]') ||
    screen.getByPlaceholderText(/Your name|Ayate/)) as HTMLInputElement;
}

function getUsernameInput() {
  return (document.querySelector('input[name="username"]') ||
    screen.getByPlaceholderText(/username|my_profile/)) as HTMLInputElement;
}

function getBioTextarea() {
  return document.querySelector('textarea') as HTMLTextAreaElement;
}

async function openAndWaitForProfile() {
  useAuthStore.getState().setAuth('user-1');
  useUIStore.getState().openEditProfile();
  renderWithProviders(<EditProfileModal />);
  await waitFor(() => expect(getUsernameInput()).toHaveValue('my_profile'));
}

async function fillValidNameAndUsername(
  user: ReturnType<typeof userEvent.setup>,
  username = 'my_profile',
) {
  await user.clear(getNameInput());
  await user.type(getNameInput(), 'Ayate');
  const usernameInput = getUsernameInput();
  await user.clear(usernameInput);
  await user.type(usernameInput, username);
}

describe('EditProfileModal', () => {
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    originalFileReader = global.FileReader;
    // @ts-expect-error - simplified mock, not a full FileReader implementation
    global.FileReader = MockFileReader;
    useAuthStore.getState().setAuth('user-1');
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
    resetUIStore();
    useAuthStore.getState().clearAuth();
  });

  it('renders nothing when the modal is closed', () => {
    const { container } = renderWithProviders(<EditProfileModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the account tab with default field values when open', async () => {
    await openAndWaitForProfile();

    expect(screen.getByRole('heading', { name: 'Account Information' })).toBeInTheDocument();
    expect(getUsernameInput()).toHaveValue('my_profile');
    expect(getBioTextarea()).toHaveValue('Rozroblyayu Eternal.');
  });

  it('switches to the privacy tab content when its menu item is clicked', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();

    await user.click(screen.getByText('Privacy'));

    expect(await screen.findByText('Who can see you and contact you')).toBeInTheDocument();
    expect(document.querySelector('input[name="displayName"]')).not.toBeInTheDocument();
  });

  it('calls closeEditProfile when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();

    await user.click(screen.getAllByRole('button')[0]);

    expect(useUIStore.getState().isEditProfileOpen).toBe(false);
  });

  it('shows a validation error and keeps the modal open when the username is too short', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    const usernameInput = getUsernameInput();
    await user.clear(usernameInput);
    await user.type(usernameInput, 'a');

    await user.click(screen.getAllByText('Save changes')[0]);

    await waitFor(() => expect(screen.getByText('Minimum 2 characters')).toBeInTheDocument());
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
  });

  it('submits successfully and closes the modal when all fields are valid', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    await fillValidNameAndUsername(user);

    await user.click(screen.getAllByText('Save changes')[0]);

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('does not submit twice when the save button is double-clicked with valid data', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    await fillValidNameAndUsername(user);

    await user.dblClick(screen.getAllByText('Save changes')[0]);

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('toggles the notification switches on the notifications tab', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    await user.click(screen.getByText('Notifications'));
    const toggles = screen
      .getAllByRole('button', { name: '' })
      .filter((btn) => btn.className.includes('w-11'));
    const [mainToggle, soundToggle] = toggles;
    expect(mainToggle).toHaveClass('bg-white');
    expect(soundToggle).toHaveClass('bg-white');

    await user.click(mainToggle);
    await user.click(soundToggle);

    expect(mainToggle).toHaveClass('bg-[#333]');
    expect(soundToggle).toHaveClass('bg-[#333]');
  });

  it('shows an avatar preview after uploading a file', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    const avatarInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(['content'], 'avatar.png', { type: 'image/png' });

    await user.upload(avatarInput, file);

    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'data:image/png;base64,mock');
  });

  it('shows a banner preview after uploading a file and repositions it when dragged', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    const bannerInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    const file = new File(['content'], 'banner.png', { type: 'image/png' });

    await user.upload(bannerInput, file);

    const bannerImg = screen.getByAltText('Banner');
    expect(bannerImg).toHaveAttribute('src', 'data:image/png;base64,mock');
    expect(bannerImg).toHaveStyle({ objectPosition: '50% 50%' });

    const bannerContainer = bannerImg.parentElement!;
    fireEvent.mouseDown(bannerContainer, { clientY: 100 });
    fireEvent.mouseMove(bannerContainer, { clientY: 50 });

    expect(bannerImg).toHaveStyle({ objectPosition: '50% 70%' });
  });

  it('repositions the banner via touch drag events as well as mouse events', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();
    const bannerInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    const file = new File(['content'], 'banner.png', { type: 'image/png' });
    await user.upload(bannerInput, file);
    const bannerImg = screen.getByAltText('Banner');
    const bannerContainer = bannerImg.parentElement!;

    fireEvent.touchStart(bannerContainer, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(bannerContainer, { touches: [{ clientY: 50 }] });

    expect(bannerImg).toHaveStyle({ objectPosition: '50% 70%' });
  });

  it('ignores drag events when no banner has been uploaded yet', async () => {
    await openAndWaitForProfile();
    const bannerContainer = screen.getByText('Banner not installed').closest('div')!.parentElement!;

    fireEvent.mouseDown(bannerContainer, { clientY: 100 });
    fireEvent.mouseMove(bannerContainer, { clientY: 0 });

    expect(screen.queryByAltText('Banner')).not.toBeInTheDocument();
  });

  it('switches between settings tabs when tab buttons are clicked', async () => {
    const user = userEvent.setup();
    await openAndWaitForProfile();

    const securityTab = screen.getByRole('button', { name: /security/i });
    await user.click(securityTab);
    expect(screen.getByRole('heading', { name: /password & security/i })).toBeInTheDocument();

    const privacyTab = screen.getByRole('button', { name: /privacy/i });
    await user.click(privacyTab);
    expect(screen.getByRole('heading', { name: /profile privacy/i })).toBeInTheDocument();

    const notificationsTab = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsTab);
    expect(
      screen.getByRole('heading', { name: /sound & push notifications/i }),
    ).toBeInTheDocument();
  });
});
