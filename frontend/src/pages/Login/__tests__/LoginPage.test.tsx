import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../LoginPage';
import { useAuthMutations } from '../../../features/auth/api/useAuth';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../features/auth/api/useAuth', () => ({
  useAuthMutations: vi.fn(),
}));

const mockedUseAuthMutations = vi.mocked(useAuthMutations);

function renderLoginPage() {
  mockedUseAuthMutations.mockReturnValue({
    loginMutation: { mutate: vi.fn(), isPending: false } as never,
    registerMutation: { mutate: vi.fn(), isPending: false } as never,
    findAccountMutation: { mutate: vi.fn(), isPending: false } as never,
    resetMutation: { mutate: vi.fn(), isPending: false } as never,
  });

  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<div>Register page</div>} />
    </Routes>,
    { initialEntries: ['/login'] },
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the welcome heading and the login form', () => {
    renderLoginPage();

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ел. адреса або номер телефону')).toBeInTheDocument();
  });

  it('renders the hero section copy', () => {
    renderLoginPage();

    expect(
      screen.getByText('The place where ideas live and communities thrive.'),
    ).toBeInTheDocument();
  });

  it('renders the footer links', () => {
    renderLoginPage();

    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();
  });

  it('navigates to /register when "Create new account" is clicked', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText('Create new account'));

    expect(screen.getByText('Register page')).toBeInTheDocument();
  });
});
