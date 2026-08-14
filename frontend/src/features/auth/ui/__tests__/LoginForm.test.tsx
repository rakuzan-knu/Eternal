import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../LoginForm';
import { useAuthMutations } from '../../api/useAuth';

vi.mock('../../api/useAuth', () => ({
  useAuthMutations: vi.fn(),
}));

const mockedUseAuthMutations = vi.mocked(useAuthMutations);

function setupMutations(overrides?: {
  isPending?: boolean;
  mutateAsyncImpl?: (data: unknown) => Promise<unknown>;
}) {
  const mutateAsync = vi.fn(
    overrides?.mutateAsyncImpl ??
      (() =>
        Promise.resolve({
          accessToken: 'mock-access',
          refreshToken: 'mock-refresh',
          user: { id: 'u1', username: 'testuser', displayName: 'Test' },
        })),
  );
  mockedUseAuthMutations.mockReturnValue({
    loginMutation: {
      mutateAsync,
      mutate: vi.fn(),
      isPending: overrides?.isPending ?? false,
    } as never,
    registerMutation: { mutate: vi.fn(), isPending: false } as never,
    findAccountMutation: { mutate: vi.fn(), isPending: false } as never,
    resetMutation: { mutate: vi.fn(), isPending: false } as never,
  });
  return mutateAsync;
}

function renderLoginForm(initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/feed" element={<div>Feed</div>} />
        <Route path="/forgot-password" element={<div>Forgot password page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the identity and password fields with a submit button', () => {
    setupMutations();

    renderLoginForm();

    expect(screen.getByPlaceholderText('Email address or phone number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty fields', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(
        screen.getByText('Please enter a valid email address or phone number.'),
      ).toBeInTheDocument(),
    );
  });

  it('toggles password visibility when the eye icon is clicked', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderLoginForm();
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(passwordInput.parentElement!.querySelector('svg')!);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('submits valid credentials and navigates to /feed on success', async () => {
    const mutateAsync = setupMutations();
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Email address or phone number'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      email: 'user@test.com',
      identity: 'user@test.com',
      password: 'secret123',
    });
    await waitFor(() => expect(screen.getByText('Feed')).toBeInTheDocument());
  });

  it('shows the user-not-found error when the server responds with USER_NOT_FOUND', async () => {
    setupMutations({
      mutateAsyncImpl: () =>
        Promise.reject({
          isAxiosError: true,
          response: { status: 404, data: { message: 'USER_NOT_FOUND' } },
        }),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Email address or phone number'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(
        screen.getByText(/The email address or mobile phone number you provided/),
      ).toBeInTheDocument(),
    );
  });

  it('shows the wrong-password error when the server responds with INVALID_PASSWORD', async () => {
    setupMutations({
      mutateAsyncImpl: () =>
        Promise.reject({
          isAxiosError: true,
          response: { status: 401, data: { message: 'INVALID_PASSWORD' } },
        }),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Email address or phone number'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(screen.getByText('You entered an incorrect password.')).toBeInTheDocument(),
    );
  });

  it('shows a generic error banner for an unmapped error', async () => {
    setupMutations({
      mutateAsyncImpl: () => Promise.reject(new Error('network down')),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Email address or phone number'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(screen.getByText(/You entered incorrect credentials/)).toBeInTheDocument(),
    );
  });

  it('disables the submit button and shows a spinner while the mutation is pending', () => {
    setupMutations({ isPending: true });

    renderLoginForm();

    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('links "Forgot password?" to the forgot-password page', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByText('Forgot password?'));

    expect(screen.getByText('Forgot password page')).toBeInTheDocument();
  });
});
