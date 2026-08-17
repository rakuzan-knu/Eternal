import { screen, waitFor } from '@testing-library/react';
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
  const firstNameInput = screen.getByPlaceholderText('First name');
  const lastNameInput = screen.getByPlaceholderText('Last name');
  const usernameInput = screen.getByPlaceholderText('@username');
  const emailInput = screen.getByPlaceholderText('Mobile number or email');
  const passwordInput = screen.getByPlaceholderText('New password');

  await user.type(firstNameInput, 'Alex');
  await user.type(lastNameInput, 'Kovalenko');
  await user.clear(usernameInput);
  await user.type(usernameInput, 'alexk');
  await user.type(emailInput, 'alex@test.com');
  await user.type(passwordInput, 'secret123');
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

    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled(), { timeout: 3000 });
  });

  it('calls registerMutation.mutate with the clean payload on submit', async () => {
    const mutate = setupMutations();
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await fillMinimumValidForm(user);
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled(), { timeout: 3000 });

    await user.click(getSubmitButton());

    await waitFor(
      () =>
        expect(mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'alex@test.com',
            username: 'alexk',
            displayName: 'Alex Kovalenko',
            password: 'secret123',
          }),
          expect.any(Object),
        ),
      { timeout: 3000 },
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
    await user.type(usernameInput, 'a');
    await user.tab();

    await waitFor(() =>
      expect(screen.getByText('Username must be at least 2 characters long')).toBeInTheDocument(),
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
    await user.type(screen.getByPlaceholderText('New password'), 'secret123');

    await waitFor(
      () => expect(screen.getByText('This username is already taken.')).toBeInTheDocument(),
      {
        timeout: 4000,
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
});
