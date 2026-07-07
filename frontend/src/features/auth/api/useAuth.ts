import { useMutation } from '@tanstack/react-query';
import { authApi } from './authApi';

export const useAuthMutations = () => {
  const loginMutation = useMutation({ mutationFn: authApi.login });
  const registerMutation = useMutation({ mutationFn: authApi.register });
  const findAccountMutation = useMutation({ mutationFn: authApi.findAccount });
  const resetMutation = useMutation({ mutationFn: authApi.resetPassword });

  return { loginMutation, registerMutation, findAccountMutation, resetMutation };
};
