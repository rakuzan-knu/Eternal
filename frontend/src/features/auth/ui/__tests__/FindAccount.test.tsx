import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FindAccount } from '../FindAccount';

function getInput() {
  return screen.getByPlaceholderText('Електронна пошта або номер');
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /Продовжити|Пошук аккаунту/ });
}

describe('FindAccount', () => {
  it('renders the input and submit button', () => {
    render(<FindAccount onSuccess={vi.fn()} />);

    expect(getInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Продовжити' })).toBeInTheDocument();
  });

  it('shows a required-field error when submitting an empty input', async () => {
    const user = userEvent.setup();
    render(<FindAccount onSuccess={vi.fn()} />);

    await user.click(getSubmitButton());

    expect(
      screen.getByText('Будь ласка, введіть вашу електронну адресу або номер телефону.'),
    ).toBeInTheDocument();
  });

  it('shows a format error for an input that is neither an email nor a phone number', async () => {
    const user = userEvent.setup();
    render(<FindAccount onSuccess={vi.fn()} />);

    await user.type(getInput(), 'not-a-valid-identifier');
    await user.click(getSubmitButton());

    expect(
      screen.getByText('Введіть коректний формат Email або номера телефону.'),
    ).toBeInTheDocument();
  });

  it('clears a previous error as soon as the user edits the input again', async () => {
    const user = userEvent.setup();
    render(<FindAccount onSuccess={vi.fn()} />);
    await user.click(getSubmitButton());
    expect(
      screen.getByText('Будь ласка, введіть вашу електронну адресу або номер телефону.'),
    ).toBeInTheDocument();

    await user.type(getInput(), 'a');

    expect(
      screen.queryByText('Будь ласка, введіть вашу електронну адресу або номер телефону.'),
    ).not.toBeInTheDocument();
  });

  it('disables the input and shows a loading label while searching', async () => {
    const user = userEvent.setup();
    render(<FindAccount onSuccess={vi.fn()} />);
    await user.type(getInput(), 'user@example.com');

    await user.click(getSubmitButton());

    expect(screen.getByText('Пошук аккаунту...')).toBeInTheDocument();
    expect(getInput()).toBeDisabled();

    await waitFor(() => expect(getInput()).not.toBeDisabled(), { timeout: 2000 });
  });

  it('calls onSuccess with the mocked user payload for a valid email', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<FindAccount onSuccess={onSuccess} />);
    await user.type(getInput(), 'user@example.com');

    await user.click(getSubmitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'usr_9921', name: 'Alex Kovalenko' }),
    );
  });

  it('calls onSuccess for a valid phone number', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<FindAccount onSuccess={onSuccess} />);
    await user.type(getInput(), '0991234567');

    await user.click(getSubmitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('shows a not-found error for the special error-triggering email, without calling onSuccess', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<FindAccount onSuccess={onSuccess} />);
    await user.type(getInput(), 'error@test.com');

    await user.click(getSubmitButton());

    await waitFor(
      () =>
        expect(
          screen.getByText('Обліковий запис не знайдено. Перевірте дані та спробуйте ще раз.'),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('re-enables the input after a not-found error so the user can retry', async () => {
    const user = userEvent.setup();
    render(<FindAccount onSuccess={vi.fn()} />);
    await user.type(getInput(), 'error@test.com');
    await user.click(getSubmitButton());
    await waitFor(
      () =>
        expect(
          screen.getByText('Обліковий запис не знайдено. Перевірте дані та спробуйте ще раз.'),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    );

    expect(getInput()).not.toBeDisabled();
  });

  it('clears the input value when the clear (X) button is clicked', async () => {
    const user = userEvent.setup();
    render(<FindAccount onSuccess={vi.fn()} />);
    await user.type(getInput(), 'user@example.com');
    const clearButton = getInput().parentElement!.querySelector('button')!;

    await user.click(clearButton);

    expect(getInput()).toHaveValue('');
  });

  it('does not render the clear button when the input is empty', () => {
    render(<FindAccount onSuccess={vi.fn()} />);

    expect(getInput().parentElement!.querySelector('button')).not.toBeInTheDocument();
  });
});
