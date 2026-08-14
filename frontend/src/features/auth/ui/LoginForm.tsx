import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';
import { useAuthMutations } from '../api/useAuth';
import type { AuthResponse } from '../api/authApi';
import { loginSchema, type LoginFields } from '../model/loginSchema';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface LoginFormProps {
  onSuccess?: (data: AuthResponse) => void;
  redirectOnSuccess?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, redirectOnSuccess = true }) => {
  const [showPass, setShowPass] = useState(false);

  const [globalError, setGlobalError] = useState<boolean>(false);
  const [userNotFoundError, setUserNotFoundError] = useState<boolean>(false);
  const [wrongPasswordError, setWrongPasswordError] = useState<boolean>(false);

  const { loginMutation } = useAuthMutations();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFields) => {
    try {
      setUserNotFoundError(false);
      setWrongPasswordError(false);
      setGlobalError(false);

      const rawIdentity = data.identity.trim();
      const payload = {
        email: rawIdentity.toLowerCase(),
        identity: rawIdentity,
        password: data.password,
      };

      const responseData = await loginMutation.mutateAsync(payload);

      localStorage.setItem('accessToken', responseData.accessToken);
      localStorage.setItem('refreshToken', responseData.refreshToken);

      useAuthStore.getState().setAuth(responseData.user.id);

      useAccountsStore.getState().upsertAccount({
        id: responseData.user.id,
        username: responseData.user.username,
        displayName: responseData.user.displayName,
        avatar: responseData.user.avatar ?? null,
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
      });

      onSuccess?.(responseData);
      if (redirectOnSuccess) navigate('/feed');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const serverMessage = error.response.data?.message;

        if (serverMessage === 'USER_NOT_FOUND') {
          setUserNotFoundError(true);
        } else if (serverMessage === 'INVALID_PASSWORD') {
          setWrongPasswordError(true);
        } else {
          setGlobalError(true);
        }
      } else {
        setGlobalError(true);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
      {globalError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-neutral-300 animate-fadeIn">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-left leading-relaxed">
            You entered incorrect credentials.{' '}
            <Link to="/forgot-password" className="text-sky-400 hover:underline font-semibold">
              Find your account and log in
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full">
        <Input
          placeholder="Email address or phone number"
          {...register('identity')}
          className={
            userNotFoundError
              ? 'border-red-500 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
              : ''
          }
          error={errors.identity?.message}
        />

        {userNotFoundError && (
          <div className="text-xs text-red-500/90 flex items-start gap-1.5 px-1 mt-1 text-left leading-relaxed animate-slideUp">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              The email address or mobile phone number you provided is not associated with any
              account.{' '}
              <Link to="/forgot-password" className="text-sky-400 hover:underline font-semibold">
                Find your account and log in
              </Link>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col w-full">
        <Input
          placeholder="Password"
          type={showPass ? 'text' : 'password'}
          {...register('password')}
          className={
            wrongPasswordError
              ? 'border-red-500 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
              : ''
          }
          error={errors.password?.message}
          rightElement={
            showPass ? (
              <EyeOff
                size={18}
                className="cursor-pointer text-neutral-500 hover:text-neutral-300"
                onClick={() => setShowPass(false)}
              />
            ) : (
              <Eye
                size={18}
                className="cursor-pointer text-neutral-500 hover:text-neutral-300"
                onClick={() => setShowPass(true)}
              />
            )
          }
        />

        {wrongPasswordError && (
          <div className="text-xs text-red-500/90 flex items-start gap-1.5 px-1 mt-1 text-left animate-slideUp">
            <AlertCircle size={14} className="mt-[2px] flex-shrink-0" />
            <span>You entered an incorrect password.</span>
          </div>
        )}
      </div>

      <Link
        to="/forgot-password"
        className="text-sm font-semibold text-purple-400 hover:underline self-start mt-0.5"
      >
        Forgot password?
      </Link>

      <Button type="submit" className="mt-2" loading={loginMutation.isPending}>
        Log in
      </Button>
    </form>
  );
};
