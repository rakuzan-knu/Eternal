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
  mutateImpl?: (
    data: unknown,
    opts?: { onSuccess?: () => void; onError?: (e: unknown) => void },
  ) => void;
}) {
  const mutate = vi.fn(overrides?.mutateImpl ?? (() => {}));
  mockedUseAuthMutations.mockReturnValue({
    loginMutation: { mutate, isPending: overrides?.isPending ?? false } as never,
    registerMutation: { mutate: vi.fn(), isPending: false } as never,
    findAccountMutation: { mutate: vi.fn(), isPending: false } as never,
    resetMutation: { mutate: vi.fn(), isPending: false } as never,
  });
  return mutate;
}

function renderLoginForm(initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
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

    expect(screen.getByPlaceholderText('Ел. адреса або номер телефону')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Увійти' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty fields', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() =>
      expect(
        screen.getByText('Введіть коректну електронну адресу або номер телефону.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Пароль має містити щонайменше 6 символів.')).toBeInTheDocument();
  });

  it('toggles password visibility when the eye icon is clicked', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderLoginForm();
    const passwordInput = screen.getByPlaceholderText('Пароль');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(passwordInput.parentElement!.querySelector('svg')!);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('submits valid credentials and navigates to /dashboard on success', async () => {
    const mutate = setupMutations({
      mutateImpl: (_data, opts) => opts?.onSuccess?.(),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Ел. адреса або номер телефону'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(mutate).toHaveBeenCalledWith(
      { identity: 'user@test.com', password: 'secret1' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('shows the user-not-found error when the server responds with a matching axios error', async () => {
    setupMutations({
      mutateImpl: (_data, opts) =>
        opts?.onError?.({ isAxiosError: true, response: { status: 444, data: {} } }),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Ел. адреса або номер телефону'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() =>
      expect(screen.getByText(/не пов'язані із жодним обліковим записом/)).toBeInTheDocument(),
    );
  });

  it('shows the wrong-password error when the server responds with status 401', async () => {
    setupMutations({
      mutateImpl: (_data, opts) =>
        opts?.onError?.({ isAxiosError: true, response: { status: 401, data: {} } }),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Ел. адреса або номер телефону'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() =>
      expect(screen.getByText('Ви ввели неправильний пароль.')).toBeInTheDocument(),
    );
  });

  it('shows a generic error banner for a non-axios error', async () => {
    setupMutations({
      mutateImpl: (_data, opts) => opts?.onError?.(new Error('network down')),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Ел. адреса або номер телефону'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() =>
      expect(screen.getByText('Ви ввели неправильні облікові дані.')).toBeInTheDocument(),
    );
  });

  it('shows a generic error banner for an axios error with an unmapped status', async () => {
    setupMutations({
      mutateImpl: (_data, opts) =>
        opts?.onError?.({ isAxiosError: true, response: { status: 500, data: {} } }),
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText('Ел. адреса або номер телефону'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() =>
      expect(screen.getByText('Ви ввели неправильні облікові дані.')).toBeInTheDocument(),
    );
  });

  it('clears previous errors on a fresh submit attempt', async () => {
    let call = 0;
    setupMutations({
      mutateImpl: (_data, opts) => {
        call += 1;
        if (call === 1) {
          opts?.onError?.({ isAxiosError: true, response: { status: 401, data: {} } });
        } else {
          opts?.onSuccess?.();
        }
      },
    });
    const user = userEvent.setup();
    renderLoginForm();
    await user.type(screen.getByPlaceholderText('Ел. адреса або номер телефону'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));
    await waitFor(() =>
      expect(screen.getByText('Ви ввели неправильний пароль.')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('disables the submit button and shows a spinner while the mutation is pending', () => {
    setupMutations({ isPending: true });

    renderLoginForm();

    expect(screen.queryByRole('button', { name: 'Увійти' })).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('links "Забули пароль?" to the forgot-password page', async () => {
    setupMutations();
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByText('Забули пароль?'));

    expect(screen.getByText('Forgot password page')).toBeInTheDocument();
  });
});
