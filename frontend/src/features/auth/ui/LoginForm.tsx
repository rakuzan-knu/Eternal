import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';
import { useAuthMutations } from '../api/useAuth';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import axios from 'axios';

const loginSchema = z.object({
  identity: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$|^[0-9]{10,12}$/;
      const cleanPhone = val.replace(/[\s\-()]/g, '');
      return emailRegex.test(val) || phoneRegex.test(cleanPhone);
    },
    {
      message: 'Введіть коректну електронну адресу або номер телефону.',
    },
  ),
  password: z.string().min(6, 'Пароль має містити щонайменше 6 символів.'),
});

type LoginFields = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
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

  const onSubmit = (data: LoginFields) => {
    setGlobalError(false);
    setUserNotFoundError(false);
    setWrongPasswordError(false);

    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate('/dashboard');
      },
      onError: (error) => {
        if (axios.isAxiosError<{ code?: string }>(error)) {
          const status = error.response?.status;
          const errorCode = error.response?.data?.code;

          if (status === 444 || errorCode === 'USER_NOT_FOUND') {
            setUserNotFoundError(true);
          } else if (status === 401 || errorCode === 'WRONG_PASSWORD') {
            setWrongPasswordError(true);
          } else {
            setGlobalError(true);
          }
        } else {
          // Обработка обычных ошибок (не Axios)
          setGlobalError(true);
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
      {globalError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-neutral-300 animate-fadeIn">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-left leading-relaxed">
            Ви ввели неправильні облікові дані.{' '}
            <Link to="/forgot-password" className="text-sky-400 hover:underline font-semibold">
              Знайдіть ваш обліковий запис та ввійдіть у систему
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full">
        <Input
          placeholder="Ел. адреса або номер телефону"
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
              Указана вами електронна адреса чи номер мобільного телефону не пов'язані із жодним
              обліковим записом.{' '}
              <Link to="/forgot-password" className="text-sky-400 hover:underline font-semibold">
                Знайдіть ваш обліковий запис та ввійдіть у систему
              </Link>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col w-full">
        <Input
          placeholder="Пароль"
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
            <span>Ви ввели неправильний пароль.</span>
          </div>
        )}
      </div>

      <Link
        to="/forgot-password"
        className="text-sm font-semibold text-purple-400 hover:underline self-start mt-0.5"
      >
        Забули пароль?
      </Link>

      <Button type="submit" className="mt-2" loading={loginMutation.isPending}>
        Увійти
      </Button>
    </form>
  );
};
