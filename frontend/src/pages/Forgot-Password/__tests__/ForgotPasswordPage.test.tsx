import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { renderWithProviders } from '../../../test/renderWithProviders';

function renderForgotPasswordPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { initialEntries: ['/forgot-password'] },
  );
}

async function advanceToStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Електронна пошта або номер'), 'user@example.com');
  await user.click(screen.getByText('Продовжити'));
  await waitFor(() => expect(screen.getByText('Оберіть спосіб скидання')).toBeInTheDocument(), {
    timeout: 2000,
  });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders step 1 (find account) by default', () => {
    renderForgotPasswordPage();

    expect(screen.getByText('Знайти ваш акаунт')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Електронна пошта або номер')).toBeInTheDocument();
  });

  it('navigates to /login when the back button is clicked on step 1', async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();

    await user.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('advances to step 2 (reset method) once an account is found', async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();

    await advanceToStep2(user);

    expect(screen.getByText('Alex Kovalenko')).toBeInTheDocument();
  });

  it('goes back to step 1 (without navigating away) when the back button is clicked on step 2', async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();
    await advanceToStep2(user);

    await user.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('Знайти ваш акаунт')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('returns to step 1 when ResetMethod reports "Це не ви?"', async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();
    await advanceToStep2(user);

    await user.click(screen.getByText('Це не ви?'));

    expect(screen.getByText('Знайти ваш акаунт')).toBeInTheDocument();
  });

  it('renders the footer on both steps', async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();
    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();

    await advanceToStep2(user);

    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();
  });
});
