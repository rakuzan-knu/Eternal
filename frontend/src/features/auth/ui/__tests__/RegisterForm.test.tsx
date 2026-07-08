import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../RegisterForm';
import { useAuthMutations } from '../../api/useAuth';
import { renderWithProviders } from '../../../../test/renderWithProviders';

vi.mock('../../api/useAuth', () => ({
  useAuthMutations: vi.fn(),
}));

const mockedUseAuthMutations = vi.mocked(useAuthMutations);

function setupMutations(overrides?: { isPending?: boolean }) {
  const mutate = vi.fn();
  mockedUseAuthMutations.mockReturnValue({
    loginMutation: { mutate: vi.fn(), isPending: false } as never,
    registerMutation: { mutate, isPending: overrides?.isPending ?? false } as never,
    findAccountMutation: { mutate: vi.fn(), isPending: false } as never,
    resetMutation: { mutate: vi.fn(), isPending: false } as never,
  });
  return mutate;
}

function getSubmitButton() {
  return screen.getByRole('button', { name: 'Create Account' });
}

async function fillMinimumValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('First name'), 'Alex');
  await user.type(screen.getByPlaceholderText('Last name'), 'Kovalenko');
  const usernameInput = screen.getByPlaceholderText('@username');
  await user.clear(usernameInput);
  await user.type(usernameInput, 'alexk');
  await user.type(screen.getByPlaceholderText('Mobile number or email'), 'alex@test.com');
  await user.type(screen.getByPlaceholderText('New password'), 'secret1');
}

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all required fields and a disabled submit button initially', () => {
    setupMutations();

    renderWithProviders(<RegisterForm />);

    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mobile number or email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('enables the submit button once all fields are valid', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillMinimumValidForm(user);

    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled(), { timeout: 2000 });
  });

  it('calls registerMutation.mutate with the full payload on submit', async () => {
    const mutate = setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await fillMinimumValidForm(user);
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled(), { timeout: 2000 });

    await user.click(getSubmitButton());

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Alex',
        lastName: 'Kovalenko',
        username: '@alexk',
        identity: 'alex@test.com',
        password: 'secret1',
        gender: 'Male',
        birthMonth: 'January',
        birthDay: '1',
        birthYear: '2000',
      }),
    );
  });

  it('auto-prefixes the username with @ when the user types without one', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const usernameInput = screen.getByPlaceholderText('@username');

    await user.clear(usernameInput);
    await user.type(usernameInput, 'bob');

    expect(usernameInput).toHaveValue('@bob');
  });

  it('shows a validation error for a too-short username', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const usernameInput = screen.getByPlaceholderText('@username');

    await user.clear(usernameInput);
    await user.tab();

    await waitFor(() =>
      expect(screen.getByText('Юзернейм має бути не менше 3 символів')).toBeInTheDocument(),
    );
  });

  it('shows a "username taken" error and keeps the submit button disabled', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByPlaceholderText('First name'), 'Alex');
    await user.type(screen.getByPlaceholderText('Last name'), 'Kovalenko');
    const usernameInput = screen.getByPlaceholderText('@username');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'test_taken');
    await user.type(screen.getByPlaceholderText('Mobile number or email'), 'alex@test.com');
    await user.type(screen.getByPlaceholderText('New password'), 'secret1');

    await waitFor(
      () => expect(screen.getByText('Цей юзернейм уже зайнятий.')).toBeInTheDocument(),
      {
        timeout: 2000,
      },
    );
    expect(getSubmitButton()).toBeDisabled();
  });

  it('trims leading/trailing whitespace from the first name on blur', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const firstNameInput = screen.getByPlaceholderText('First name');

    await user.type(firstNameInput, '  Alex  ');
    await user.tab();

    expect(firstNameInput).toHaveValue('Alex');
  });

  it('toggles password visibility when the eye icon is clicked', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const passwordInput = screen.getByPlaceholderText('New password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(passwordInput.parentElement!.querySelector('svg')!);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('offers fewer days for February than for January', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const [monthCombo, dayCombo] = screen.getAllByRole('combobox');

    await user.click(dayCombo);
    const januaryDayCount = within(screen.getByRole('listbox')).getAllByRole('option').length;
    await user.click(dayCombo);

    await user.click(monthCombo);
    await user.click(screen.getByText('February'));
    await user.click(dayCombo);
    const februaryDayCount = within(screen.getByRole('listbox')).getAllByRole('option').length;

    expect(januaryDayCount).toBe(31);
    expect(februaryDayCount).toBeLessThan(januaryDayCount);
  });

  it('opens and closes the birthday info tooltip', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const tooltipTriggers = screen.getAllByRole('button', { name: '' });
    const birthdayTooltipButton = tooltipTriggers[0];

    await user.click(birthdayTooltipButton);

    expect(screen.getByText(/Providing your birthday helps make sure/)).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByText(/Providing your birthday helps make sure/)).not.toBeInTheDocument();
  });

  it('disables the submit button and shows a spinner while the mutation is pending', () => {
    setupMutations({ isPending: true });

    renderWithProviders(<RegisterForm />);

    expect(screen.queryByRole('button', { name: 'Create Account' })).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
