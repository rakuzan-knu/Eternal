import React from 'react';
import { Modal } from '@/shared/ui/Modal';
import { LoginForm } from '@/features/auth/ui/LoginForm';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import type { AuthResponse } from '@/features/auth/api/authApi';

interface AddAccountModalProps {
  onClose: () => void;
  onBack: () => void;
}

export function AddAccountModal({ onClose, onBack }: AddAccountModalProps) {
  const switchAccount = useAccountsStore((s) => s.switchAccount);

  const handleSuccess = (data: AuthResponse) => {
    switchAccount(data.user.id);
    window.location.href = '/feed';
  };

  return (
    <Modal onClose={onClose} onBack={onBack} title="Add account" widthClassName="max-w-sm">
      <p className="text-sm text-gray-400 mb-4">
        Sign in to another account to quickly switch between them on this device.
      </p>
      <LoginForm onSuccess={handleSuccess} redirectOnSuccess={false} />
    </Modal>
  );
}
