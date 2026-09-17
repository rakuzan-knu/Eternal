import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { GlassCard } from '../../shared/ui/GlassCard';
import { Button } from '../../shared/ui/Button';
import { AuthFooter } from '../../shared/ui/AuthFooter';
import { RegisterForm } from '../../features/auth/ui/RegisterForm';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-between px-4 py-6 md:px-6 md:py-8 text-neutral-200 font-sans">
      <div className="flex-1 flex items-center justify-center w-full z-10 my-4">
        <div className="w-full max-w-[460px] flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center gap-3 pl-1 mb-1">
            <button
              onClick={() => navigate('/login')}
              className="w-8 h-8 rounded-full bg-[#111112] border border-neutral-800/60 flex items-center justify-center hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-sm font-black text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] select-none">
              E
            </div>
          </div>

          <GlassCard className="w-full">
            <div className="text-left mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Get started on Eternal
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Create an account to connect with friends and communities.
              </p>
            </div>

            <RegisterForm />

            <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate('/login')}>
              I already have an account
            </Button>
          </GlassCard>
        </div>
      </div>
      <AuthFooter />
    </div>
  );
};
