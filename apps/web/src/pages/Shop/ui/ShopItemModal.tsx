import React, { useState } from 'react';
import { X, Heart, Gift, Check, Sparkles, ShoppingBag, Gem, Tag, Package } from 'lucide-react';
import type { ShopItem } from '../types';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import Avatar from '@/shared/ui/Avatar';
import { useShopWalletStore } from '../model/useShopWalletStore';
import { useThemeStore } from '@/shared/model/useThemeStore';

interface ShopItemModalProps {
  item: ShopItem | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  userOrbs?: number;
}

export const ShopItemModal: React.FC<ShopItemModalProps> = ({
  item,
  isOpen,
  onClose,
  isWishlisted,
  onToggleWishlist,
}) => {
  const { data: currentUser } = useCurrentUser();
  const { balance, deductFunds } = useShopWalletStore();
  const accentColor = useThemeStore((s) => s.accentColor);
  const [usePersonalAvatar, setUsePersonalAvatar] = useState(true);
  const [purchased, setPurchased] = useState(false);
  const [gifted, setGifted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleBuy = () => {
    if (balance < item.price) {
      setErrorMsg(
        `Insufficient balance ($${balance.toFixed(2)} available). Please top up your wallet.`,
      );
      return;
    }
    const success = deductFunds(item.price, `Purchased ${item.name}`);
    if (success) {
      setErrorMsg(null);
      setPurchased(true);
      setTimeout(() => {
        setPurchased(false);
      }, 2800);
    }
  };

  const handleGift = () => {
    if (balance < item.price) {
      setErrorMsg(`Insufficient balance to gift ($${balance.toFixed(2)} available).`);
      return;
    }
    const success = deductFunds(item.price, `Gifted ${item.name}`);
    if (success) {
      setErrorMsg(null);
      setGifted(true);
      setTimeout(() => {
        setGifted(false);
      }, 2800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-[#13111c] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        {/* Left Column: Interactive Try-On Avatar Preview */}
        <div
          className="relative md:w-1/2 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 select-none overflow-hidden"
          style={{
            background: `radial-gradient(circle at center, ${item.previewGlow} 0%, #0d0b14 80%)`,
          }}
        >
          <div className="absolute top-4 left-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-semibold text-gray-300 backdrop-blur-md">
            <Sparkles size={12} className="text-purple-400" />
            <span>Try On Preview</span>
          </div>

          {/* Try-on Avatar Target */}
          <div className="relative my-8 flex items-center justify-center">
            {/* The Avatar */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-black/50 shadow-2xl bg-[#232133] flex items-center justify-center">
              {usePersonalAvatar && currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.displayName || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-16 h-16 fill-gray-400">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              )}
            </div>

            {/* Custom SVG Cosmetic Overlay */}
            {item.id === 'hexs-hat' && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none filter drop-shadow-[0_0_12px_#a855f7]">
                <svg viewBox="0 0 100 70" className="w-32 h-24">
                  <path
                    d="M15 55 Q50 48 85 55 Q50 62 15 55 Z"
                    fill="#581c87"
                    stroke="#c084fc"
                    strokeWidth="2"
                  />
                  <path
                    d="M32 52 L50 6 Q62 20 70 52 Z"
                    fill="#7e22ce"
                    stroke="#a855f7"
                    strokeWidth="2"
                  />
                  <path d="M42 46 Q50 43 58 46" stroke="#fbbf24" strokeWidth="3" fill="none" />
                  <circle cx="50" cy="44" r="3.5" fill="#fef08a" />
                  <path
                    d="M68 48 Q82 55 88 64"
                    stroke="#c084fc"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
            )}

            {item.id === 'grinning-gourds' && (
              <>
                <div className="absolute -inset-2 rounded-full border-3 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)] animate-pulse pointer-events-none" />
                <div className="absolute -bottom-4 -left-2 pointer-events-none filter drop-shadow-[0_0_10px_#22c55e]">
                  <svg viewBox="0 0 60 40" className="w-20 h-12">
                    <ellipse cx="20" cy="24" rx="14" ry="12" fill="#ea580c" />
                    <ellipse cx="38" cy="26" rx="11" ry="10" fill="#f97316" />
                    <polygon points="15,22 17,19 19,22" fill="#86efac" />
                    <polygon points="23,22 25,19 27,22" fill="#86efac" />
                    <path d="M15 27 Q21 32 27 27 Z" fill="#86efac" />
                    <polygon points="34,25 36,22 38,25" fill="#86efac" />
                    <polygon points="40,25 42,22 44,25" fill="#86efac" />
                    <path d="M35 29 Q39 33 43 29 Z" fill="#86efac" />
                  </svg>
                </div>
              </>
            )}

            {item.category === 'Profile Frames' && (
              <div
                className="absolute -inset-2 rounded-full border-4 shadow-xl pointer-events-none animate-spin-slow"
                style={{
                  borderColor: item.previewColor,
                  boxShadow: `0 0 25px ${item.previewGlow}`,
                }}
              />
            )}

            {item.category === 'Profile Effects' && (
              <div
                className="absolute -inset-6 rounded-full opacity-70 pointer-events-none animate-pulse"
                style={{
                  background: `radial-gradient(circle, ${item.previewColor} 0%, transparent 70%)`,
                }}
              />
            )}

            {item.category === 'Nameplates' && (
              <div
                className="absolute -bottom-5 w-36 h-7 rounded-lg flex items-center justify-center text-xs font-black uppercase tracking-wider text-white shadow-lg pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, ${item.previewColor}ee, ${item.previewColor}88)`,
                  border: `1.5px solid ${item.previewColor}`,
                }}
              >
                {currentUser?.displayName || 'Eternal User'}
              </div>
            )}
          </div>

          {/* Avatar Switcher Toggle */}
          <button
            type="button"
            onClick={() => setUsePersonalAvatar((v) => !v)}
            className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
          >
            {usePersonalAvatar ? 'Switch to Discord avatar' : 'Switch to your avatar'}
          </button>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="relative md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            {/* Collection & Category Tags */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
                {item.collection}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400 font-medium">{item.category}</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-white">{item.name}</h2>

            {/* Price Row */}
            <div className="flex items-center gap-3">
              {item.currency === 'USD' ? (
                <span className="text-2xl font-black text-white">${item.price.toFixed(2)}</span>
              ) : (
                <div className="flex items-center gap-1.5 text-2xl font-black text-purple-400">
                  <Gem size={20} />
                  <span>{item.price.toLocaleString()} Orbs</span>
                </div>
              )}

              {item.discountPercent && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-extrabold">
                  -{item.discountPercent}% OFF
                </span>
              )}
              {item.originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${item.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mt-1">
              {item.description}
            </p>

            {/* Bundle Items List if Bundle */}
            {item.itemsIncludedNames && item.itemsIncludedNames.length > 0 && (
              <div className="mt-2 p-3 rounded-2xl bg-white/[0.04] border border-white/8 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                  <Package size={14} className="text-purple-400" />
                  <span>Includes {item.itemsIncludedNames.length} items:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.itemsIncludedNames.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded-md bg-black/40 text-[11px] text-gray-300"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
                <span>{errorMsg}</span>
              </div>
            )}

            {purchased ? (
              <div className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 animate-popIn">
                <Check size={18} />
                <span>Equipped to your profile!</span>
              </div>
            ) : gifted ? (
              <div
                className="w-full py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 animate-popIn"
                style={{ backgroundColor: accentColor }}
              >
                <Gift size={18} />
                <span>Gift sent to friend!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBuy}
                  className="flex-1 py-3 px-4 rounded-2xl text-white font-extrabold text-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:brightness-110"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 10px 25px ${accentColor}40`,
                  }}
                >
                  <ShoppingBag size={16} />
                  <span>Buy for Myself (${item.price.toFixed(2)})</span>
                </button>

                <button
                  type="button"
                  onClick={handleGift}
                  className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm active:scale-98 transition-all cursor-pointer flex items-center gap-2"
                  title="Gift to a friend"
                >
                  <Gift size={16} className="text-pink-400" />
                  <span>Gift</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleWishlist}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isWishlisted
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                  title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
                >
                  <Heart size={18} className={isWishlisted ? 'fill-rose-400' : ''} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
