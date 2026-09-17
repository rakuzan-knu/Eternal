import React, { useEffect, useState, useMemo } from 'react';
import { Shield, ShieldCheck, X, CheckCircle2, Lock, Copy, Check } from 'lucide-react';
import {
  fetchPeerIdentityKeyCached,
  fingerprintIdentityKey,
  exportIdentityPublicKey,
  pinIdentityKey,
  isPinnedMatch,
} from '../lib/e2ee/identityKeys';
import { SAS_EMOJI_TABLE } from '../lib/e2ee/frameCrypto';

interface SecretChatVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerUserId: string;
  peerDisplayName: string;
}

export function SecretChatVerificationModal({
  isOpen,
  onClose,
  peerUserId,
  peerDisplayName,
}: SecretChatVerificationModalProps) {
  const [loading, setLoading] = useState(true);
  const [peerFingerprint, setPeerFingerprint] = useState<string | null>(null);
  const [localFingerprint, setLocalFingerprint] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !peerUserId) return;

    let mounted = true;
    setLoading(true);

    async function loadKeys() {
      try {
        const [peerKey, myKeyB64] = await Promise.all([
          fetchPeerIdentityKeyCached(peerUserId),
          exportIdentityPublicKey().catch(() => null),
        ]);

        if (!mounted) return;

        if (peerKey) {
          const peerFp = await fingerprintIdentityKey(peerKey);
          if (mounted) setPeerFingerprint(peerFp);

          const verified = await isPinnedMatch(peerUserId, peerKey);
          if (mounted) setIsVerified(verified);
        } else {
          setPeerFingerprint(null);
        }

        if (myKeyB64) {
          const myFp = await fingerprintIdentityKey(myKeyB64);
          if (mounted) setLocalFingerprint(myFp);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadKeys();

    return () => {
      mounted = false;
    };
  }, [isOpen, peerUserId]);

  // Compute 4 SAS emojis by combining local and peer fingerprints
  const sasEmojis = useMemo(() => {
    if (!peerFingerprint && !localFingerprint) return null;
    const combined = (peerFingerprint || '') + (localFingerprint || '');
    if (!combined) return null;

    // Use 4 slices of the hex string to select 4 emojis
    const indices: number[] = [];
    for (let i = 0; i < 4; i++) {
      const hexPair = combined.substring(
        (i * 4) % combined.length,
        (i * 4 + 2) % combined.length || 2,
      );
      const num = parseInt(hexPair, 16) || 0;
      indices.push(num % SAS_EMOJI_TABLE.length);
    }

    return indices.map((idx) => SAS_EMOJI_TABLE[idx]);
  }, [peerFingerprint, localFingerprint]);

  const handleVerify = () => {
    if (!peerFingerprint) return;
    pinIdentityKey(peerUserId, peerFingerprint);
    setIsVerified(true);
  };

  const handleCopy = () => {
    if (!peerFingerprint) return;
    void navigator.clipboard.writeText(peerFingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const formattedPeerFp = peerFingerprint
    ? peerFingerprint.match(/.{1,4}/g)?.join(' ') || peerFingerprint
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#161822] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-white animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-emerald-400'
              }`}
            >
              {isVerified ? <ShieldCheck size={22} /> : <Shield size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">End-to-End Encryption</h2>
              <p className="text-xs text-gray-400">Telegram / Signal Secret Chat Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Verification explanation */}
        <p className="text-xs text-gray-300 leading-relaxed">
          Messages and calls with{' '}
          <span className="font-semibold text-white">{peerDisplayName}</span> are secured with{' '}
          <span className="text-emerald-400 font-medium">AES-GCM-256</span> and{' '}
          <span className="text-emerald-400 font-medium">ECDH P-256</span>. Zero unencrypted data or
          private keys ever leave your device.
        </p>

        {/* SAS Emoji Comparison Card */}
        {sasEmojis && (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Visual Safety SAS Emojis
            </span>
            <div className="flex items-center gap-4 text-3xl py-1 select-none">
              {sasEmojis.map((emoji, idx) => (
                <span
                  key={idx}
                  className="hover:scale-125 transition-transform duration-200 cursor-default"
                >
                  {emoji}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-gray-500 text-center">
              Compare these 4 emojis with {peerDisplayName} in person or via voice call.
            </span>
          </div>
        )}

        {/* 64-char Hex Fingerprint */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Identity Key Fingerprint
            </span>
            {formattedPeerFp && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-gray-300 break-all leading-relaxed select-all">
            {loading ? (
              <span className="text-gray-500">Computing cryptographic fingerprint...</span>
            ) : formattedPeerFp ? (
              formattedPeerFp
            ) : (
              <span className="text-amber-400/80">
                Contact has not published a public key yet (ephemeral fallback active).
              </span>
            )}
          </div>
        </div>

        {/* Status and Verification Action */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            {isVerified ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Verified Identity</span>
              </>
            ) : (
              <>
                <Lock size={15} className="text-amber-400" />
                <span className="text-xs font-medium text-amber-400/90">Unverified Contact</span>
              </>
            )}
          </div>

          {!isVerified && peerFingerprint && (
            <button
              type="button"
              onClick={handleVerify}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
            >
              Mark as Verified
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
