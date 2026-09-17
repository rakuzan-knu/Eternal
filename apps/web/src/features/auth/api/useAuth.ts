import { useMutation } from '@tanstack/react-query';
import { authApi } from './authApi';

export const useAuthMutations = () => {
  const loginMutation = useMutation({
    mutationFn: (data: Parameters<typeof authApi.login>[0]) => authApi.login(data),
  });
  const registerMutation = useMutation({
    mutationFn: (data: Parameters<typeof authApi.register>[0]) => authApi.register(data),
  });
  const findAccountMutation = useMutation({
    mutationFn: (identifier: string) => authApi.findAccount(identifier),
  });
  const resetMutation = useMutation({
    mutationFn: (data: Parameters<typeof authApi.resetPassword>[0]) => authApi.resetPassword(data),
  });

  return { loginMutation, registerMutation, findAccountMutation, resetMutation };
};
