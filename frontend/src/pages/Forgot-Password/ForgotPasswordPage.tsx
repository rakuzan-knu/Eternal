import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { GlassCard } from '../../shared/ui/GlassCard';
import { AuthFooter } from '../../shared/ui/AuthFooter';
import { FindAccount } from '../../features/auth/ui/FindAccount';
import { ResetMethod } from '../../features/auth/ui/ResetMethod';
import { FoundUserResponse } from '../../features/auth/model/types';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [matchedUser, setMatchedUser] = useState<FoundUserResponse | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-between px-6 py-8 text-neutral-200 font-sans">
      <div className="flex-1 flex items-center justify-center w-full z-10 mt-6">
        <div className="w-full max-w-[460px] flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center gap-3 pl-1">
            <button
              onClick={() => (step === 2 ? setStep(1) : navigate('/login'))}
              className="w-8 h-8 rounded-full bg-[#111112] border border-neutral-800/60 flex items-center justify-center hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-sm font-black text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] select-none">
              E
            </div>
          </div>

          <GlassCard className="w-full">
            <div className="text-left mb-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {step === 1 ? 'Знайти ваш акаунт' : 'Оберіть спосіб скидання'}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {step === 1
                  ? 'Введіть номер мобільного або адресу електронної пошти.'
                  : 'Оберіть спосіб отримання коду підтвердження.'}
              </p>
            </div>

            {step === 1 || !matchedUser ? (
              <FindAccount
                onSuccess={(userPayload) => {
                  setMatchedUser(userPayload);
                  setStep(2);
                }}
              />
            ) : (
              <ResetMethod
                user={matchedUser}
                onCancel={() => {
                  setMatchedUser(null);
                  setStep(1);
                }}
              />
            )}
          </GlassCard>
        </div>
      </div>
      <AuthFooter />
    </div>
  );
};
