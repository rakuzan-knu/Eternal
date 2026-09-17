import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FindAccount } from '../FindAccount';
import { useAuthMutations } from '../../api/useAuth';
import { FoundUserResponse } from '../../model/types';

vi.mock('../../api/useAuth', () => ({
  useAuthMutations: vi.fn(),
}));

const mockedUseAuthMutations = vi.mocked(useAuthMutations);

function setupMutations(overrides?: {
  isPending?: boolean;
  mutateAsyncImpl?: (target: string) => Promise<FoundUserResponse>;
}) {
  const mutateAsync = vi.fn(
    overrides?.mutateAsyncImpl ??
      ((target: string) =>
        Promise.resolve({
          id: 'usr_9921',
          name: 'Alex Kovalenko',
          role: 'USER',
          maskedEmail: target.includes('@') ? target : 'a***@test.com',
          maskedPhone: !target.includes('@') ? target : '+380***',
        })),
  );
  mockedUseAuthMutations.mockReturnValue({
    loginMutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } as never,
    registerMutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } as never,
    findAccountMutation: {
      mutate: vi.fn(),
      mutateAsync,
      isPending: overrides?.isPending ?? false,
    } as never,
    resetMutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } as never,
  });
  return mutateAsync;
}

function getInput() {
  return screen.getByPlaceholderText('Email or number');
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /Continue|Search account.../ });
}

describe('FindAccount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the input and submit button', () => {
    setupMutations();
    render(<FindAccount onSuccess={vi.fn()} />);

    expect(getInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('shows a required-field error when submitting an empty input', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={vi.fn()} />);

    await user.click(getSubmitButton());

    expect(
      screen.getByText('Please enter your email address or phone number.'),
    ).toBeInTheDocument();
  });

  it('shows a format error for an input that is neither an email nor a phone number', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={vi.fn()} />);

    fireEvent.change(getInput(), { target: { value: 'not-a-valid-identifier' } });
    await user.click(getSubmitButton());

    expect(
      screen.getByText('Please enter the correct Email or phone number format.'),
    ).toBeInTheDocument();
  });

  it('clears a previous error as soon as the user edits the input again', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={vi.fn()} />);
    await user.click(getSubmitButton());
    expect(
      screen.getByText('Please enter your email address or phone number.'),
    ).toBeInTheDocument();

    fireEvent.change(getInput(), { target: { value: 'a' } });

    expect(
      screen.queryByText('Please enter your email address or phone number.'),
    ).not.toBeInTheDocument();
  });

  it('disables the input and shows a loading label while searching', async () => {
    setupMutations({ isPending: true });

    render(<FindAccount onSuccess={vi.fn()} />);

    expect(screen.getByText('Search account...')).toBeInTheDocument();
    expect(getInput()).toBeDisabled();
  });

  it('calls onSuccess with the mocked user payload for a valid email', async () => {
    setupMutations();
    const onSuccess = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={onSuccess} />);
    fireEvent.change(getInput(), { target: { value: 'user@example.com' } });

    await user.click(getSubmitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'usr_9921', name: 'Alex Kovalenko' }),
    );
  });

  it('calls onSuccess for a valid phone number', async () => {
    setupMutations();
    const onSuccess = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={onSuccess} />);
    fireEvent.change(getInput(), { target: { value: '0991234567' } });

    await user.click(getSubmitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('shows a not-found error when user does not exist, without calling onSuccess', async () => {
    setupMutations({
      mutateAsyncImpl: () =>
        Promise.reject({
          isAxiosError: true,
          response: { status: 404, data: {} },
        }),
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={onSuccess} />);
    fireEvent.change(getInput(), { target: { value: 'error@test.com' } });

    await user.click(getSubmitButton());

    await waitFor(
      () =>
        expect(
          screen.getByText('The user with this phone number or e-mail does not exist.'),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('re-enables the input after a not-found error so the user can retry', async () => {
    setupMutations({
      mutateAsyncImpl: () =>
        Promise.reject({
          isAxiosError: true,
          response: { status: 404, data: {} },
        }),
    });
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={vi.fn()} />);
    fireEvent.change(getInput(), { target: { value: 'error@test.com' } });
    await user.click(getSubmitButton());
    await waitFor(
      () =>
        expect(
          screen.getByText('The user with this phone number or e-mail does not exist.'),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );

    expect(getInput()).not.toBeDisabled();
  });

  it('clears the input value when the clear (X) button is clicked', async () => {
    setupMutations();
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={vi.fn()} />);
    fireEvent.change(getInput(), { target: { value: 'user@example.com' } });
    const clearButton = getInput().parentElement!.querySelector('button')!;

    await user.click(clearButton);

    expect(getInput()).toHaveValue('');
  });

  it('shows generic error for non-404 errors', async () => {
    setupMutations({
      mutateAsyncImpl: () => Promise.reject(new Error('Network error')),
    });
    const user = userEvent.setup({ delay: null });
    render(<FindAccount onSuccess={vi.fn()} />);
    fireEvent.change(getInput(), { target: { value: 'user@example.com' } });
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(
        screen.getByText('There was an error searching for your account. Please try again later.'),
      ).toBeInTheDocument();
    });
  });

  it('does not render the clear button when the input is empty', () => {
    setupMutations();
    render(<FindAccount onSuccess={vi.fn()} />);

    expect(getInput().parentElement!.querySelector('button')).not.toBeInTheDocument();
  });
});
