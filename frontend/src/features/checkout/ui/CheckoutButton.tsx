import React, { useState } from 'react';

interface CheckoutProps {
  cartId: string;
  onSuccess: (orderId: string) => void;
  onError: (errorMsg: string) => void;
}

export const CheckoutButton: React.FC<CheckoutProps> = ({ cartId, onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/checkout/${cartId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      onSuccess(data.orderId);
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={isLoading} data-testid="checkout-btn">
      {isLoading ? 'Processing...' : 'Pay Now'}
    </button>
  );
};
