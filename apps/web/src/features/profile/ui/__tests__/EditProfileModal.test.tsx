import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MediaUploadError,
  validateMediaUpload,
} from '../../../../shared/lib/mediaUploadValidation';
import EditProfileModal from '../EditProfileModal';
import { useUIStore } from '../../../../shared/model/useUIStore';
import { useAuthStore } from '../../../../shared/model/useAuthStore';
import { resetUIStore } from '../../../../test/resetUIStore';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { server } from '../../../../test/mocks/server';
import { http, HttpResponse } from 'msw';
vi.mock('../../../../shared/lib/mediaUploadValidation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/lib/mediaUploadValidation')>()),
  validateMediaUpload: vi.fn().mockResolvedValue('image'),
}));

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
    server.use(
      http.get('*/v1/nameplates', () => HttpResponse.json([])),
      http.get('*/v1/nameplates/me', () =>
        HttpResponse.json({ activeNameplateId: null, owned: [] }),
      ),
    );
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
    const user = userEvent.setup({ delay: null });
    await openAndWaitForProfile();

    await user.click(screen.getByText('Privacy'));

    expect(await screen.findByText('Who can see you and contact you')).toBeInTheDocument();
    expect(document.querySelector('input[name="displayName"]')).not.toBeInTheDocument();
  });

  it('opens settings navigation and returns to the selected settings page', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(max-width: 639px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    await openAndWaitForProfile();
    const toggle = screen.getByRole('button', { name: 'All settings' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Back to settings page' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Account Information' }));
    expect(screen.getByRole('button', { name: 'All settings' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(getUsernameInput()).toHaveValue('my_profile');
    expect(screen.getByRole('button', { name: 'All settings' })).toHaveFocus();
    vi.unstubAllGlobals();
  });

  it('calls closeEditProfile when the close (X) button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    await openAndWaitForProfile();

    await user.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('closes the modal with animation when Escape key is pressed', async () => {
    await openAndWaitForProfile();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('shows a validation error and keeps the modal open when the username is too short', async () => {
    const user = userEvent.setup({ delay: null });
    await openAndWaitForProfile();
    const usernameInput = getUsernameInput();
    await user.clear(usernameInput);
    await user.type(usernameInput, 'a');

    await user.click(screen.getAllByText('Save changes')[0]);

    await waitFor(() => expect(screen.getByText('Minimum 2 characters')).toBeInTheDocument());
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
  });

  it('submits successfully and closes the modal when all fields are valid', async () => {
    const user = userEvent.setup({ delay: null });
    await openAndWaitForProfile();
    await fillValidNameAndUsername(user);

    await user.click(screen.getAllByText('Save changes')[0]);

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('does not submit twice when the save button is double-clicked with valid data', async () => {
    const user = userEvent.setup({ delay: null });
    await openAndWaitForProfile();
    await fillValidNameAndUsername(user);

    await user.dblClick(screen.getAllByText('Save changes')[0]);

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('toggles the notification switches on the notifications tab', async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
    await openAndWaitForProfile();
    const avatarInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(['content'], 'avatar.png', { type: 'image/png' });

    await user.upload(avatarInput, file);

    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'data:image/png;base64,mock');
  });

  it('rejects a file without replacing the existing avatar or banner', async () => {
    await openAndWaitForProfile();
    const inputs = document.querySelectorAll('input[type="file"]');
    for (const input of inputs) {
      fireEvent.change(input, {
        target: { files: [new File(['valid fixture'], 'photo.png', { type: 'image/png' })] },
      });
    }
    await waitFor(() =>
      expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'data:image/png;base64,mock'),
    );
    await waitFor(() =>
      expect(screen.getByAltText('Banner')).toHaveAttribute('src', 'data:image/png;base64,mock'),
    );
    const beforeAvatar = screen.getByAltText('Avatar').getAttribute('src');
    const beforeBanner = screen.queryByAltText('Banner')?.getAttribute('src');
    for (const [index, input] of Array.from(inputs).entries()) {
      vi.mocked(validateMediaUpload).mockRejectedValueOnce(
        new MediaUploadError('Choose a JPG, PNG, GIF or WebP image.'),
      );
      fireEvent.change(input, {
        target: { files: [new File(['MZ'], 'bad.exe', { type: 'application/octet-stream' })] },
      });
      await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(index + 1));
    }
    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', beforeAvatar);
    expect(screen.queryByAltText('Banner')?.getAttribute('src')).toBe(beforeBanner);
  });

  it('shows a banner preview after uploading a file and repositions it when dragged', async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
