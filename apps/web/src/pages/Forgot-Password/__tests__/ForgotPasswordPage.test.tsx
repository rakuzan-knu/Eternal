import { fireEvent, screen } from '@testing-library/react';
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
  fireEvent.change(screen.getByPlaceholderText('Email or number'), {
    target: { value: 'user@example.com' },
  });
  await user.click(screen.getByText('Continue'));
  expect(await screen.findByText('Alex Kovalenko')).toBeInTheDocument();
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

    expect(screen.getByText('Find your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email or number')).toBeInTheDocument();
  });

  it('navigates to /login when the back button is clicked on step 1', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPasswordPage();

    await user.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('advances to step 2 (reset method) once an account is found', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPasswordPage();

    await advanceToStep2(user);

    expect(screen.getByText('Alex Kovalenko')).toBeInTheDocument();
  });

  it('goes back to step 1 (without navigating away) when the back button is clicked on step 2', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPasswordPage();
    await advanceToStep2(user);

    await user.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('Find your account')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('returns to step 1 when ResetMethod reports "Isn\'t that you?"', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPasswordPage();
    await advanceToStep2(user);

    await user.click(screen.getByText("Isn't that you?"));

    expect(screen.getByText('Find your account')).toBeInTheDocument();
  });

  it('renders the footer on both steps', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPasswordPage();
    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();

    await advanceToStep2(user);

    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();
  });
});
