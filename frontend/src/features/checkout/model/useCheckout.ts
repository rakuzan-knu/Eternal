import { useMutation } from '@tanstack/react-query';
import { checkoutApi } from '../api/checkoutApi';

export function useCheckout() {
  return useMutation({
    mutationFn: (cartId: string) => checkoutApi.checkout(cartId),
  });
}
