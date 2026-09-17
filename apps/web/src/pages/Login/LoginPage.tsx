import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../shared/ui/GlassCard';
import { Button } from '../../shared/ui/Button';
import { AuthFooter } from '../../shared/ui/AuthFooter';
import { HeroSection } from './ui/LoginHeroSection';
import { FloatingCards } from './ui/FloatingCards';
import { LoginForm } from '../../features/auth/ui/LoginForm';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#050505] bg-radial-gradient flex flex-col items-center justify-between px-6 xl:px-12 relative overflow-hidden text-neutral-200 font-sans">
      <div className="hidden lg:flex absolute top-8 left-8 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center justify-center text-xl font-black text-white select-none">
        E
      </div>

      <main className="w-full max-w-7xl flex-1 flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr_1fr] gap-8 xl:gap-12 items-center justify-center py-6 lg:py-20 z-10">
        <div className="hidden lg:block w-full">
          <HeroSection />
        </div>

        <div className="hidden lg:flex flex justify-center lg:justify-start">
          <FloatingCards />
        </div>

        <div className="w-full max-w-[440px] flex flex-col gap-5 justify-self-center lg:justify-self-end animate-fadeIn">
          <div className="flex lg:hidden justify-center mb-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.35)] flex items-center justify-center text-xl font-black text-white select-none">
              E
            </div>
          </div>

          <GlassCard className="w-full">
            <div className="text-left mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-sm text-neutral-500 mt-1">Sign in to your account</p>
            </div>

            <LoginForm />

            <div className="flex items-center gap-3 my-5">
              <div className="h-[1px] bg-neutral-800 flex-1" />
              <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
                or
              </span>
              <div className="h-[1px] bg-neutral-800 flex-1" />
            </div>

            <Button variant="secondary" onClick={() => navigate('/register')}>
              Create new account
            </Button>
          </GlassCard>
        </div>
      </main>
      <AuthFooter />
    </div>
  );
};
