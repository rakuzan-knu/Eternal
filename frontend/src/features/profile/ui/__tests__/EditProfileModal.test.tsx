import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import EditProfileModal from '../EditProfileModal';
import { useUIStore } from '../../../../shared/model/useUIStore';
import { resetUIStore } from '../../../../test/resetUIStore';

class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,mock';
    this.onloadend?.();
  }
}

function getNameInput() {
  return screen.getByPlaceholderText("Ваше ім'я");
}

function getUsernameInput() {
  return document.querySelectorAll('input[type="text"]')[1] as HTMLInputElement;
}

function getBioTextarea() {
  return document.querySelector('textarea') as HTMLTextAreaElement;
}

async function fillValidNameAndUsername(
  user: ReturnType<typeof userEvent.setup>,
  username = 'my_profile',
) {
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
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
    resetUIStore();
  });

  it('renders nothing when the modal is closed', () => {
    const { container } = render(<EditProfileModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the account tab with default field values when open', () => {
    useUIStore.getState().openEditProfile();

    render(<EditProfileModal />);

    expect(screen.getByRole('heading', { name: 'Аккаунт' })).toBeInTheDocument();
    expect(getUsernameInput()).toHaveValue('my_profile');
    expect(getBioTextarea()).toHaveValue('Rozroblyayu Eternal.');
  });

  it('switches to the privacy tab content when its menu item is clicked', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);

    await user.click(screen.getByText('Приватність'));

    expect(screen.getByText('Онлайн-статус')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ваше ім'я")).not.toBeInTheDocument();
  });

  it('calls closeEditProfile when the close (X) button is clicked', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);

    await user.click(screen.getAllByRole('button')[0]);

    expect(useUIStore.getState().isEditProfileOpen).toBe(false);
  });

  it('shows a validation error and keeps the modal open when the username is too short', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    await user.type(getNameInput(), 'Ayate');
    const usernameInput = getUsernameInput();
    await user.clear(usernameInput);
    await user.type(usernameInput, 'ab');

    await user.click(screen.getByText('Зберегти зміни'));

    await waitFor(() => expect(screen.getByText('Мінімум 3 символи')).toBeInTheDocument());
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
  });

  it('submits successfully and closes the modal when all fields are valid', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    await fillValidNameAndUsername(user);

    await user.click(screen.getByText('Зберегти зміни'));

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('does not submit twice when the save button is double-clicked with valid data', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    await fillValidNameAndUsername(user);
    const saveButton = screen.getByText('Зберегти зміни');

    await user.dblClick(saveButton);

    await waitFor(() => expect(useUIStore.getState().isEditProfileOpen).toBe(false));
  });

  it('toggles the online status switch on the privacy tab', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    await user.click(screen.getByText('Приватність'));
    const toggles = screen.getAllByRole('button', { name: '' });
    const onlineToggle = toggles.find((btn) => btn.className.includes('w-11'))!;
    expect(onlineToggle).toHaveClass('bg-white');

    await user.click(onlineToggle);

    expect(onlineToggle).toHaveClass('bg-[#333]');
  });

  it('toggles the notification switches on the notifications tab', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    await user.click(screen.getByText('Сповіщення'));
    const toggles = screen
      .getAllByRole('button', { name: '' })
      .filter((btn) => btn.className.includes('w-11'));
    const [mainToggle, soundToggle] = toggles;
    expect(mainToggle).toHaveClass('bg-white');
    expect(soundToggle).toHaveClass('bg-[#333]');

    await user.click(mainToggle);
    await user.click(soundToggle);

    expect(mainToggle).toHaveClass('bg-[#333]');
    expect(soundToggle).toHaveClass('bg-white');
  });

  it('shows an avatar preview after uploading a file', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    const avatarButton = screen.getAllByText('Вибрати')[0];
    const avatarInput = avatarButton
      .closest('div')!
      .parentElement!.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'avatar.png', { type: 'image/png' });

    await user.upload(avatarInput, file);

    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'data:image/png;base64,mock');
  });

  it('shows a banner preview after uploading a file and repositions it when dragged', async () => {
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    const bannerInputs = document.querySelectorAll('input[type="file"]');
    const bannerInput = bannerInputs[1] as HTMLInputElement;
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
    useUIStore.getState().openEditProfile();
    const user = userEvent.setup();
    render(<EditProfileModal />);
    const bannerInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    const file = new File(['content'], 'banner.png', { type: 'image/png' });
    await user.upload(bannerInput, file);
    const bannerImg = screen.getByAltText('Banner');
    const bannerContainer = bannerImg.parentElement!;

    fireEvent.touchStart(bannerContainer, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(bannerContainer, { touches: [{ clientY: 50 }] });

    expect(bannerImg).toHaveStyle({ objectPosition: '50% 70%' });
  });

  it('ignores drag events when no banner has been uploaded yet', () => {
    useUIStore.getState().openEditProfile();
    render(<EditProfileModal />);
    const bannerContainer = screen.getByText('Банер не встановлено').closest('div')!.parentElement!;

    fireEvent.mouseDown(bannerContainer, { clientY: 100 });
    fireEvent.mouseMove(bannerContainer, { clientY: 0 });

    expect(screen.queryByAltText('Banner')).not.toBeInTheDocument();
  });
});
