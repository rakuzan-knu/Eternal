import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { useForm, Controller, Control, UseFormSetValue, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';
import { Select } from '../../../shared/ui/Select';
import { Turnstile } from '../../../shared/ui/Turnstile';
import { useAuthMutations } from '../api/useAuth';
import { PasswordRequirements } from './PasswordRequirements';

import { RegisterPayload, AuthResponse } from '../api/authApi';
import { registerSchema, BIRTH_MONTHS, type RegisterFields } from '../model/registerSchema';
import { useCheckUsername } from '@/entities/profile/model/useCheckUsername';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useDebounce } from '@/shared/lib/useDebounce';

import { HelpCircle, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 151 }, (_, i) => String(CURRENT_YEAR - i));

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={text}
        aria-expanded={isOpen}
        className={`transition-colors focus-visible:outline-2 focus-visible:outline-purple-400 ${isOpen ? 'text-purple-400' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <HelpCircle size={15} />
      </button>
      {isOpen && (
        <div className="absolute z-30 bottom-full left-0 mb-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl max-w-xs text-xs text-neutral-300 animate-fadeIn">
          {text}
        </div>
      )}
    </div>
  );
};

const UsernameField: React.FC<{
  control: Control<RegisterFields>;
  isUsernameAvailable: boolean | undefined;
  isChecking: boolean;
}> = ({ control, isUsernameAvailable, isChecking }) => {
  return (
    <Controller
      control={control}
      name="username"
      render={({ field, fieldState: { error } }) => {
        const serverError =
          isUsernameAvailable === false ? 'This username is already taken.' : undefined;
        const displayError = error?.message || serverError;

        return (
          <Input
            {...field}
            label="Username"
            placeholder="@username"
            autoComplete="username"
            error={displayError}
            className={displayError ? 'border-red-500' : ''}
            rightElement={
              isChecking ? <Loader2 size={16} className="animate-spin text-neutral-500" /> : null
            }
            onChange={(e) => {
              let value = e.target.value;
              if (!value.startsWith('@')) value = '@' + value.replace(/@/g, '');
              field.onChange(value);
            }}
          />
        );
      }}
    />
  );
};

const BirthdayFields: React.FC<{
  control: Control<RegisterFields>;
  setValue: UseFormSetValue<RegisterFields>;
}> = ({ control, setValue }) => {
  const birthdayId = useId();
  const selectedMonth = useWatch({ control, name: 'birthMonth' });
  const selectedYear = useWatch({ control, name: 'birthYear' });
  const selectedDay = useWatch({ control, name: 'birthDay' });

  const daysInMonth = useMemo(() => {
    const monthIndex = BIRTH_MONTHS.findIndex((month) => month === selectedMonth);
    if (monthIndex === -1) return 31;
    const year = parseInt(selectedYear, 10) || 2000;
    return new Date(year, monthIndex + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (Number(selectedDay) > daysInMonth) {
      setValue('birthDay', '', { shouldValidate: true });
    }
  }, [selectedDay, daysInMonth, setValue]);

  const daysOptions = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  return (
    <div className="grid grid-cols-3 gap-2">
      <Controller
        control={control}
        name="birthMonth"
        render={({ field, fieldState: { error } }) => (
          <div className="min-w-0">
            <Select
              {...field}
              aria-label="Birth month"
              aria-invalid={!!error}
              aria-describedby={error ? `${birthdayId}-month-error` : undefined}
              options={[{ value: '', label: 'Month' }, ...BIRTH_MONTHS]}
            />
            {error && (
              <p
                id={`${birthdayId}-month-error`}
                role="alert"
                className="mt-1.5 text-xs text-red-400"
              >
                {error.message}
              </p>
            )}
          </div>
        )}
      />
      <Controller
        control={control}
        name="birthDay"
        render={({ field, fieldState: { error } }) => (
          <div className="min-w-0">
            <Select
              {...field}
              aria-label="Birth day"
              aria-invalid={!!error}
              aria-describedby={error ? `${birthdayId}-day-error` : undefined}
              options={[{ value: '', label: 'Day' }, ...daysOptions]}
            />
            {error && (
              <p
                id={`${birthdayId}-day-error`}
                role="alert"
                className="mt-1.5 text-xs text-red-400"
              >
                {error.message}
              </p>
            )}
          </div>
        )}
      />
      <Controller
        control={control}
        name="birthYear"
        render={({ field, fieldState: { error } }) => (
          <div className="min-w-0">
            <Select
              {...field}
              aria-label="Birth year"
              aria-invalid={!!error}
              aria-describedby={error ? `${birthdayId}-year-error` : undefined}
              options={[{ value: '', label: 'Year' }, ...YEARS]}
            />
            {error && (
              <p
                id={`${birthdayId}-year-error`}
                role="alert"
                className="mt-1.5 text-xs text-red-400"
              >
                {error.message}
              </p>
            )}
          </div>
        )}
      />
    </div>
  );
};

interface RegisterFormProps {
  onSuccess?: (data: AuthResponse) => void;
  redirectOnSuccess?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  redirectOnSuccess = true,
}) => {
  const { registerMutation } = useAuthMutations();
  const genderErrorId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isValid },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '@',
      birthMonth: '',
      birthDay: '',
      birthYear: '',
      gender: '',
      password: '',
      confirmPassword: '',
    },
  });

  const usernameValue = useWatch({ control, name: 'username' });
  const passwordValue = useWatch({ control, name: 'password' });
  const debouncedUsername = useDebounce(usernameValue, 500);

  const { data: usernameStatus, isFetching: isCheckingUsername } = useCheckUsername(
    debouncedUsername,
    !!debouncedUsername && debouncedUsername !== '@' && debouncedUsername.length >= 4,
  );

  const isUsernameTaken = usernameStatus?.isAvailable === false;

  const onSubmit = async (data: RegisterFields) => {
    if (isUsernameTaken) return;
    if (data.gender !== 'Male' && data.gender !== 'Female' && data.gender !== 'Custom') return;
    setServerError(null);

    const monthIndex = BIRTH_MONTHS.findIndex((month) => month === data.birthMonth);
    const birthDate = new Date(
      parseInt(data.birthYear, 10),
      monthIndex >= 0 ? monthIndex : 0,
      parseInt(data.birthDay, 10),
      12,
    ).toISOString();

    const cleanUsername = data.username.replace(/^@+/, '').trim();
    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim() || undefined;

    const payload: RegisterPayload = {
      email: data.identity.trim().toLowerCase(),
      username: cleanUsername,
      displayName,
      password: data.password,
      birthDate,
      gender: data.gender,
      turnstileToken,
    };

    registerMutation.mutate(payload, {
      onSuccess: (responseData: AuthResponse) => {
        localStorage.setItem('accessToken', responseData.accessToken);
        localStorage.removeItem('refreshToken');
        useAuthStore.getState().setAuth(responseData.user.id);
        useAccountsStore.getState().upsertAccount({
          id: responseData.user.id,
          username: responseData.user.username,
          displayName: responseData.user.displayName,
          avatar: responseData.user.avatar ?? null,
        });
        onSuccess?.(responseData);
        if (redirectOnSuccess) {
          navigate('/feed');
        }
      },
      onError: (error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message;

          if (status === 409) {
            setServerError(
              typeof message === 'string'
                ? message
                : 'This Email, phone number or username is already taken.',
            );
          } else if (status === 400) {
            if (Array.isArray(message)) {
              setServerError(message.join(', '));
            } else if (typeof message === 'string') {
              setServerError(message);
            } else {
              setServerError('Data validation error. Please check the entered fields.');
            }
          } else {
            setServerError(
              typeof message === 'string'
                ? message
                : 'The server is unavailable or an internal error has occurred. Please try again later.',
            );
          }
        } else {
          setServerError('An unexpected error occurred.');
        }
      },
    });
  };

  const isUsernameAvailable = usernameStatus?.isAvailable;
  const isFormDisabled = !isValid || isCheckingUsername || isUsernameAvailable === false;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 text-left w-full max-w-md mx-auto"
    >
      {serverError && (
        <div
          role="alert"
          className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-neutral-300 animate-fadeIn"
        >
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="text-left leading-relaxed">{serverError}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Name"
          placeholder="First name"
          autoComplete="given-name"
          autoCapitalize="words"
          autoCorrect="off"
          {...register('firstName', {
            onBlur: (e) => setValue('firstName', e.target.value.trim(), { shouldValidate: true }),
          })}
          error={errors.firstName?.message}
        />
        <Input
          label="Last name"
          placeholder="Last name"
          autoComplete="family-name"
          autoCapitalize="words"
          autoCorrect="off"
          {...register('lastName', {
            onBlur: (e) => setValue('lastName', e.target.value.trim(), { shouldValidate: true }),
          })}
          error={errors.lastName?.message}
        />
      </div>

      <UsernameField
        control={control}
        isUsernameAvailable={isUsernameAvailable}
        isChecking={isCheckingUsername}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Birthday
          </span>
          <InfoTooltip text="Providing your birthday helps make sure you get the right experience for your age." />
        </div>
        <BirthdayFields control={control} setValue={setValue} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Gender
          </span>
          <InfoTooltip text="You can change who sees your gender on your profile later." />
        </div>
        <Controller
          control={control}
          name="gender"
          render={({ field, fieldState: { error } }) => (
            <div>
              <Select
                {...field}
                aria-label="Gender"
                aria-invalid={!!error}
                aria-describedby={error ? genderErrorId : undefined}
                options={[{ value: '', label: 'Select gender' }, 'Male', 'Female', 'Custom']}
              />
              {error && (
                <p id={genderErrorId} role="alert" className="mt-1.5 text-xs text-red-400">
                  {error.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      <Input
        label="Mobile number or email"
        placeholder="Mobile number or email"
        autoComplete="email"
        {...register('identity', {
          onBlur: (e) => setValue('identity', e.target.value.trim(), { shouldValidate: true }),
        })}
        error={errors.identity?.message}
      />

      <Input
        label="Password"
        placeholder="New password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        aria-describedby="register-password-requirements"
        {...register('password', { deps: ['confirmPassword'] })}
        error={errors.password?.message}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="text-neutral-500 hover:text-neutral-300 transition-colors focus-visible:outline-2 focus-visible:outline-purple-400 flex items-center justify-center"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      <PasswordRequirements password={passwordValue || ''} />

      <Input
        label="Confirm Password"
        placeholder="Repeat your password"
        type={showConfirmPassword ? 'text' : 'password'}
        autoComplete="new-password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
        rightElement={
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            aria-pressed={showConfirmPassword}
            className="text-neutral-500 hover:text-neutral-300 transition-colors focus-visible:outline-2 focus-visible:outline-purple-400 flex items-center justify-center"
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      <p className="text-xs text-neutral-500 leading-relaxed mt-1">
        By creating an account, you agree to our{' '}
        <Link to="/terms" target="_blank" className="text-purple-400 font-medium hover:underline">
          Terms
        </Link>
        ,{' '}
        <Link to="/privacy" target="_blank" className="text-purple-400 font-medium hover:underline">
          Privacy Policy
        </Link>{' '}
        and{' '}
        <span className="text-purple-400 font-medium cursor-pointer hover:underline">
          Cookies Policy
        </span>
        .
      </p>

      <Turnstile onVerify={(token) => setTurnstileToken(token)} size="invisible" />

      <Button
        type="submit"
        className={`mt-4 transition-all duration-200 ${isFormDisabled ? 'opacity-40 cursor-not-allowed select-none' : 'active:scale-[0.98]'}`}
        loading={registerMutation.isPending}
        disabled={isFormDisabled}
      >
        Create Account
      </Button>
    </form>
  );
};
