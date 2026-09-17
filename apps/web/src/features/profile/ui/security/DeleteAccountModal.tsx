import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Loader2, X, Trash2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '@/shared/ui/Modal';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useUIStore } from '@/shared/model/useUIStore';
import { useDeleteAccount } from '../../model/useDeleteAccount';

interface DeleteAccountModalProps {
  onClose: () => void;
}

export default function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const deleteAccountMutation = useDeleteAccount();
  const closeEditProfile = useUIStore((s) => s.closeEditProfile);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const canSubmit = password.length > 0 && !deleteAccountMutation.isPending;

  const fail = (message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  };

  const handleSubmit = (requestClose: () => void) => async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit || !currentUser?.id) return;

    try {
      await deleteAccountMutation.mutateAsync({
        userId: currentUser.id,
        password,
      });

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      useAuthStore.getState().clearAuth();

      const activeId = useAccountsStore.getState().activeAccountId;
      if (activeId === currentUser.id) {
        useAccountsStore.getState().removeAccount(currentUser.id);
      }

      queryClient.clear();
      requestClose();
      closeEditProfile();

      navigate('/login', { replace: true });
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 401) {
        fail('Incorrect password. Please enter your valid password to confirm deletion.');
      } else {
        fail('Failed to delete account. Please try again later.');
      }
    }
  };

  const inputCls =
    'w-full h-11 pl-4 pr-11 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 transition-colors';

  return (
    <Modal onClose={onClose}>
      {(requestClose) => (
        <form
          key={shakeKey}
          onSubmit={handleSubmit(requestClose)}
          className={`w-full max-w-md rounded-3xl border border-red-500/20 bg-[#161618] shadow-2xl p-7 relative ${
            error ? 'animate-shake' : ''
          }`}
        >
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
              <Trash2 size={26} />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Account</h2>
            <p className="text-xs text-gray-400 mt-1">
              Are you sure you want to permanently delete your account?
            </p>
          </div>

          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200/90 text-xs leading-relaxed flex gap-3 items-start">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300 mb-1">This action cannot be undone.</p>
              <p>
                All of your profile details, messages, posts, comments, and media will be
                permanently removed. Your username{' '}
                <span className="font-mono text-red-300 font-bold">
                  @{currentUser?.username || 'user'}
                </span>{' '}
                will be freed and made available for anyone else to use.
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Confirm your password
              </label>
              <div className="relative">
                <input
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  maxLength={256}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium text-center bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestClose}
              className="flex-1 h-11 rounded-2xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 h-11 rounded-2xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
            >
              {deleteAccountMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
