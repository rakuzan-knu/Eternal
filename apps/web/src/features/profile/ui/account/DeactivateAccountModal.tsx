import React, { useState, useMemo } from 'react';
import {
  Lock,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  X,
  ChevronRight,
  Minus,
  Plus,
  Infinity as InfinityIcon,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/shared/ui/Modal';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useUpdatePrivacy } from '../../model/usePrivacy';
import { useUpdateShowcase } from '@/entities/showcase/model/useShowcase';
import { ShowcasePrivacy } from '@backend/common/contracts';
import { securityApi } from '../../api/securityApi';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

function addToast(title: string, body: string) {
  useMessageToastStore.getState().addToast({
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversationId: '',
    messageId: '',
    title,
    body,
    avatar: null,
    memberAvatars: [],
    isGroup: false,
  });
}

interface DeactivateAccountModalProps {
  onClose: () => void;
}

export type DeactivateUnit = 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'forever';

interface UnitConfig {
  id: DeactivateUnit;
  label: string;
  presets: number[];
  min: number;
  max: number;
  multiplierMs: number;
}

const UNITS: UnitConfig[] = [
  {
    id: 'hours',
    label: 'Hours',
    presets: [1, 2, 4, 8, 12, 24],
    min: 1,
    max: 72,
    multiplierMs: 3600 * 1000,
  },
  {
    id: 'days',
    label: 'Days',
    presets: [1, 2, 3, 5, 7, 14],
    min: 1,
    max: 90,
    multiplierMs: 24 * 3600 * 1000,
  },
  {
    id: 'weeks',
    label: 'Weeks',
    presets: [1, 2, 3, 4],
    min: 1,
    max: 52,
    multiplierMs: 7 * 24 * 3600 * 1000,
  },
  {
    id: 'months',
    label: 'Months',
    presets: [1, 2, 3, 6],
    min: 1,
    max: 24,
    multiplierMs: 30 * 24 * 3600 * 1000,
  },
  {
    id: 'years',
    label: 'Years',
    presets: [1, 2, 3, 5],
    min: 1,
    max: 10,
    multiplierMs: 365 * 24 * 3600 * 1000,
  },
  { id: 'forever', label: 'Indefinitely', presets: [], min: 0, max: 0, multiplierMs: 0 },
];

export function formatDurationLabel(unit: DeactivateUnit, amount: number): string {
  if (unit === 'forever') return 'Indefinitely';
  if (unit === 'hours') return amount === 1 ? '1 hour' : `${amount} hours`;
  if (unit === 'days') return amount === 1 ? '1 day' : `${amount} days`;
  if (unit === 'weeks') return amount === 1 ? '1 week' : `${amount} weeks`;
  if (unit === 'months') return amount === 1 ? '1 month' : `${amount} months`;
  if (unit === 'years') return amount === 1 ? '1 year' : `${amount} years`;
  return `${amount}`;
}

export default function DeactivateAccountModal({ onClose }: DeactivateAccountModalProps) {
  const { data: currentUser } = useCurrentUser();
  const updatePrivacyMutation = useUpdatePrivacy();
  const updateShowcaseMutation = useUpdateShowcase(currentUser?.username || '');

  const [step, setStep] = useState<'password' | 'duration'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duration configuration
  const [selectedUnit, setSelectedUnit] = useState<DeactivateUnit>('days');
  const [amount, setAmount] = useState<number>(7);

  const activeUnitConfig = useMemo(
    () => UNITS.find((u) => u.id === selectedUnit) || UNITS[1],
    [selectedUnit],
  );

  const handleUnitChange = (unit: DeactivateUnit) => {
    setSelectedUnit(unit);
    setError(null);
    const cfg = UNITS.find((u) => u.id === unit);
    if (!cfg || unit === 'forever') {
      setAmount(0);
      return;
    }
    if (cfg.presets.length > 0) {
      setAmount(cfg.presets[0]);
    } else {
      setAmount(cfg.min);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError('Please enter your password to confirm.');
      setShakeKey((k) => k + 1);
      return;
    }

    setIsVerifying(true);
    try {
      await securityApi.verifyPassword(password);
      setStep('duration');
    } catch {
      setError('Incorrect password. Please verify your credentials.');
      setShakeKey((k) => k + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  const targetDate = useMemo(() => {
    if (selectedUnit === 'forever') return null;
    const ms = amount * activeUnitConfig.multiplierMs;
    return new Date(Date.now() + ms);
  }, [selectedUnit, amount, activeUnitConfig]);

  const formattedTargetDate = useMemo(() => {
    if (!targetDate) return 'Until manually restored';
    try {
      return new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(targetDate);
    } catch {
      return targetDate.toLocaleString();
    }
  }, [targetDate]);

  const handleConfirmDeactivation = async (requestClose: () => void) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Set account privacy to true
      await updatePrivacyMutation.mutateAsync({ isPrivate: true });

      // 2. Set all showcase privacy tiers to PRIVATE
      await updateShowcaseMutation.mutateAsync({
        privacyMeta: ShowcasePrivacy.PRIVATE,
        privacyActivity: ShowcasePrivacy.PRIVATE,
        privacyShowcase: ShowcasePrivacy.PRIVATE,
        privacyLinks: ShowcasePrivacy.PRIVATE,
      });

      // 3. Store deactivation metadata in client storage for status banner / resume logic
      const deactivationPayload = {
        deactivatedAt: new Date().toISOString(),
        until: targetDate ? targetDate.toISOString() : 'FOREVER',
        unit: selectedUnit,
        amount,
        durationLabel: formatDurationLabel(selectedUnit, amount),
      };
      localStorage.setItem('account_deactivation_info', JSON.stringify(deactivationPayload));

      addToast(
        'Account Deactivated',
        `Your profile and showcases are now hidden from other users (${formatDurationLabel(
          selectedUnit,
          amount,
        )}).`,
      );

      requestClose();
    } catch (err: unknown) {
      console.error('Deactivation error:', err);
      setError('Failed to deactivate account. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      {(requestClose) => (
        <div
          className={`w-full max-w-lg glass-modal border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-7 relative text-gray-950 dark:text-white backdrop-blur-2xl transition-all duration-200 ${
            error ? 'animate-shake' : ''
          }`}
          key={shakeKey}
        >
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-90 z-20 cursor-pointer"
          >
            <X size={17} />
          </button>

          <AnimatePresence mode="wait">
            {step === 'password' ? (
              <motion.div
                key="step-password"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-500 shadow-xs">
                    <Lock size={26} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                    Deactivate Account
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-xs leading-relaxed">
                    For your security, please enter your account password to continue.
                  </p>
                </div>

                <form onSubmit={handleVerifyPassword} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Your Password
                    </label>
                    <div className="relative">
                      <input
                        autoFocus
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        placeholder="Enter your current password"
                        className="w-full h-11 pl-4 pr-11 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium text-center">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={requestClose}
                      className="flex-1 h-11 rounded-2xl text-xs sm:text-sm font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying || !password.trim()}
                      className="flex-1 h-11 rounded-2xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-amber-900/20 cursor-pointer"
                    >
                      {isVerifying ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <span>Next</span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step-duration"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-start gap-3.5 pb-3 border-b border-black/8 dark:border-white/[0.06]">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Clock size={22} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-lg font-bold text-gray-950 dark:text-white leading-snug">
                      Deactivation Duration
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                      During this period, your profile, showcases, and activity will be hidden from
                      other users.
                    </p>
                  </div>
                </div>

                {/* Units Segmented Control */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Time Unit:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8">
                    {UNITS.map((unit) => {
                      const isSelected = selectedUnit === unit.id;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleUnitChange(unit.id)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          {unit.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Configuration (when not 'forever') */}
                {selectedUnit !== 'forever' ? (
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/8">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Duration ({activeUnitConfig.label.toLowerCase()}):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAmount((prev) => Math.max(activeUnitConfig.min, prev - 1))
                          }
                          disabled={amount <= activeUnitConfig.min}
                          className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[48px] text-center font-mono font-bold text-base text-gray-950 dark:text-white">
                          {amount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAmount((prev) => Math.min(activeUnitConfig.max, prev + 1))
                          }
                          disabled={amount >= activeUnitConfig.max}
                          className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-gray-500 font-medium mr-1">Quick:</span>
                      {activeUnitConfig.presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            amount === preset
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-transparent'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <InfinityIcon size={24} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Indefinite Deactivation
                      </span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                        Your profile will remain completely private until you manually enable it
                        back in your privacy settings.
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Preview Info Banner */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/8 dark:border-white/8 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                    <span className="font-bold text-gray-950 dark:text-white">
                      {formatDurationLabel(selectedUnit, amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Hidden until:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 text-right">
                      {formattedTargetDate}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium text-center">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('password')}
                    disabled={isSubmitting}
                    className="flex-1 h-11 rounded-2xl text-xs sm:text-sm font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmDeactivation(requestClose)}
                    disabled={isSubmitting}
                    className="flex-1 h-11 rounded-2xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-amber-900/20 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Deactivate Account</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Modal>
  );
}
