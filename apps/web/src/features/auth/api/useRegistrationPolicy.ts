import { useQuery } from '@tanstack/react-query';
import { authApi } from './authApi';

export function useRegistrationPolicy() {
  return useQuery({
    queryKey: ['auth', 'registration-policy'],
    queryFn: ({ signal }) => authApi.registrationPolicy(signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
