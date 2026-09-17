import React, { useEffect, useState } from 'react';
import { Camera, Split, Layers, QrCode, X, Copy, Check, Power, AlertCircle } from 'lucide-react';
import { globalDualCameraManager, DualCameraLayout } from '../../lib/webrtc/dualCameraManager';
import { useCallStore } from '../../model/callStore';

interface DualCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackReplaced?: (track: MediaStreamTrack) => void;
  onRestorePrimaryTrack?: () => void;
}

export function DualCameraModal({
  isOpen,
  onClose,
  onTrackReplaced,
  onRestorePrimaryTrack,
}: DualCameraModalProps) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [layout, setLayout] = useState<DualCameraLayout>('pip');
  const [isActive, setIsActive] = useState(globalDualCameraManager.getIsActive());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { localStream, callId } = useCallStore();

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Enumerate camera devices
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 1 && !selectedDevice) {
          // Default to the second available camera
          setSelectedDevice(videoInputs[1].deviceId);
        } else if (videoInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.warn('[DualCameraModal] Failed to enumerate devices:', err);
      }
    };

    void loadDevices();
    setIsActive(globalDualCameraManager.getIsActive());
    setLayout(globalDualCameraManager.getLayout());

    const unsub = globalDualCameraManager.subscribe((active) => {
      setIsActive(active);
    });
    return unsub;
  }, [isOpen, selectedDevice]);

  if (!isOpen) return null;

  const handleToggleDualCamera = async () => {
    setError(null);

    if (isActive) {
      globalDualCameraManager.stopDualCamera();
      setIsActive(false);
      onRestorePrimaryTrack?.();
    } else {
      if (!localStream || localStream.getVideoTracks().length === 0) {
        setError('Please enable your main camera first.');
        return;
      }
      if (!selectedDevice) {
        setError('Please select a secondary camera device.');
        return;
      }

      try {
        const compositeTrack = await globalDualCameraManager.startDualCamera(
          localStream,
          selectedDevice,
          layout,
        );
        setIsActive(true);
        onTrackReplaced?.(compositeTrack);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start secondary camera');
      }
    }
  };

  const handleLayoutChange = (newLayout: DualCameraLayout) => {
    setLayout(newLayout);
    globalDualCameraManager.setLayout(newLayout);
  };

  const pairingUrl = globalDualCameraManager.getPairingUrl(callId || 'active-call');

  const handleCopyPairingUrl = () => {
    void navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-950/95 border border-white/15 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-linear-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                Dual-Camera Mode
                {isActive && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 animate-pulse">
                    Live 60 FPS
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Simultaneous webcam + document camera / USB microscope compositor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Secondary Camera Selector */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Secondary Camera Device
          </label>
          <select
            value={selectedDevice}
            disabled={isActive}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          >
            {videoDevices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${idx + 1} (${device.deviceId.substring(0, 8)})`}
              </option>
            ))}
          </select>
          {videoDevices.length <= 1 && (
            <p className="text-[11px] text-amber-400/80 mt-1">
              Only 1 local camera detected. Pair your smartphone camera below to use as a second
              view!
            </p>
          )}
        </div>

        {/* Layout Modes */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Compositor Layout
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleLayoutChange('pip')}
              className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                layout === 'pip'
                  ? 'bg-emerald-500/15 border-emerald-400 text-white'
                  : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Layers size={18} className={layout === 'pip' ? 'text-emerald-400' : ''} />
              <div>
                <p className="text-xs font-bold">Picture-in-Picture</p>
                <p className="text-[10px] text-zinc-400">Main view + badge corner</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLayoutChange('side_by_side')}
              className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                layout === 'side_by_side'
                  ? 'bg-emerald-500/15 border-emerald-400 text-white'
                  : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Split size={18} className={layout === 'side_by_side' ? 'text-emerald-400' : ''} />
              <div>
                <p className="text-xs font-bold">Side-by-Side</p>
                <p className="text-[10px] text-zinc-400">Equal 50/50 split screen</p>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Device P2P Pairing Section */}
        <div className="mt-5 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode size={16} className="text-cyan-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Use Phone as Document Camera
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyPairingUrl}
              className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied Link' : 'Copy Pairing Link'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Open the link on your smartphone to stream its camera directly into this call as a
            secondary feed.
          </p>
        </div>

        {/* Start / Stop Toggle Button */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleToggleDualCamera}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
              isActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
            }`}
          >
            <Power size={14} />
            <span>{isActive ? 'Stop Dual Camera' : 'Start Dual Camera'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
