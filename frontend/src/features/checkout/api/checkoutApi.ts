import axios from 'axios';
import { apiClient as api } from '@/shared/api/httpClient';

export interface CheckoutResponse {
  orderId: string;
}

export const checkoutApi = {
  checkout: async (cartId: string): Promise<CheckoutResponse> => {
    try {
      const { data } = await api.post<CheckoutResponse>(`/checkout/${cartId}`);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Server responded with status ${error.response.status}`, { cause: error });
      }
      throw error;
    }
  },
};
