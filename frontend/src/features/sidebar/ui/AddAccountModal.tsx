import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { LoginForm } from '@/features/auth/ui/LoginForm';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import type { AuthResponse } from '@/features/auth/api/authApi';

interface AddAccountModalProps {
  onClose: () => void;
  onBack: () => void;
}

export function AddAccountModal({ onClose, onBack }: AddAccountModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const switchAccount = useAccountsStore((s) => s.switchAccount);
  const navigate = useNavigate();

  const handleSuccess = (data: AuthResponse) => {
    switchAccount(data.user.id);
    onClose();
    navigate('/feed');
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="text-lg font-bold text-white">Add account</h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Segmented Control */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            {tab === 'login'
              ? 'Sign in to an existing account to quickly switch between them.'
              : 'Create a new account and link it to this device.'}
          </p>

          {tab === 'login' ? (
            <LoginForm onSuccess={handleSuccess} redirectOnSuccess={false} />
          ) : (
            <RegisterForm onSuccess={handleSuccess} redirectOnSuccess={false} />
          )}
        </div>
      )}
    </Modal>
  );
}
