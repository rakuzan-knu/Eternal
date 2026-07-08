import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutButton } from '../CheckoutButton';

const CART_ID = 'cart-123';

function setup(
  overrides?: Partial<{ onSuccess: (orderId: string) => void; onError: (msg: string) => void }>,
) {
  const onSuccess = overrides?.onSuccess ?? vi.fn();
  const onError = overrides?.onError ?? vi.fn();
  const utils = render(<CheckoutButton cartId={CART_ID} onSuccess={onSuccess} onError={onError} />);
  const button = screen.getByTestId('checkout-btn');
  return { ...utils, button, onSuccess, onError };
}

function mockFetchResolvedOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
  fetchMock.mockResolvedValueOnce(response as Response);
}

describe('CheckoutButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders in the initial idle state', () => {
    const { button } = setup();

    expect(button).toHaveTextContent('Pay Now');
    expect(button).not.toBeDisabled();
  });

  it('calls fetch with the correct url, method and headers on click', async () => {
    mockFetchResolvedOnce({ ok: true, status: 200, json: async () => ({ orderId: 'order-1' }) });
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(`/api/checkout/${CART_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('calls onSuccess with the returned orderId on a successful checkout', async () => {
    mockFetchResolvedOnce({ ok: true, status: 200, json: async () => ({ orderId: 'order-42' }) });
    const { button, onSuccess, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('order-42'));
    expect(onError).not.toHaveBeenCalled();
  });

  it('resets to the idle "Pay Now" state after a successful checkout', async () => {
    mockFetchResolvedOnce({ ok: true, status: 200, json: async () => ({ orderId: 'order-42' }) });
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);
    await waitFor(() => expect(button).toHaveTextContent('Pay Now'));

    expect(button).not.toBeDisabled();
  });

  it('disables the button and shows "Processing..." while the request is pending', async () => {
    let resolveFetch: (value: Partial<Response>) => void = () => {};
    const pendingFetch = new Promise<Partial<Response>>((resolve) => {
      resolveFetch = resolve;
    });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      pendingFetch as Promise<Response>,
    );
    const { button } = setup();
    const user = userEvent.setup();

    const clickPromise = user.click(button);
    await waitFor(() => expect(button).toBeDisabled());

    expect(button).toHaveTextContent('Processing...');

    resolveFetch({ ok: true, status: 200, json: async () => ({ orderId: 'order-1' }) });
    await clickPromise;
  });

  it('calls onError with a descriptive message when the server responds with a 500 error', async () => {
    mockFetchResolvedOnce({ ok: false, status: 500, json: async () => ({}) });
    const { button, onSuccess, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Server responded with status 500'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('re-enables the button after a server error so the user can retry', async () => {
    mockFetchResolvedOnce({ ok: false, status: 500, json: async () => ({}) });
    const { button } = setup();
    const user = userEvent.setup();

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());

    expect(button).toHaveTextContent('Pay Now');
  });

  it('calls onError with the error message when fetch rejects (network failure)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error('Network Error'));
    const { button, onSuccess, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Network Error'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the thrown error has no message', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce({});
    const { button, onError } = setup();
    const user = userEvent.setup();

    await user.click(button);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Something went wrong'));
  });

  it('ignores a second rapid click while a checkout request is already in flight', async () => {
    let resolveFetch: (value: Partial<Response>) => void = () => {};
    const pendingFetch = new Promise<Partial<Response>>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockReturnValueOnce(pendingFetch as Promise<Response>);
    const { button } = setup();
    const user = userEvent.setup();

    const firstClick = user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);

    resolveFetch({ ok: true, status: 200, json: async () => ({ orderId: 'order-1' }) });
    await firstClick;

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('EDGE CASE: two clicks dispatched in the same synchronous batch both slip past the isLoading guard', async () => {
    let resolveFetch: (value: Partial<Response>) => void = () => {};
    const pendingFetch = new Promise<Partial<Response>>((resolve) => {
      resolveFetch = resolve;
    });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      pendingFetch as Promise<Response>,
    );
    const { button } = setup();

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    resolveFetch({ ok: true, status: 200, json: async () => ({ orderId: 'order-1' }) });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('FINDING: once committed, React itself refuses to dispatch onClick to a disabled button, making the isLoading early-return unreachable via any DOM click', async () => {
    let resolveFetch: (value: Partial<Response>) => void = () => {};
    const pendingFetch = new Promise<Partial<Response>>((resolve) => {
      resolveFetch = resolve;
    });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      pendingFetch as Promise<Response>,
    );
    const { button } = setup();
    const user = userEvent.setup();

    const firstClick = user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    (button as HTMLButtonElement).disabled = false;
    fireEvent.click(button);

    expect(fetch).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, status: 200, json: async () => ({ orderId: 'order-1' }) });
    await firstClick;
  });

  it('does not call fetch again once already resolved and clicked a second time sequentially', async () => {
    mockFetchResolvedOnce({ ok: true, status: 200, json: async () => ({ orderId: 'order-1' }) });
    mockFetchResolvedOnce({ ok: true, status: 200, json: async () => ({ orderId: 'order-2' }) });
    const { button, onSuccess } = setup();
    const user = userEvent.setup();

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenNthCalledWith(1, 'order-1');
    expect(onSuccess).toHaveBeenNthCalledWith(2, 'order-2');
  });
});
