import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutButton } from '../CheckoutButton';
import { checkoutApi } from '../../api/checkoutApi';

vi.mock('../../api/checkoutApi', () => ({
  checkoutApi: { checkout: vi.fn() },
}));

const checkoutMock = checkoutApi.checkout as unknown as ReturnType<typeof vi.fn>;
const CART_ID = 'cart-123';

function setup(
  overrides?: Partial<{ onSuccess: (orderId: string) => void; onError: (msg: string) => void }>,
) {
  const onSuccess = overrides?.onSuccess ?? vi.fn();
  const onError = overrides?.onError ?? vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CheckoutButton cartId={CART_ID} onSuccess={onSuccess} onError={onError} />
    </QueryClientProvider>,
  );
  const button = screen.getByTestId('checkout-btn');
  return { ...utils, button, onSuccess, onError };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('CheckoutButton', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders in the initial idle state', () => {
    const { button } = setup();

    expect(button).toHaveTextContent('Pay Now');
    expect(button).not.toBeDisabled();
  });

  it('calls checkoutApi with the cart id on click', async () => {
    checkoutMock.mockResolvedValueOnce({ orderId: 'order-1' });
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalledTimes(1));
    expect(checkoutMock).toHaveBeenCalledWith(CART_ID);
  });

  it('calls onSuccess with the returned orderId on a successful checkout', async () => {
    checkoutMock.mockResolvedValueOnce({ orderId: 'order-42' });
    const { button, onSuccess, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('order-42'));
    expect(onError).not.toHaveBeenCalled();
  });

  it('resets to the idle "Pay Now" state after a successful checkout', async () => {
    checkoutMock.mockResolvedValueOnce({ orderId: 'order-42' });
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);
    await waitFor(() => expect(button).toHaveTextContent('Pay Now'));

    expect(button).not.toBeDisabled();
  });

  it('disables the button and shows "Processing..." while the request is pending', async () => {
    const pending = deferred<{ orderId: string }>();
    checkoutMock.mockReturnValueOnce(pending.promise);
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent('Processing...');

    pending.resolve({ orderId: 'order-1' });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('calls onError with the status message when the request fails', async () => {
    checkoutMock.mockRejectedValueOnce(new Error('Server responded with status 500'));
    const { button, onSuccess, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Server responded with status 500'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('re-enables the button after an error so the user can retry', async () => {
    checkoutMock.mockRejectedValueOnce(new Error('Server responded with status 500'));
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());

    expect(button).toHaveTextContent('Pay Now');
  });

  it('falls back to a generic message when the rejection is not an Error', async () => {
    checkoutMock.mockRejectedValueOnce({});
    const { button, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Something went wrong'));
  });
});
