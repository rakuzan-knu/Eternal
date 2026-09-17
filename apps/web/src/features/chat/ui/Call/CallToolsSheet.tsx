import React, { useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Compass,
  UploadCloud,
  Film,
  PenTool,
  Radio,
  Bot,
  Camera,
  Boxes,
  Settings,
  X,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';

interface CallToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function CallToolsSheet({ isOpen, onClose, onOpenSettings }: CallToolsSheetProps) {
  const {
    virtualBackground,
    setVirtualBackground,
    isNoiseSuppressionEnabled,
    setIsNoiseSuppressionEnabled,
    isTravelerModeEnabled,
    setIsTravelerModeEnabled,
    fileTransfers,
    isFileTransferOpen,
    setIsFileTransferOpen,
    isSyncPlayOpen,
    setIsSyncPlayOpen,
    isWhiteboardOpen,
    toggleWhiteboard,
    isSoundboardOpen,
    toggleSoundboard,
    isLiveSummaryOpen,
    toggleLiveSummary,
    isDualCameraOpen,
    toggleDualCamera,
    isHolographicCallOpen,
    toggleHolographicCall,
  } = useCallStore();

  const activeTransfersCount = Object.keys(fileTransfers).length;

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tools = [
    {
      id: 'blur',
      title: 'Размытие фона',
      desc: virtualBackground === 'blur' ? 'Включено' : 'Выключено',
      active: virtualBackground === 'blur',
      icon: Wand2,
      activeColor:
        'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]',
      onClick: () => setVirtualBackground(virtualBackground === 'blur' ? 'none' : 'blur'),
    },
    {
      id: 'rnnoise',
      title: 'AI Шумоподавление',
      desc: isNoiseSuppressionEnabled ? 'RNNoise AI вкл' : 'Выключено',
      active: isNoiseSuppressionEnabled,
      icon: Sparkles,
      activeColor:
        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      onClick: () => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled),
    },
    {
      id: 'traveler',
      title: 'Эко-режим (Батарея)',
      desc: isTravelerModeEnabled ? '12kbps Opus' : 'Стандарт',
      active: isTravelerModeEnabled,
      icon: Compass,
      activeColor:
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      onClick: () => setIsTravelerModeEnabled(!isTravelerModeEnabled),
    },
    {
      id: 'whiteboard',
      title: 'Интерактивная доска',
      desc: isWhiteboardOpen ? 'Открыта' : 'CRDT Canvas',
      active: isWhiteboardOpen,
      icon: PenTool,
      activeColor:
        'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      onClick: () => {
        toggleWhiteboard();
        onClose();
      },
    },
    {
      id: 'syncplay',
      title: 'Смотреть вместе',
      desc: isSyncPlayOpen ? 'Активно' : 'SyncPlay P2P',
      active: isSyncPlayOpen,
      icon: Film,
      activeColor:
        'bg-purple-600/25 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      onClick: () => {
        setIsSyncPlayOpen(!isSyncPlayOpen);
        onClose();
      },
    },
    {
      id: 'p2pfiles',
      title: 'P2P Передача файлов',
      desc: activeTransfersCount > 0 ? `${activeTransfersCount} файлов` : 'Прямая передача',
      active: isFileTransferOpen || activeTransfersCount > 0,
      icon: UploadCloud,
      activeColor:
        'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
      badge: activeTransfersCount > 0 ? activeTransfersCount : undefined,
      onClick: () => {
        setIsFileTransferOpen(!isFileTransferOpen);
        onClose();
      },
    },
    {
      id: 'soundboard',
      title: 'Саундборд и мемы',
      desc: isSoundboardOpen ? 'Открыт' : 'Звуковые эффекты',
      active: isSoundboardOpen,
      icon: Radio,
      activeColor:
        'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.25)]',
      onClick: () => {
        toggleSoundboard();
        onClose();
      },
    },
    {
      id: 'summary',
      title: 'AI Саммари звонка',
      desc: isLiveSummaryOpen ? 'Генерируется' : 'Что я пропустил?',
      active: isLiveSummaryOpen,
      icon: Bot,
      activeColor:
        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      onClick: () => {
        toggleLiveSummary();
        onClose();
      },
    },
    {
      id: 'dualcamera',
      title: 'Двойная камера',
      desc: isDualCameraOpen ? 'Включена' : 'Студийный режим',
      active: isDualCameraOpen,
      icon: Camera,
      activeColor:
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      onClick: () => {
        toggleDualCamera();
        onClose();
      },
    },
    {
      id: 'holographic',
      title: '3D Голограмма',
      desc: isHolographicCallOpen ? 'WebXR LiDAR' : 'Gaussian Splatting',
      active: isHolographicCallOpen,
      icon: Boxes,
      activeColor:
        'bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      onClick: () => {
        toggleHolographicCall();
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Настройки звука и видео',
      desc: 'Микрофон, камера, спикеры',
      active: false,
      icon: Settings,
      activeColor: 'bg-white/15 text-white border-white/20',
      onClick: () => {
        onOpenSettings();
        onClose();
      },
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Дополнительные инструменты звонка"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[85dvh] sm:max-h-[80dvh] flex flex-col bg-zinc-950/95 border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-white">Инструменты звонка</h3>
            <p className="text-xs text-zinc-400">Быстрое переключение функций и эффектов</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tools Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-2 gap-2.5 touch-pan-y overscroll-contain">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={t.onClick}
                className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-150 active:scale-98 ${
                  t.active
                    ? t.activeColor
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    t.active ? 'bg-white/10' : 'bg-white/5 text-zinc-400'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{t.desc}</p>
                </div>
                {t.badge !== undefined && (
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
