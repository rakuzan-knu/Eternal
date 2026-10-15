import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Plus,
  Trash2,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Camera,
  Keyboard,
  ExternalLink,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '@/shared/ui/Avatar';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { familyApi } from '../../api/familyApi';
import {
  FamilyMember,
  FamilyActivitySummaryResponse,
  PendingPairRequestDto,
} from '../../model/familyCenterTypes';
import { FamilySafeguardsModal } from './FamilySafeguardsModal';
import { useFamilySettingsStore } from '../../model/useFamilySettingsStore';

interface MyFamilyTabProps {
  isTeen: boolean;
  connectedChildren: FamilyMember[];
  connectedParents: FamilyMember[];
  maxChildren: number;
  maxParents: number;
  onRefreshMembers: () => void;
  accentColor?: string;
  textOnAccent?: string;
}

export const MyFamilyTab: React.FC<MyFamilyTabProps> = ({
  isTeen,
  connectedChildren,
  connectedParents,
  maxChildren,
  maxParents,
  onRefreshMembers,
  accentColor,
  textOnAccent,
}) => {
  const isGlass = useThemeStore(
    (s) => s.isGlassmorphismEnabled || s.glassmorphismOpacity > 0 || s.themeMode === 'wallpaper',
  );
  const { pinEnabled, pinCode } = useFamilySettingsStore();

  // Unified Parent Pairing Modal (QR scanner + alphanumeric code)
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [pairMethod, setPairMethod] = useState<'qr' | 'code'>('qr');
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [isSubmittingPair, setIsSubmittingPair] = useState(false);
  const [pairSentSuccess, setPairSentSuccess] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  // Child QR Modal (Step 1)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresSeconds, setExpiresSeconds] = useState(600); // 10 min

  // Incoming Request for Child (Step 3)
  const [incomingRequest, setIncomingRequest] = useState<PendingPairRequestDto | null>(null);
  const [isProcessingIncoming, setIsProcessingIncoming] = useState(false);

  // Activity Summary Drawer/Modal for Parent
  const [activeActivityChild, setActiveActivityChild] = useState<FamilyMember | null>(null);
  const [activitySummary, setActivitySummary] = useState<FamilyActivitySummaryResponse | null>(
    null,
  );
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Safeguards Modal for Parent
  const [activeSafeguardChild, setActiveSafeguardChild] = useState<FamilyMember | null>(null);

  // Member Revocation Dialog
  const [revokingMember, setRevokingMember] = useState<FamilyMember | null>(null);

  // Poll for incoming link requests on child's device
  useEffect(() => {
    if (!isTeen) return;

    let isMounted = true;
    const checkPending = async () => {
      try {
        const req = await familyApi.getPendingInvite();
        if (isMounted) setIncomingRequest(req);
      } catch {
        // quiet fallback
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isTeen]);

  // Countdown timer for QR code
  useEffect(() => {
    if (!isQrModalOpen || expiresSeconds <= 0) return;
    const t = setInterval(() => setExpiresSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [isQrModalOpen, expiresSeconds]);

  // Handle Child generating their QR & Code
  const handleOpenQrModal = async () => {
    try {
      const res = await familyApi.generateInviteQr();
      setGeneratedCode(res.code);
      setExpiresSeconds(600);
      setIsQrModalOpen(true);
    } catch (err) {
      console.error('Failed to generate invite code:', err);
    }
  };

  // Handle Parent submitting pair code (or scanning QR)
  const handleParentPairSubmit = async (codeToPair?: string) => {
    const code = codeToPair || pairCodeInput.trim();
    if (!code) return;

    setIsSubmittingPair(true);
    setPairError(null);
    try {
      await familyApi.pairWithChild(code);
      setPairSentSuccess(true);
      setTimeout(() => {
        setIsPairModalOpen(false);
        setPairSentSuccess(false);
        setPairCodeInput('');
        onRefreshMembers();
      }, 1500);
    } catch (err: any) {
      setPairError(
        err?.response?.data?.message ||
          'Invalid or expired pairing code. Please verify the code and try again.',
      );
    } finally {
      setIsSubmittingPair(false);
    }
  };

  // Handle Child confirming or declining incoming pair
  const handleConfirmIncoming = async (approved: boolean) => {
    if (!incomingRequest) return;
    setIsProcessingIncoming(true);
    try {
      await familyApi.confirmPair(incomingRequest.linkId, approved);
      setIncomingRequest(null);
      onRefreshMembers();
    } catch (err) {
      console.error('Confirmation failed:', err);
    } finally {
      setIsProcessingIncoming(false);
    }
  };

  // Handle Parent opening Activity Summary
  const handleOpenActivity = async (child: FamilyMember) => {
    setActiveActivityChild(child);
    setIsLoadingActivity(true);
    try {
      const summary = await familyApi.getChildActivity(child.id);
      setActivitySummary(summary);
    } catch (err) {
      console.error('Failed to load child activity:', err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Handle Revoking Family Member Link
  const handleConfirmRevoke = async () => {
    if (!revokingMember) return;
    try {
      await familyApi.revokeLink(revokingMember.linkId || revokingMember.id);
      setRevokingMember(null);
      onRefreshMembers();
    } catch (err) {
      console.error('Failed to revoke member:', err);
    }
  };

  const cardBaseStyle = isGlass
    ? 'glass-card border-white/10 shadow-lg'
    : 'bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/[0.06] shadow-xs';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-8">
      {/* 1. Hero Explanation Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 ${cardBaseStyle}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
          <div className="flex flex-col gap-2.5 flex-1 min-w-0 pr-0 sm:pr-2">
            <h2 className="text-lg sm:text-xl font-extrabold leading-snug tracking-tight text-gray-950 dark:text-white">
              {isTeen
                ? 'Connect with your parents to stay in touch!'
                : 'Use a QR code to connect with your teens!'}
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              To connect to your teen's account, scan the QR code on their device using your phone
              camera. Once linked, you can view high-level summaries of their activity on our
              platform.
            </p>

            {/* 3 Steps with High Contrast WCAG AA Text */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/15 text-gray-950 dark:text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-gray-950 dark:text-white">
                    Ask your teen for their QR code
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-200 mt-0.5 leading-relaxed">
                    Your teen can find it by going to Settings → Family Center → My Family.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/15 text-gray-950 dark:text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-gray-950 dark:text-white">
                    Scan the QR code with your phone
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-200 mt-0.5 leading-relaxed">
                    A connection request will instantly be sent to their device.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/15 text-gray-950 dark:text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-gray-950 dark:text-white">
                    Have your teen accept the link request
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-200 mt-0.5 leading-relaxed">
                    With their consent, you can begin viewing transparent activity summaries.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Illustration (Grandfather with flashlight & Mascot) */}
          <div className="relative shrink-0 w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center select-none">
            <div
              className="absolute w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
              style={{ backgroundColor: accentColor || '#8B5CF6' }}
            />

            <img
              src="/images/family-center/family_connect_hero_clean.png"
              alt="Mentor and Mascot exploring stars"
              className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>
      </div>

      {/* 2. Connected Accounts Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {isTeen
              ? `PARENTS CONNECTED — ${connectedParents.length} OF ${maxParents}`
              : `TEEN ACCOUNTS CONNECTED — ${connectedChildren.length} OF ${maxChildren}`}
          </span>

          {/* Only show header button if there are already connected members (avoids button duplication in empty state) */}
          {isTeen && connectedParents.length > 0 && (
            <button
              type="button"
              onClick={handleOpenQrModal}
              style={{
                backgroundColor: accentColor || '#5865F2',
                color: textOnAccent || '#ffffff',
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <QrCode size={14} className="text-white" />
              <span>Show My QR Code</span>
            </button>
          )}

          {!isTeen && connectedChildren.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPairMethod('qr');
                setIsPairModalOpen(true);
              }}
              style={{
                backgroundColor: accentColor || '#5865F2',
                color: textOnAccent || '#ffffff',
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} className="text-white" />
              <span>Connect Teen</span>
            </button>
          )}
        </div>

        {/* 3. Empty State for Parent (Single primary button, no duplication) */}
        {!isTeen && connectedChildren.length === 0 && (
          <div
            className={`flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl border text-center ${cardBaseStyle}`}
          >
            {/* Transparent Campfire with zero halo */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center select-none mb-3">
              <div className="absolute w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              <img
                src="/images/family-center/family_empty_campfire_clean.png"
                alt="Cozy Campfire with Marshmallow"
                className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-500 hover:scale-105"
              />
            </div>

            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              No family members connected yet.
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Ask your teen to open the "My Family" tab on their device and display their pairing
              code.
            </p>

            <button
              type="button"
              onClick={() => {
                setPairMethod('qr');
                setIsPairModalOpen(true);
              }}
              style={{
                backgroundColor: accentColor || '#5865F2',
                color: textOnAccent || '#ffffff',
              }}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={15} className="text-white" />
              <span>Connect Teen</span>
            </button>
          </div>
        )}

        {/* Empty state for Teen (Single primary button, no duplication) */}
        {isTeen && connectedParents.length === 0 && (
          <div
            className={`flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl border text-center ${cardBaseStyle}`}
          >
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center select-none mb-3">
              <div className="absolute w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl" />
              <img
                src="/images/family-center/family_empty_campfire_clean.png"
                alt="Campfire"
                className="w-full h-full object-contain"
              />
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              No parents connected yet
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Share your QR code or 6-digit pairing code with your parents to link accounts.
            </p>
            <button
              type="button"
              onClick={handleOpenQrModal}
              style={{
                backgroundColor: accentColor || '#5865F2',
                color: textOnAccent || '#ffffff',
              }}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <QrCode size={15} className="text-white" />
              <span>Show Connection QR Code</span>
            </button>
          </div>
        )}

        {/* 4. Connected Children List (Parent View) */}
        {!isTeen && connectedChildren.length > 0 && (
          <div className="flex flex-col gap-3">
            {connectedChildren.map((child) => (
              <div
                key={child.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${cardBaseStyle}`}
              >
                {/* Child info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <Avatar
                      src={child.avatar}
                      alt={child.displayName}
                      size="md"
                      className="w-12 h-12 rounded-full ring-2 ring-black/10 dark:ring-white/10"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111214]" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-950 dark:text-white truncate">
                        {child.displayName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/15 text-gray-950 dark:text-white">
                        {child.age} years old
                      </span>
                    </div>

                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      @{child.username} • Connected since{' '}
                      {new Date(child.connectedAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>

                {/* Actions with theme-adaptive white/black icons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenActivity(child)}
                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Activity size={14} className="text-gray-950 dark:text-white" />
                    <span>Activity</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSafeguardChild(child)}
                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Shield size={14} className="text-gray-950 dark:text-white" />
                    <span>Safeguards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRevokingMember(child)}
                    className="p-1.5 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="Disconnect account"
                    aria-label="Disconnect account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. Connected Parents List (Teen View) */}
        {isTeen && connectedParents.length > 0 && (
          <div className="flex flex-col gap-3">
            {connectedParents.map((parent) => (
              <div
                key={parent.id}
                className={`flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${cardBaseStyle}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar
                    src={parent.avatar}
                    alt={parent.displayName}
                    size="md"
                    className="w-12 h-12 rounded-full ring-2 ring-black/10 dark:ring-white/10"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-950 dark:text-white truncate">
                        {parent.displayName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
                        Guardian
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      @{parent.username} • Connected
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRevokingMember(parent)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Disconnect Parent</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Unified Modal: Parent Pair (Scan QR or Enter Code) */}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#111214] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Connect Teen</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Choose a pairing method with your teen's device:
                </p>
              </div>
            </div>

            {/* Method switcher */}
            <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setPairMethod('qr')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pairMethod === 'qr'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Camera size={14} className="text-white" />
                <span>Scan QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setPairMethod('code')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pairMethod === 'code'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Keyboard size={14} className="text-white" />
                <span>Enter Code</span>
              </button>
            </div>

            {/* Option 1: QR Scanner Simulator */}
            {pairMethod === 'qr' && (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative w-52 h-52 rounded-3xl bg-black/50 border-2 border-dashed border-indigo-500/40 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                  <QrCode size={100} className="text-white/20" />
                  {/* Laser scan animation line */}
                  <motion.div
                    animate={{ y: [-70, 70, -70] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                    className="absolute w-40 h-0.5 bg-indigo-500 shadow-[0_0_12px_#6366f1]"
                  />
                  <span className="absolute bottom-3 text-[10px] text-gray-400">
                    Point camera at your teen's screen
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => handleParentPairSubmit('FC-DEMO')}
                    disabled={isSubmittingPair || pairSentSuccess}
                    style={{
                      backgroundColor: accentColor || '#5865F2',
                      color: textOnAccent || '#ffffff',
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Camera size={15} className="text-white" />
                    <span>
                      {isSubmittingPair ? 'Scanning...' : 'Scan code from screen (FC-DEMO)'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Option 2: Enter text code */}
            {pairMethod === 'code' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleParentPairSubmit();
                }}
                className="flex flex-col gap-3 py-1"
              >
                <p className="text-xs text-gray-400">
                  Enter the alphanumeric pairing code (e.g.{' '}
                  <span className="text-white font-mono font-bold">FC-8821</span>):
                </p>

                <input
                  type="text"
                  placeholder="FC-XXXX"
                  value={pairCodeInput}
                  onChange={(e) => setPairCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-2xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white focus:outline-none"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={isSubmittingPair || pairSentSuccess || !pairCodeInput.trim()}
                  style={{
                    backgroundColor: accentColor || '#5865F2',
                    color: textOnAccent || '#ffffff',
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer mt-1"
                >
                  {isSubmittingPair ? 'Submitting...' : 'Send Link Request'}
                </button>
              </form>
            )}

            {pairError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{pairError}</span>
              </div>
            )}

            {pairSentSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>Request sent! Waiting for confirmation on your teen's device...</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsPairModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Child QR Code & Pairing Code */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#111214] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-white text-center">
            <h3 className="text-lg font-bold">Family Center Connection Code</h3>
            <p className="text-xs text-gray-400">
              Display this code to your parent or guardian to scan:
            </p>

            <div className="w-48 h-48 rounded-2xl bg-white p-3 flex flex-col items-center justify-center shadow-lg border-4 border-indigo-500/30">
              <QrCode size={130} className="text-black" />
              <span className="font-mono text-xs font-extrabold text-black tracking-widest mt-1">
                {generatedCode || 'FC-....'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-mono font-extrabold text-white tracking-widest">
                {generatedCode}
              </span>
              <span className="text-[11px] text-gray-400">
                Expires in: {Math.floor(expiresSeconds / 60)}:
                {(expiresSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: Incoming Pair Request for Teen (Step 3) */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#111214] border border-indigo-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-white text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center">
              <Shield size={28} />
            </div>

            <div>
              <h3 className="text-lg font-bold">Family Center Connection Request</h3>
              <p className="text-xs text-gray-400 mt-1">
                A user wants to link with your account as a guardian:
              </p>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 w-full justify-center">
              <Avatar
                src={incomingRequest.parentAvatar}
                alt={incomingRequest.parentDisplayName}
                size="md"
                className="w-10 h-10 rounded-full"
              />
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white">
                  {incomingRequest.parentDisplayName}
                </span>
                <span className="text-xs text-gray-400">@{incomingRequest.parentUsername}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              The parent will be able to see a 7-day overview of your activity (friends count, call
              time, and purchases), but will never see your private messages or calls.
            </p>

            <div className="flex items-center gap-3 w-full pt-1">
              <button
                type="button"
                disabled={isProcessingIncoming}
                onClick={() => handleConfirmIncoming(false)}
                className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-300 transition cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={isProcessingIncoming}
                onClick={() => handleConfirmIncoming(true)}
                style={{
                  backgroundColor: accentColor || '#5865F2',
                  color: textOnAccent || '#ffffff',
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                {isProcessingIncoming ? 'Confirming...' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Activity Summary for specific child */}
      {activeActivityChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#111214] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={activeActivityChild.avatar}
                  alt={activeActivityChild.displayName}
                  size="md"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="text-base font-bold">
                    Activity: {activeActivityChild.displayName}
                  </h3>
                  <p className="text-xs text-gray-400">Past 7-day activity overview</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveActivityChild(null)}
                className="text-xs text-gray-400 hover:text-white cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Close
              </button>
            </div>

            {isLoadingActivity ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                <RefreshCw size={24} className="animate-spin text-white" />
                <span className="text-xs">Loading summary...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                  <span className="text-xs text-gray-400">New Friends</span>
                  <span className="text-xl font-bold text-white mt-1">
                    +{activitySummary?.newFriendsCount ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                  <span className="text-xs text-gray-400">Active Chat Users</span>
                  <span className="text-xl font-bold text-white mt-1">
                    {activitySummary?.messagingUsersCount ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                  <span className="text-xs text-gray-400">Voice & Video Call Time</span>
                  <span className="text-xl font-bold text-white mt-1">
                    {activitySummary?.voiceVideoMinutes ?? 0} min
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                  <span className="text-xs text-gray-400">Purchases</span>
                  <span className="text-xl font-bold text-white mt-1">
                    ${activitySummary?.purchaseAmount ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                  <span className="text-xs text-gray-400">Gifts Received</span>
                  <span className="text-xl font-bold text-white mt-1">
                    {activitySummary?.giftsReceivedCount ?? 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Safeguards Config */}
      {activeSafeguardChild && (
        <FamilySafeguardsModal
          childId={activeSafeguardChild.id}
          childName={activeSafeguardChild.displayName}
          onClose={() => setActiveSafeguardChild(null)}
          onUpdated={() => {
            setActiveSafeguardChild(null);
            onRefreshMembers();
          }}
        />
      )}

      {/* Modal: Confirm Revocation */}
      {revokingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#111214] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-white text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center">
              <Trash2 size={24} />
            </div>

            <h3 className="text-base font-bold">Disconnect Family Link?</h3>
            <p className="text-xs text-gray-400">
              Are you sure you want to disconnect{' '}
              <strong className="text-white">{revokingMember.displayName}</strong>? The family link
              will be immediately removed for both parties.
            </p>

            <div className="flex items-center gap-3 w-full pt-1">
              <button
                type="button"
                onClick={() => setRevokingMember(null)}
                className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg transition cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyFamilyTab;
