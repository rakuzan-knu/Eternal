import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '../RegisterPage';
import { useAuthMutations } from '../../../features/auth/api/useAuth';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../features/auth/api/useAuth', () => ({
  useAuthMutations: vi.fn(),
}));

const mockedUseAuthMutations = vi.mocked(useAuthMutations);

function renderRegisterPage() {
  mockedUseAuthMutations.mockReturnValue({
    loginMutation: { mutate: vi.fn(), isPending: false } as never,
    registerMutation: { mutate: vi.fn(), isPending: false } as never,
    findAccountMutation: { mutate: vi.fn(), isPending: false } as never,
    resetMutation: { mutate: vi.fn(), isPending: false } as never,
  });

  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { initialEntries: ['/register'] },
  );
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the heading and the register form', () => {
    renderRegisterPage();

    expect(screen.getByText('Get started on Eternal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
  });

  it('navigates back to /login when the back-chevron button is clicked', async () => {
    const user = userEvent.setup();
    renderRegisterPage();
    const backButton = screen.getAllByRole('button')[0];

    await user.click(backButton);

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('navigates to /login when "I already have an account" is clicked', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByText('I already have an account'));

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders the footer', () => {
    renderRegisterPage();

    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();
  });
});
