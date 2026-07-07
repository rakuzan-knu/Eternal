import React, { useState } from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { FoundUserResponse } from '../model/types';

interface FindAccountProps {
  onSuccess: (userData: FoundUserResponse) => void;
}

export const FindAccount: React.FC<FindAccountProps> = ({ onSuccess }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateInput = (value: string): 'email' | 'phone' | 'invalid' => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{1,14}$|^[0-9]{10,12}$/;

    const cleanValue = value.replace(/[\s\-()]/g, '');
    if (emailRegex.test(value)) return 'email';
    if (phoneRegex.test(cleanValue)) return 'phone';
    return 'invalid';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = inputValue.trim();

    if (!target) {
      setError('Будь ласка, введіть вашу електронну адресу або номер телефону.');
      return;
    }

    const inputType = validateInput(target);
    if (inputType === 'invalid') {
      setError('Введіть коректний формат Email або номера телефону.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // const response = await axios.post('/api/auth/find-account', { identity: target });
      // onSuccess(response.data);

      await new Promise((resolve) => setTimeout(resolve, 800));

      if (target === 'error@test.com' || target === '000') {
        throw new Error('Обліковий запис не знайдено. Перевірте дані та спробуйте ще раз.');
      }

      const mockBackendUser: FoundUserResponse = {
        id: 'usr_9921',
        name: 'Alex Kovalenko',
        role: 'Eternal User',
        emoji: '⚡',
        src: null,
        maskedEmail: target.includes('@')
          ? target.replace(/(?<=.).(?=.*@)/g, '•')
          : 'a••••••@gmail.com',
        maskedPhone: !target.includes('@') ? target.replace(/.(?=.{2})/g, '•') : '+••••••••32',
      };

      onSuccess(mockBackendUser);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Щось пішло не так. Спробуйте пізніше.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          disabled={isLoading}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Електронна пошта або номер"
          className={`w-full px-4 py-3 bg-[#121214]/60 rounded-xl border text-sm transition-all focus:outline-none placeholder-neutral-600 ${
            error
              ? 'border-red-500/80 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)] pr-10'
              : 'border-neutral-800/80 focus:border-purple-500/80'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {inputValue && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setError(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs px-1 animate-slideUp">
          <AlertCircle size={14} className="mt-[2px] flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Пошук аккаунту...
          </>
        ) : (
          'Продовжити'
        )}
      </Button>
    </form>
  );
};
