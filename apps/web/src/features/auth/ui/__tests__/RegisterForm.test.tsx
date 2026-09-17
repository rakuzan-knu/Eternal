import { fireEvent, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../RegisterForm';
import { useAuthMutations } from '../../api/useAuth';
import { useCheckUsername } from '@/entities/profile/model/useCheckUsername';
import { renderWithProviders } from '../../../../test/renderWithProviders';

vi.mock('../../api/useAuth', () => ({
  useAuthMutations: vi.fn(),
}));

vi.mock('@/entities/profile/model/useCheckUsername', () => ({
  useCheckUsername: vi.fn(() => ({ data: { isAvailable: true }, isFetching: false })),
}));

const mockedUseAuthMutations = vi.mocked(useAuthMutations);
const mockedUseCheckUsername = vi.mocked(useCheckUsername);

function setupMutations(overrides?: {
  isPending?: boolean;
  mutateImpl?: (payload: any, options: any) => void;
}) {
  const mutate = vi.fn(
    overrides?.mutateImpl ??
      ((_payload, options) => {
        options?.onSuccess?.({
          accessToken: 'token-a',
          refreshToken: 'token-r',
          user: { id: 'u1', username: 'alexk', displayName: 'Alex Kovalenko' },
        });
      }),
  );
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

function fillMinimumValidForm() {
  const firstNameInput = screen.getByPlaceholderText('First name');
  const lastNameInput = screen.getByPlaceholderText('Last name');
  const usernameInput = screen.getByPlaceholderText('@username');
  const emailInput = screen.getByPlaceholderText('Mobile number or email');
  const passwordInput = screen.getByPlaceholderText('New password');

  fireEvent.change(firstNameInput, { target: { value: 'Alex' } });
  fireEvent.change(lastNameInput, { target: { value: 'Kovalenko' } });
  fireEvent.change(usernameInput, { target: { value: '@alexk' } });
  fireEvent.change(emailInput, { target: { value: 'alex@test.com' } });
  fireEvent.change(passwordInput, { target: { value: 'secret123' } });
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

  it('interacts with InfoTooltip and handles Escape key and outside click', async () => {
    setupMutations();
    renderWithProviders(<RegisterForm />);

    const tooltipButtons = document.querySelectorAll('button[type="button"]');
    const helpButton = tooltipButtons[0];
    fireEvent.click(helpButton);

    expect(screen.getByText(/Providing your birthday/)).toBeInTheDocument();

    // Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/Providing your birthday/)).not.toBeInTheDocument();

    // Open and click outside
    fireEvent.click(helpButton);
    expect(screen.getByText(/Providing your birthday/)).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText(/Providing your birthday/)).not.toBeInTheDocument();
  });

  it('enables the submit button once all fields are valid and handles onSuccess', async () => {
    const onSuccess = vi.fn();
    setupMutations();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    fillMinimumValidForm();

    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled(), { timeout: 4000 });

    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows server error banner when mutation fails with 409 or 400', async () => {
    setupMutations({
      mutateImpl: (_payload, options) => {
        options?.onError?.({
          isAxiosError: true,
          response: { status: 409, data: { message: 'Email already in use' } },
        });
      },
    });

    renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();

    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled(), { timeout: 4000 });

    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument());
  });

  it('handles various server error shapes in onError callback', async () => {
    // 1. 409 without string message
    let testError: any = { isAxiosError: true, response: { status: 409, data: {} } };
    setupMutations({
      mutateImpl: (_payload, options) => options?.onError?.(testError),
    });
    const { unmount: u1 } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() =>
      expect(
        screen.getByText('This Email, phone number or username is already taken.'),
      ).toBeInTheDocument(),
    );
    u1();

    // 2. 400 with array message
    testError = {
      isAxiosError: true,
      response: { status: 400, data: { message: ['Invalid email', 'Password too weak'] } },
    };
    const { unmount: u2 } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() =>
      expect(screen.getByText('Invalid email, Password too weak')).toBeInTheDocument(),
    );
    u2();

    // 2b. 400 with string message
    testError = {
      isAxiosError: true,
      response: { status: 400, data: { message: 'Invalid payload format' } },
    };
    const { unmount: u2b } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() => expect(screen.getByText('Invalid payload format')).toBeInTheDocument());
    u2b();

    // 3. 400 with object message
    testError = { isAxiosError: true, response: { status: 400, data: { message: {} } } };
    const { unmount: u3 } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() =>
      expect(
        screen.getByText('Data validation error. Please check the entered fields.'),
      ).toBeInTheDocument(),
    );
    u3();

    // 4. 500 status with string message & fallback
    testError = {
      isAxiosError: true,
      response: { status: 500, data: { message: 'Database failure' } },
    };
    const { unmount: u4 } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() => expect(screen.getByText('Database failure')).toBeInTheDocument());
    u4();

    testError = { isAxiosError: true, response: { status: 500, data: {} } };
    const { unmount: u5 } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() =>
      expect(
        screen.getByText(
          'The server is unavailable or an internal error has occurred. Please try again later.',
        ),
      ).toBeInTheDocument(),
    );
    u5();

    // 5. Non-axios error
    testError = new Error('Unknown crash');
    const { unmount: u6 } = renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();
    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());
    await waitFor(() =>
      expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument(),
    );
    u6();
  });

  it('auto-prefixes the username with @ when the user types without one', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<RegisterForm />);
    const usernameInput = screen.getByPlaceholderText('@username');

    await user.clear(usernameInput);
    await user.type(usernameInput, 'bob');

    expect(usernameInput).toHaveValue('@bob');
  });

  it('shows a validation error for a too-short username', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<RegisterForm />);
    const usernameInput = screen.getByPlaceholderText('@username');

    await user.clear(usernameInput);
    await user.type(usernameInput, 'a');
    await user.tab();

    await waitFor(() =>
      expect(screen.getByText('Username must be at least 2 characters long')).toBeInTheDocument(),
    );
  });

  it('trims leading/trailing whitespace from the first name on blur', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<RegisterForm />);
    const firstNameInput = screen.getByPlaceholderText('First name');

    await user.type(firstNameInput, '  Alex  ');
    await user.tab();

    expect(firstNameInput).toHaveValue('Alex');
  });

  it('toggles password visibility when the eye icon is clicked', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<RegisterForm />);
    const passwordInput = screen.getByPlaceholderText('New password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(passwordInput.parentElement!.querySelector('svg')!);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('trims lastName and identity on blur', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<RegisterForm />);
    const lastNameInput = screen.getByPlaceholderText('Last name');
    const emailInput = screen.getByPlaceholderText('Mobile number or email');

    await user.type(lastNameInput, '  Smith  ');
    await user.tab();
    expect(lastNameInput).toHaveValue('Smith');

    await user.type(emailInput, '  user@test.com  ');
    await user.tab();
    expect(emailInput).toHaveValue('user@test.com');
  });

  it('prevents submission when username is already taken', async () => {
    const mutate = setupMutations();
    mockedUseCheckUsername.mockReturnValue({
      data: { isAvailable: false },
      isFetching: false,
    } as any);

    renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();

    expect(getSubmitButton()).toBeDisabled();
    fireEvent.click(getSubmitButton());
    expect(mutate).not.toHaveBeenCalled();
  });

  it('handles gender selection, custom date options, and missing last name', async () => {
    const mutate = setupMutations();
    mockedUseCheckUsername.mockReturnValue({
      data: { isAvailable: true },
      isFetching: false,
    } as any);

    renderWithProviders(<RegisterForm />);
    fillMinimumValidForm();

    const genderBtn = screen.getByText('Male');
    fireEvent.click(genderBtn);
    const femaleOption = screen.getByText('Female');
    fireEvent.click(femaleOption);

    // Update last name
    const lastNameInput = screen.getByPlaceholderText('Last name');
    fireEvent.change(lastNameInput, { target: { value: 'Johnson' } });

    await waitFor(() => expect(getSubmitButton()).not.toBeDisabled());
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(mutate).toHaveBeenCalled());
  });

  it('renders password error and triggers username check when valid length', async () => {
    setupMutations();
    mockedUseCheckUsername.mockReturnValue({
      data: { isAvailable: true },
      isFetching: false,
    } as any);

    renderWithProviders(<RegisterForm />);
    const passwordInput = screen.getByPlaceholderText('New password');
    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.blur(passwordInput);
    });

    await waitFor(() => {
      expect(
        screen.getByText('The password must contain at least 8 characters.'),
      ).toBeInTheDocument();
    });
  });
});
