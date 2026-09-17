import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { apiClient } from '@/shared/api/httpClient';
import { checkoutApi } from '../checkoutApi';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: { post: vi.fn() },
}));

const postMock = apiClient.post as unknown as ReturnType<typeof vi.fn>;

describe('checkoutApi', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('posts to /checkout/:cartId and returns the response data', async () => {
    postMock.mockResolvedValueOnce({ data: { orderId: 'order-1' } });

    await expect(checkoutApi.checkout('cart-1')).resolves.toEqual({ orderId: 'order-1' });
    expect(postMock).toHaveBeenCalledWith('/checkout/cart-1');
  });

  it('maps an axios http error into a status message', async () => {
    const error = new AxiosError('Request failed with status code 500');
    error.response = { status: 500 } as AxiosError['response'];
    postMock.mockRejectedValueOnce(error);

    await expect(checkoutApi.checkout('cart-1')).rejects.toThrow(
      'Server responded with status 500',
    );
  });

  it('rethrows a non-axios error unchanged', async () => {
    postMock.mockRejectedValueOnce(new Error('boom'));

    await expect(checkoutApi.checkout('cart-1')).rejects.toThrow('boom');
  });
});
