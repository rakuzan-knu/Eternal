import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Plus,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Wallet,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useShopWalletStore } from '../model/useShopWalletStore';
import { useThemeStore } from '@/shared/model/useThemeStore';

interface ShopWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopWalletModal: React.FC<ShopWalletModalProps> = ({ isOpen, onClose }) => {
  const { balance, addFunds, transactions } = useShopWalletStore();
  const accentColor = useThemeStore((s) => s.accentColor);
  const [selectedPreset, setSelectedPreset] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple-pay' | 'crypto'>('card');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const depositPresets = [10, 25, 50, 100];

  const handleDeposit = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedPreset;
    if (isNaN(amount) || amount <= 0) return;

    const methodNames = {
      card: 'Credit/Debit Card (•••• 4242)',
      'apple-pay': 'Apple / Google Pay',
      crypto: 'Crypto Pay',
    };

    addFunds(amount, methodNames[paymentMethod]);
    setIsSuccess(true);
    setCustomAmount('');
    setTimeout(() => {
      setIsSuccess(false);
    }, 2400);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-[#13111c] border border-white/10 p-6 flex flex-col gap-5 animate-popIn shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-left select-none max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{
                backgroundColor: `${accentColor}25`,
                color: accentColor,
              }}
            >
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Eternal Wallet</h3>
              <p className="text-xs text-gray-400">Secure balance for cosmetics & gifts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current USD Balance Card */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/8 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Available Balance
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck size={12} />
              Verified & Ready
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              ${balance.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-gray-400">USD</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: accentColor }} />
            <span>Use this balance to purchase avatar decorations, nameplates & effects</span>
          </div>
        </div>

        {/* Top-up Preset Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-300 mb-2">Top Up Balance (USD)</label>
          <div className="grid grid-cols-4 gap-2">
            {depositPresets.map((amount) => {
              const isSelected = selectedPreset === amount && !customAmount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(amount);
                    setCustomAmount('');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'text-white border-transparent shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: accentColor,
                          boxShadow: `0 4px 15px ${accentColor}40`,
                        }
                      : {}
                  }
                >
                  +${amount}
                </button>
              );
            })}
          </div>

          {/* Custom Amount Input */}
          <div className="mt-2.5 relative flex items-center">
            <div className="absolute left-3 text-gray-400 pointer-events-none text-xs font-bold">
              $
            </div>
            <input
              type="number"
              min="1"
              max="1000"
              step="any"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedPreset(0);
              }}
              placeholder="Or enter custom amount..."
              className="w-full h-9 pl-7 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-300 mb-2">Payment Method</label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                paymentMethod === 'card'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard size={16} className="text-gray-300" />
                <div>
                  <div className="text-xs font-bold text-white">Credit or Debit Card</div>
                  <div className="text-[11px] text-gray-400">
                    Visa, Mastercard, Amex (•••• 4242)
                  </div>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'card' ? 'border-white bg-white text-black' : 'border-white/30'
                }`}
              >
                {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('apple-pay')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                paymentMethod === 'apple-pay'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign size={16} className="text-gray-300" />
                <div>
                  <div className="text-xs font-bold text-white">Apple Pay / Google Pay</div>
                  <div className="text-[11px] text-gray-400">One-tap fast checkout</div>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'apple-pay'
                    ? 'border-white bg-white text-black'
                    : 'border-white/30'
                }`}
              >
                {paymentMethod === 'apple-pay' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Deposit Action Button */}
        {isSuccess ? (
          <div className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 animate-popIn">
            <CheckCircle2 size={16} />
            <span>Balance successfully topped up!</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDeposit}
            className="w-full py-3 px-4 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:brightness-110 active:scale-98 shadow-lg"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 10px 25px ${accentColor}40`,
            }}
          >
            <Plus size={16} />
            <span>
              Add ${customAmount ? parseFloat(customAmount).toFixed(2) : selectedPreset.toFixed(2)}{' '}
              to Balance
            </span>
          </button>
        )}

        {/* Recent Transactions Log */}
        {transactions && transactions.length > 0 && (
          <div className="pt-2 border-t border-white/8">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Recent Activity
            </span>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
              {transactions.slice(0, 4).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        tx.type === 'deposit'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {tx.type === 'deposit' ? '+' : '-'}
                    </span>
                    <span className="text-gray-300 font-medium truncate max-w-[180px]">
                      {tx.description}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      tx.type === 'deposit' ? 'text-emerald-400' : 'text-gray-300'
                    }`}
                  >
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck size={13} className="text-gray-400" />
          <span>256-bit SSL encrypted • Instant deposit</span>
        </div>
      </div>
    </div>
  );
};
