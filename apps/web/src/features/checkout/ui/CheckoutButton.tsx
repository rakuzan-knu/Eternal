import React from 'react';
import { useCheckout } from '../model/useCheckout';

interface CheckoutProps {
  cartId: string;
  onSuccess: (orderId: string) => void;
  onError: (errorMsg: string) => void;
}

export const CheckoutButton: React.FC<CheckoutProps> = ({ cartId, onSuccess, onError }) => {
  const { mutate, isPending } = useCheckout();

  const handleCheckout = () => {
    if (isPending) return;
    mutate(cartId, {
      onSuccess: (data) => onSuccess(data.orderId),
      onError: (error) => onError(error instanceof Error ? error.message : 'Something went wrong'),
    });
  };

  return (
    <button onClick={handleCheckout} disabled={isPending} data-testid="checkout-btn">
      {isPending ? 'Processing...' : 'Pay Now'}
    </button>
  );
};
