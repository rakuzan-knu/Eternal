import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Type,
  Smile,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  AtSign,
  Palette,
  Trash2,
  Music,
  Loader2,
  ArrowRight,
  RotateCcw,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Pencil,
  BarChart2,
} from 'lucide-react';
import { useStoryEditorStore } from '../model/useStoryEditorStore';
import { useCreateStory } from '../model/useStories';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import Avatar from '@/shared/ui/Avatar';
import { uid } from 'uid';
import type {
  TextOverlay,
  ImageOverlay,
  PollOverlay,
  LinkOverlay,
  MentionOverlay,
  AudioOverlay,
  DrawingOverlay,
  StoryPrivacy,
} from '../model/types';
import { StoryDrawingCanvas } from './StoryDrawingCanvas';
import { StoryDrawingOverlayView } from './StoryDrawingOverlayView';
import { StoryFiltersCarousel } from './StoryFiltersCarousel';
import { getStoryFilterCss } from '../lib/storyFilterUtils';
import { StoryMusicSearchModal } from './StoryMusicSearchModal';
import { StoryMusicStickerView } from './StoryMusicStickerView';
import type { Theme as EmojiTheme } from 'emoji-picker-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

import {
  COLOR_PALETTE,
  GRADIENT_PRESETS,
  STORY_FONTS,
  STORY_ANIMATIONS,
  extractDominantGradient,
  preloadStoryFonts,
  snapPosition,
  snapRotation,
  getStoryFontFamily,
  type StoryFontId,
  type StoryAnimationId,
} from '../lib/storyCanvasUtils';

export function StoryEditorModal() {
  const { data: currentUser } = useCurrentUser();
  const {
    isOpen,
    closeEditor,
    mediaFile,
    mediaUrl,
    mediaType,
    caption,
    overlays,
    privacy,
    backgroundColor,
    activeTool,
    selectedOverlayId,
    isDraggingOverTrash,
    activeFilter,
    isFiltersOpen,
    isMusicModalOpen,
    isEmojiPickerOpen,
    isDrawingMode,
    videoVolume,
    musicVolume,
    setMedia,
    setCaption,
    addOverlay,
    updateOverlay,
    removeOverlay,
    bringToFront,
    setSelectedOverlayId,
    setIsDraggingOverTrash,
    setBackgroundColor,
    setActiveTool,
    setActiveFilter,
    setIsFiltersOpen,
    setIsMusicModalOpen,
    setIsEmojiPickerOpen,
    setIsDrawingMode,
    setAudioVolumes,
  } = useStoryEditorStore();

  useBodyScrollLock(isOpen);

  const createStoryMutation = useCreateStory();

  // Local state
  const [gradientIndex, setGradientIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showStickerSheet, setShowStickerSheet] = useState(false);
  const [colorTarget, setColorTarget] = useState<'text' | 'background'>('text');
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);

  // Horizontal wheel handler for trackpad/mouse scroll in horizontal drawers
  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  // Text Tool State
  const [activeTextTab, setActiveTextTab] = useState<'font' | 'color' | 'animation' | 'none'>(
    'font',
  );
  const [isItalic, setIsItalic] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textBgColor, setTextBgColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState<StoryFontId>('modern');
  const [bgStyle, setBgStyle] = useState<'none' | 'solid' | 'neon' | 'glass' | 'highlight'>('none');
  const [fontSizeCqw, setFontSizeCqw] = useState(6.5); // 3.5 to 12% of container width
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textAnimation, setTextAnimation] = useState<StoryAnimationId>('none');

  // Poll Tool State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes', 'No']);

  // Link Tool State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('TAP HERE 🔥');

  // Mention Tool State
  const [mentionQuery, setMentionQuery] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dragging & Interaction State
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerFileInputRef = useRef<HTMLInputElement>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPointerOffset, setDragPointerOffset] = useState({ x: 0, y: 0 });
  const [snapGuides, setSnapGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  // Touch gesture tracking for pinch-to-zoom & two-finger rotate (Mobile < 1000px)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const rotateStartAngleRef = useRef<number | null>(null);
  const rotateStartDegRef = useRef<number>(0);

  // Desktop Window-like Resizing State (PC >= 1000px)
  const [resizingData, setResizingData] = useState<{
    overlayId: string;
    handle: 'e' | 'w' | 's' | 'n' | 'se' | 'sw' | 'ne' | 'nw';
    startX: number;
    startY: number;
    startScale: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const audioUrlRef = useRef<string | null>(null);

  // Clean up blob URLs when editor closes or unmounts
  useEffect(() => {
    return () => {
      if (mediaUrl && mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [mediaUrl]);

  useEffect(() => {
    if (!isOpen) {
      if (mediaUrl && mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, [isOpen, mediaUrl]);

  // Preload custom fonts on open
  useEffect(() => {
    if (isOpen) {
      void preloadStoryFonts();
    } else {
      setErrorMessage(null);
      setShowStickerSheet(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // File selection & Smart Palette extraction
  const handleFileSelect = async (file: File, isSticker = false) => {
    setErrorMessage(null);

    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');

    const maxMediaSize = 50 * 1024 * 1024; // 50MB max limit

    if (file.size > maxMediaSize) {
      setErrorMessage('File size must not exceed 50 MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (isSticker && isImage) {
      // Add as a new image sticker
      const stickerOverlay: ImageOverlay = {
        id: uid(8),
        type: 'image',
        url: previewUrl,
        xPercent: 50,
        yPercent: 50,
        scale: 0.85,
        rotation: 0,
        borderRadius: 20,
        zIndex: overlays.length + 1,
      };
      addOverlay(stickerOverlay);
      setShowStickerSheet(false);
      return;
    }

    if (isVideo) {
      const tempVideo = document.createElement('video');
      tempVideo.src = previewUrl;
      tempVideo.onloadedmetadata = () => {
        // Soft auto-trimming to 30s instead of blocking error
        setMedia(file, previewUrl, 'VIDEO');
      };
      tempVideo.onerror = () => {
        setErrorMessage('Failed to read video file');
      };
    } else if (isAudio) {
      setMedia(file, previewUrl, 'VOICE');
    } else {
      // Photo selected: auto-extract Smart Palette from local file without CORS taint!
      setMedia(file, previewUrl, 'IMAGE');
      const smartGradient = await extractDominantGradient(file);
      setBackgroundColor(smartGradient);

      // Add image as movable/scalable overlay so it's fully editable like in Instagram!
      const existingMainImage = overlays.find(
        (o) => o.type === 'image' && (o as ImageOverlay).isMainMedia,
      );
      if (existingMainImage) {
        updateOverlay(existingMainImage.id, { url: previewUrl });
      } else {
        const mainImageOverlay: ImageOverlay = {
          id: uid(8),
          type: 'image',
          url: previewUrl,
          isMainMedia: true,
          xPercent: 50,
          yPercent: 50,
          scale: 1,
          rotation: 0,
          borderRadius: 24,
          zIndex: 2,
        };
        addOverlay(mainImageOverlay);
      }
    }
  };

  // Cycle gradient preset manually
  const handleCycleGradient = () => {
    const nextIndex = (gradientIndex + 1) % GRADIENT_PRESETS.length;
    setGradientIndex(nextIndex);
    setBackgroundColor(GRADIENT_PRESETS[nextIndex]);
  };

  // Open Text Editor for creating new or editing existing
  const handleOpenTextEditor = (existing?: TextOverlay) => {
    if (existing) {
      setTextInput(existing.text);
      setTextColor(existing.color || '#ffffff');
      setTextBgColor(existing.backgroundColor || '#000000');
      setFontFamily((existing.fontFamily as StoryFontId) || 'modern');
      setBgStyle(existing.backgroundStyle || 'none');
      setFontSizeCqw(existing.fontSizeCqw || 6.5);
      setTextAlign(existing.textAlign || 'center');
      setTextAnimation((existing.animation as StoryAnimationId) || 'none');
      setIsItalic(existing.fontStyle === 'italic');
    } else {
      setTextInput('');
      setTextColor('#ffffff');
      setTextBgColor('#000000');
      setFontFamily('modern');
      setBgStyle('none');
      setFontSizeCqw(6.5);
      setTextAlign('center');
      setTextAnimation('none');
      setIsItalic(false);
    }
    setActiveTextTab('font');
    setActiveTool('text');
  };

  // Submit Text Overlay
  const handleSaveText = () => {
    if (!textInput.trim()) {
      setActiveTool('none');
      return;
    }

    const currentSelected = overlays.find((o) => o.id === selectedOverlayId);
    if (currentSelected && currentSelected.type === 'text') {
      updateOverlay(currentSelected.id, {
        text: textInput.trim(),
        color: textColor,
        backgroundColor: textBgColor,
        fontFamily,
        backgroundStyle: bgStyle,
        fontSizeCqw,
        textAlign,
        animation: textAnimation,
        fontStyle: isItalic ? 'italic' : 'normal',
      });
    } else {
      const newOverlay: TextOverlay = {
        id: uid(8),
        type: 'text',
        text: textInput.trim(),
        xPercent: 50,
        yPercent: 45,
        scale: 1,
        rotation: 0,
        color: textColor,
        backgroundColor: textBgColor,
        fontFamily,
        backgroundStyle: bgStyle,
        fontSize: 24,
        fontSizeCqw,
        textAlign,
        animation: textAnimation,
        fontStyle: isItalic ? 'italic' : 'normal',
        zIndex: overlays.length + 1,
      };
      addOverlay(newOverlay);
    }

    setTextInput('');
    setActiveTool('none');
  };

  // Submit Poll Overlay
  const handleAddPoll = () => {
    if (!pollQuestion.trim()) return;
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) return;

    const newOverlay: PollOverlay = {
      id: uid(8),
      type: 'poll',
      question: pollQuestion.trim(),
      options: validOptions.map((text) => ({ text: text.trim() })),
      xPercent: 50,
      yPercent: 50,
      scale: 1,
      rotation: 0,
      zIndex: overlays.length + 1,
    };

    addOverlay(newOverlay);
    setPollQuestion('');
    setPollOptions(['Yes', 'No']);
    setActiveTool('none');
  };

  // Submit Link Overlay
  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    let validUrl = linkUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`;
    }

    const newOverlay: LinkOverlay = {
      id: uid(8),
      type: 'link',
      url: validUrl,
      title: linkTitle.trim() || 'Link',
      xPercent: 50,
      yPercent: 65,
      scale: 1,
      rotation: 0,
      zIndex: overlays.length + 1,
    };

    addOverlay(newOverlay);
    setLinkUrl('');
    setLinkTitle('TAP HERE 🔥');
    setActiveTool('none');
  };

  // Submit Mention Overlay
  const handleAddMention = () => {
    if (!mentionQuery.trim()) return;
    const cleaned = mentionQuery.replace(/^@/, '').trim();

    const newOverlay: MentionOverlay = {
      id: uid(8),
      type: 'mention',
      username: cleaned,
      xPercent: 50,
      yPercent: 35,
      scale: 1,
      rotation: 0,
      zIndex: overlays.length + 1,
    };

    addOverlay(newOverlay);
    setMentionQuery('');
    setActiveTool('none');
  };

  // Start / Stop Voice Recording
  const _startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        audioUrlRef.current = url;
        setMedia(audioFile, url, 'VOICE');

        const audioOverlay: AudioOverlay = {
          id: uid(8),
          type: 'audio',
          title: 'Voice Story',
          audioUrl: url,
          duration: recordingSeconds,
          waveform: [40, 65, 85, 30, 95, 60, 45, 75, 90, 50, 60, 80],
          xPercent: 50,
          yPercent: 50,
          scale: 1,
          rotation: 0,
          zIndex: overlays.length + 1,
        };
        addOverlay(audioOverlay);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => {
          if (sec >= 59) {
            stopRecording();
            return 60;
          }
          return sec + 1;
        });
      }, 1000);
    } catch {
      setErrorMessage('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // --------------------------------------------------------------------------
  // POINTER & TOUCH GESTURE HANDLING (Drag, Snapping, Pinch, Rotate, Trash)
  // --------------------------------------------------------------------------
  const handleResizePointerDown = (
    e: React.PointerEvent,
    overlayId: string,
    handle: 'e' | 'w' | 's' | 'n' | 'se' | 'sw' | 'ne' | 'nw',
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const overlay = overlays.find((o) => o.id === overlayId);
    if (!overlay || !canvasRef.current) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const centerX = canvasRect.left + (overlay.xPercent / 100) * canvasRect.width;
    const centerY = canvasRect.top + (overlay.yPercent / 100) * canvasRect.height;

    setResizingData({
      overlayId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startScale: overlay.scale ?? 1,
      centerX,
      centerY,
    });
  };

  const handlePointerDown = (e: React.PointerEvent, overlayId: string) => {
    if (resizingData) return;
    e.stopPropagation();
    bringToFront(overlayId);
    setSelectedOverlayId(overlayId);

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture(e.pointerId);
    } catch {}

    // Multi-pointer gesture tracking strictly for touch devices (< 1000px mobile)
    if (e.pointerType === 'touch') {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    } else {
      activePointersRef.current.clear();
    }

    const overlay = overlays.find((o) => o.id === overlayId);
    if (!overlay || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentElemX = (overlay.xPercent / 100) * rect.width;
    const currentElemY = (overlay.yPercent / 100) * rect.height;

    setDragPointerOffset({
      x: e.clientX - rect.left - currentElemX,
      y: e.clientY - rect.top - currentElemY,
    });
    setDraggingId(overlayId);

    // Multitouch pinch & rotate strictly for touch events!
    if (e.pointerType === 'touch' && activePointersRef.current.size === 2) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = overlay.scale ?? 1;

      const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
      rotateStartAngleRef.current = angle;
      rotateStartDegRef.current = overlay.rotation ?? 0;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;

    // 1. Desktop Window-like Resizing Handler (PC >= 1000px)
    if (resizingData) {
      const currentDist = Math.hypot(
        e.clientX - resizingData.centerX,
        e.clientY - resizingData.centerY,
      );
      const startDist = Math.hypot(
        resizingData.startX - resizingData.centerX,
        resizingData.startY - resizingData.centerY,
      );
      if (startDist > 10) {
        const ratio = currentDist / startDist;
        const targetScale = Math.max(
          0.3,
          Math.min(3.5, Number((resizingData.startScale * ratio).toFixed(2))),
        );
        updateOverlay(resizingData.overlayId, { scale: targetScale });
      }
      return;
    }

    if (e.pointerType === 'touch' && activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (!draggingId) return;
    const overlay = overlays.find((o) => o.id === draggingId);
    if (!overlay) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // 2. Dual touch pointers: Pinch-to-zoom and Two-finger rotate (Mobile touch only)
    if (
      e.pointerType === 'touch' &&
      activePointersRef.current.size >= 2 &&
      pinchStartDistRef.current
    ) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const scaleDelta = dist / pinchStartDistRef.current;
      const newScale = Math.max(0.3, Math.min(3.5, pinchStartScaleRef.current * scaleDelta));

      let newDeg = overlay.rotation ?? 0;
      if (rotateStartAngleRef.current !== null) {
        const currentAngle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        const angleDelta = currentAngle - rotateStartAngleRef.current;
        const snapped = snapRotation(rotateStartDegRef.current + angleDelta);
        newDeg = snapped.deg;
      }

      updateOverlay(draggingId, {
        scale: Number(newScale.toFixed(2)),
        rotation: Math.round(newDeg),
      });
      return;
    }

    // 3. Single pointer: Drag with Magnetic Center Snapping (Mouse on PC or 1 finger on Mobile)
    // ONLY changes position (xPercent, yPercent). Scale and rotation remain completely untouched!
    const rawPixelX = e.clientX - rect.left - dragPointerOffset.x;
    const rawPixelY = e.clientY - rect.top - dragPointerOffset.y;

    const rawXPercent = (rawPixelX / rect.width) * 100;
    const rawYPercent = (rawPixelY / rect.height) * 100;

    const snapped = snapPosition(rawXPercent, rawYPercent, 2.5);
    setSnapGuides({ x: snapped.snapX, y: snapped.snapY });

    const clampedX = Math.max(0, Math.min(100, Math.round(snapped.x)));
    const clampedY = Math.max(0, Math.min(100, Math.round(snapped.y)));

    updateOverlay(draggingId, { xPercent: clampedX, yPercent: clampedY });

    // Drag-to-Trash Zone detection: bottom 18% of canvas
    if (clampedY >= 82) {
      setIsDraggingOverTrash(true);
    } else {
      setIsDraggingOverTrash(false);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (resizingData) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setResizingData(null);
    }

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
      rotateStartAngleRef.current = null;
    }

    if (draggingId) {
      if (isDraggingOverTrash) {
        removeOverlay(draggingId);
      }
      setDraggingId(null);
      setIsDraggingOverTrash(false);
      setSnapGuides({ x: false, y: false });

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
  };

  // Quick rotation nudge (±15°)
  const handleRotateNudge = (id: string, delta: number) => {
    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;
    const current = overlay.rotation ?? 0;
    const next = ((current + delta + 180) % 360) - 180;
    updateOverlay(id, { rotation: next });
  };

  // Publish Story
  const handlePublish = async (selectedPrivacy?: StoryPrivacy) => {
    const finalPrivacy = selectedPrivacy || privacy;

    // Clean up overlays before sending: exclude caption overlay (it is sent via caption field)
    // and strip temporary client blob: url for main media / stickers
    const finalOverlays = overlays
      .filter((o) => o.type !== 'caption')
      .map((o) => {
        if (o.type === 'image' && (o.isMainMedia || o.url?.startsWith('blob:'))) {
          return {
            ...o,
            url: undefined,
          };
        }
        if (o.type === 'audio') {
          const audioOverlay = o as AudioOverlay;
          return {
            ...audioOverlay,
            albumArt: audioOverlay.albumArt?.startsWith('blob:')
              ? undefined
              : audioOverlay.albumArt,
            audioUrl: audioOverlay.audioUrl?.startsWith('blob:') ? '' : audioOverlay.audioUrl,
          };
        }
        return o;
      });

    try {
      await createStoryMutation.mutateAsync({
        file: mediaFile ?? undefined,
        mediaType: mediaType,
        caption: caption.trim() || undefined,
        overlays: finalOverlays,
        privacy: finalPrivacy,
        backgroundColor: backgroundColor,
        filter: activeFilter !== 'none' ? activeFilter : undefined,
      });

      closeEditor();
    } catch {
      setErrorMessage('Error publishing story. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-2xl p-2 sm:p-4 select-none animate-fadeIn">
      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0], false);
        }}
      />
      <input
        ref={stickerFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0], true);
        }}
      />

      {/* Center 9:16 Story Frame Canvas Container */}
      <div className="relative flex flex-col items-center w-full max-w-[420px] h-full max-h-[96vh] justify-between py-1">
        {/* Error Alert Bar */}
        {errorMessage && (
          <div className="absolute top-2 z-50 px-4 py-2 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold text-center backdrop-blur-xl shadow-lg animate-shake">
            {errorMessage}
          </div>
        )}

        {/* 9:16 Story Canvas Preview */}
        <div
          ref={canvasRef}
          onPointerDown={() => setSelectedOverlayId(null)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            background: backgroundColor,
            containerType: 'inline-size',
            touchAction: 'none',
          }}
          className="relative w-full aspect-[9/16] max-h-[82vh] rounded-[36px] overflow-hidden border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col justify-between"
        >
          {/* Top Left Close (X) Button */}
          <div className="absolute top-4 left-4 z-40">
            <button
              type="button"
              onClick={closeEditor}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Vertical Right Floating Toolbar (Instagram Style) */}
          <div className="absolute top-4 right-3 z-40 flex flex-col items-end gap-2.5 pointer-events-auto">
            {/* 1. Aa Text Button */}
            <div className="flex items-center justify-end gap-2 w-full">
              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none"
                  >
                    Text
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => handleOpenTextEditor()}
                className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 text-base font-extrabold shrink-0"
                title="Add text"
              >
                <Type size={19} />
              </button>
            </div>

            {/* 2. Emoji Picker Button */}
            <div className="flex items-center justify-end gap-2 w-full">
              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none"
                  >
                    Stickers
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0 ${
                  isEmojiPickerOpen
                    ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : 'bg-black/45 hover:bg-black/65 text-white'
                }`}
                title="Choose emoji"
              >
                <Smile size={19} />
              </button>
            </div>

            {/* 3. Music Button */}
            <div className="flex items-center justify-end gap-2 w-full">
              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none"
                  >
                    Music
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setIsMusicModalOpen(true)}
                className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                title="Add music"
              >
                <Music size={19} />
              </button>
            </div>

            {/* 4. Filters (Sparkles) Button */}
            <div className="flex items-center justify-end gap-2 w-full">
              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none"
                  >
                    Filters
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0 ${
                  isFiltersOpen || activeFilter !== 'none'
                    ? 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                    : 'bg-black/45 hover:bg-black/65 text-white'
                }`}
                title="Effects and filters"
              >
                <Sparkles size={19} />
              </button>
            </div>

            {/* 5. Media Picker (Image/Video up to 50MB/30s) */}
            <div className="flex items-center justify-end gap-2 w-full">
              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none"
                  >
                    Media
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                title="Choose photo or video"
              >
                <ImageIcon size={19} />
              </button>
            </div>

            {/* 6-9. Unfolded Extra Tools with Spring Stagger Animation */}
            <AnimatePresence>
              {isMoreToolsOpen && (
                <motion.div
                  key="extra-tools-stack"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.02,
                      },
                    },
                    hidden: {
                      transition: {
                        staggerChildren: 0.035,
                        staggerDirection: -1,
                      },
                    },
                  }}
                  className="flex flex-col items-end gap-2.5 w-full"
                >
                  {/* 6. Mention (@) */}
                  <motion.div
                    variants={{
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: 'spring', damping: 18, stiffness: 300 },
                      },
                      hidden: {
                        opacity: 0,
                        y: -14,
                        scale: 0.6,
                        transition: { duration: 0.16, ease: 'easeInOut' },
                      },
                    }}
                    className="flex items-center justify-end gap-2 w-full"
                  >
                    <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none">
                      Mention
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTool('mention')}
                      className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                      title="Mention"
                    >
                      <AtSign size={19} />
                    </button>
                  </motion.div>

                  {/* 7. Drawing (Pencil) */}
                  <motion.div
                    variants={{
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: 'spring', damping: 18, stiffness: 300 },
                      },
                      hidden: {
                        opacity: 0,
                        y: -14,
                        scale: 0.6,
                        transition: { duration: 0.16, ease: 'easeInOut' },
                      },
                    }}
                    className="flex items-center justify-end gap-2 w-full"
                  >
                    <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none">
                      Drawing
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDrawingMode(true)}
                      className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                      title="Drawing"
                    >
                      <Pencil size={19} />
                    </button>
                  </motion.div>

                  {/* 8. Poll (BarChart2) */}
                  <motion.div
                    variants={{
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: 'spring', damping: 18, stiffness: 300 },
                      },
                      hidden: {
                        opacity: 0,
                        y: -14,
                        scale: 0.6,
                        transition: { duration: 0.16, ease: 'easeInOut' },
                      },
                    }}
                    className="flex items-center justify-end gap-2 w-full"
                  >
                    <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none">
                      Poll
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTool('poll')}
                      className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                      title="Poll"
                    >
                      <BarChart2 size={19} />
                    </button>
                  </motion.div>

                  {/* 9. Gradient Cycle (Palette) */}
                  <motion.div
                    variants={{
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: 'spring', damping: 18, stiffness: 300 },
                      },
                      hidden: {
                        opacity: 0,
                        y: -14,
                        scale: 0.6,
                        transition: { duration: 0.16, ease: 'easeInOut' },
                      },
                    }}
                    className="flex items-center justify-end gap-2 w-full"
                  >
                    <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none">
                      Background
                    </span>
                    <button
                      type="button"
                      onClick={handleCycleGradient}
                      className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                      title="Change gradient"
                    >
                      <Palette size={18} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 10. Expand / Collapse Trigger (ALWAYS at the very end!) */}
            <motion.div layout className="flex items-center justify-end gap-2 w-full">
              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-xl whitespace-nowrap select-none pointer-events-none"
                  >
                    Collapse
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-md active:scale-90 shrink-0"
                title={isMoreToolsOpen ? 'Collapse extra tools' : 'More tools'}
                aria-label={isMoreToolsOpen ? 'Collapse extra tools' : 'Expand extra tools'}
              >
                <motion.div
                  animate={{ rotate: isMoreToolsOpen ? 180 : 0 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 260 }}
                >
                  <ChevronDown size={18} />
                </motion.div>
              </button>
            </motion.div>
          </div>

          {/* Magnetic Snapping Guideline Indicators */}
          {snapGuides.x && (
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-cyan-400/80 border-l border-dashed border-cyan-300 z-30 pointer-events-none" />
          )}
          {snapGuides.y && (
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-cyan-400/80 border-t border-dashed border-cyan-300 z-30 pointer-events-none" />
          )}

          {/* Media Video Background with GPU accelerated filter */}
          {mediaUrl && mediaType === 'VIDEO' && (
            <div
              className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
              style={{
                filter: getStoryFilterCss(activeFilter),
                willChange: 'filter',
                transform: 'translateZ(0)',
              }}
            >
              <video
                src={mediaUrl}
                autoPlay
                loop
                muted={overlays.some((o) => o.type === 'audio') ? videoVolume === 0 : false}
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Audio Balance Control (when Video + Music Overlay present) */}
          {mediaType === 'VIDEO' && overlays.some((o) => o.type === 'audio') && (
            <div className="absolute top-4 left-16 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white text-[11px] shadow-2xl pointer-events-auto">
              <span className="text-gray-300">Video {videoVolume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={videoVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAudioVolumes(v, musicVolume);
                  const audioO = overlays.find((o) => o.type === 'audio');
                  if (audioO) updateOverlay(audioO.id, { videoVolume: v });
                }}
                className="w-12 h-1 accent-purple-400 cursor-pointer"
              />
              <span className="text-purple-300 ml-1">Music {musicVolume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setAudioVolumes(videoVolume, m);
                  const audioO = overlays.find((o) => o.type === 'audio');
                  if (audioO) updateOverlay(audioO.id, { musicVolume: m });
                }}
                className="w-12 h-1 accent-purple-400 cursor-pointer"
              />
            </div>
          )}

          {/* Voice recording in progress animation */}
          {isRecording && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-3 pointer-events-none z-30">
              <div className="w-16 h-16 rounded-full bg-red-500/30 border border-red-500 flex items-center justify-center animate-ping" />
              <div className="text-xl font-bold text-white tracking-widest font-mono">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </div>
              <p className="text-xs text-gray-300">Speak now... Voice recording in progress</p>
            </div>
          )}

          {/* Full-Frame Drawing Layer (Instagram-style fixed background layer) */}
          {overlays
            .filter((o): o is DrawingOverlay => o.type === 'drawing')
            .map((drawing) => (
              <div
                key={drawing.id}
                className="absolute inset-0 w-full h-full pointer-events-none z-[12]"
              >
                <StoryDrawingOverlayView overlay={drawing} />
              </div>
            ))}

          {/* Overlays Rendering on Canvas (Draggable stickers, excluding drawing) */}
          {overlays
            .filter((overlay) => overlay.type !== 'drawing')
            .map((overlay) => {
              const isSelected = selectedOverlayId === overlay.id;

              return (
                <div
                  key={overlay.id}
                  onPointerDown={(e) => handlePointerDown(e, overlay.id)}
                  style={{
                    left: `${overlay.xPercent}%`,
                    top: `${overlay.yPercent}%`,
                    transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg) scale(${
                      overlay.scale ?? 1
                    })`,
                    zIndex: overlay.zIndex ?? 1,
                    cursor: draggingId === overlay.id ? 'grabbing' : 'grab',
                  }}
                  className={`absolute transition-transform duration-75 touch-none group/item ${
                    isSelected
                      ? 'ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-black/50 rounded-2xl'
                      : ''
                  }`}
                >
                  {/* 1. Image Overlay (Main Photo or Sticker Photo with Filter) */}
                  {overlay.type === 'image' && overlay.url && (
                    <div
                      className="relative rounded-2xl overflow-hidden shadow-2xl"
                      style={{
                        filter: getStoryFilterCss(activeFilter),
                        willChange: 'filter',
                        transform: 'translateZ(0)',
                      }}
                    >
                      <img
                        src={overlay.url}
                        alt="Story Media"
                        className="max-w-[320px] max-h-[380px] object-cover pointer-events-none rounded-2xl select-none"
                      />
                    </div>
                  )}

                  {/* 2. Text Overlay */}
                  {overlay.type === 'text' && (
                    <div
                      onDoubleClick={() => handleOpenTextEditor(overlay)}
                      style={{
                        color: overlay.color || '#ffffff',
                        fontFamily: getStoryFontFamily(overlay.fontFamily),
                        fontSize: `${overlay.fontSizeCqw ?? 6.5}cqw`,
                        fontStyle: overlay.fontStyle || 'normal',
                        backgroundColor:
                          overlay.backgroundStyle === 'solid'
                            ? overlay.backgroundColor || '#000000'
                            : undefined,
                      }}
                      className={`px-4 py-2 rounded-2xl text-${
                        overlay.textAlign || 'center'
                      } whitespace-pre-wrap select-none font-bold leading-snug ${
                        overlay.animation === 'float'
                          ? 'story-anim-float'
                          : overlay.animation === 'bounce'
                            ? 'story-anim-bounce'
                            : overlay.animation === 'glow'
                              ? 'story-anim-glow'
                              : overlay.animation === 'wave'
                                ? 'story-anim-wave'
                                : overlay.animation === 'typewriter'
                                  ? 'story-anim-typewriter'
                                  : ''
                      } ${
                        overlay.backgroundStyle === 'solid'
                          ? 'shadow-xl'
                          : overlay.backgroundStyle === 'glass'
                            ? 'bg-white/20 backdrop-blur-xl border border-white/25 shadow-xl'
                            : overlay.backgroundStyle === 'highlight'
                              ? 'bg-amber-400 text-black font-black shadow-lg'
                              : overlay.backgroundStyle === 'neon'
                                ? 'bg-purple-600/80 border border-pink-400 shadow-[0_0_20px_rgba(168,85,247,0.8)]'
                                : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                      }`}
                    >
                      {overlay.text}
                    </div>
                  )}

                  {/* 3. Caption Overlay (with Avatar) */}
                  {overlay.type === 'caption' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white shadow-2xl">
                      <Avatar src={currentUser?.avatar} size="xs" />
                      <span className="text-xs font-semibold max-w-[180px] truncate">
                        {overlay.text}
                      </span>
                    </div>
                  )}

                  {/* 4. Poll Overlay */}
                  {overlay.type === 'poll' && (
                    <div className="w-[260px] bg-[#14141c]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5">
                      <span className="text-sm font-bold text-white text-center">
                        {overlay.question}
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {overlay.options.map((opt, i) => (
                          <div
                            key={i}
                            className="w-full py-2 px-3 rounded-2xl bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 text-center"
                          >
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Link Overlay */}
                  {overlay.type === 'link' && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-black font-extrabold text-xs shadow-[0_8px_25px_rgba(255,255,255,0.3)] tracking-wide">
                      <LinkIcon size={14} className="stroke-[3]" />
                      <span>{overlay.title}</span>
                    </div>
                  )}

                  {/* 6. Mention Overlay */}
                  {overlay.type === 'mention' && (
                    <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg">
                      <AtSign size={13} />
                      <span>{overlay.username}</span>
                    </div>
                  )}

                  {/* 7. Audio Overlay (SoundCloud Music or Voice) */}
                  {overlay.type === 'audio' && (
                    <StoryMusicStickerView
                      overlay={overlay as AudioOverlay}
                      isEditor={true}
                      isPlaying={true}
                    />
                  )}

                  {/* Selected Overlay Action Pill (PC only >= 1000px) */}
                  {isSelected && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="absolute -top-11 left-1/2 -translate-x-1/2 hidden min-[1000px]:flex items-center gap-1.5 bg-black/85 backdrop-blur-xl border border-white/20 rounded-full px-2 py-1 shadow-2xl pointer-events-auto z-40 animate-fadeIn"
                    >
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotateNudge(overlay.id, -15);
                        }}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Rotate -15°"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotateNudge(overlay.id, 15);
                        }}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Rotate +15°"
                      >
                        <RotateCw size={13} />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOverlay(overlay.id);
                          setSelectedOverlayId(null);
                        }}
                        className="w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  {/* Desktop Window-like Resize Handles (PC only >= 1000px) */}
                  {isSelected && (
                    <div className="hidden min-[1000px]:block pointer-events-auto">
                      {/* Outer Selection Border Glow */}
                      <div className="absolute -inset-2 border-2 border-cyan-400/80 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(34,211,238,0.35)]" />

                      {/* 1. Horizontal Left Edge Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'w')}
                        className="absolute -left-3 top-3 bottom-3 w-5 flex items-center justify-center cursor-ew-resize group/hw z-40 select-none touch-none"
                        title="Stretch/compress horizontally"
                      >
                        <div className="w-1.5 h-6 rounded-full bg-white/90 group-hover/hw:bg-cyan-400 group-hover/hw:scale-125 transition-all shadow-md" />
                      </div>

                      {/* 2. Horizontal Right Edge Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'e')}
                        className="absolute -right-3 top-3 bottom-3 w-5 flex items-center justify-center cursor-ew-resize group/he z-40 select-none touch-none"
                        title="Stretch/compress horizontally"
                      >
                        <div className="w-1.5 h-6 rounded-full bg-white/90 group-hover/he:bg-cyan-400 group-hover/he:scale-125 transition-all shadow-md" />
                      </div>

                      {/* 3. Vertical Top Edge Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'n')}
                        className="absolute -top-3 left-3 right-3 h-5 flex items-center justify-center cursor-ns-resize group/vn z-40 select-none touch-none"
                        title="Stretch/compress vertically"
                      >
                        <div className="h-1.5 w-6 rounded-full bg-white/90 group-hover/vn:bg-cyan-400 group-hover/vn:scale-125 transition-all shadow-md" />
                      </div>

                      {/* 4. Vertical Bottom Edge Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 's')}
                        className="absolute -bottom-3 left-3 right-3 h-5 flex items-center justify-center cursor-ns-resize group/vs z-40 select-none touch-none"
                        title="Stretch/compress vertically"
                      >
                        <div className="h-1.5 w-6 rounded-full bg-white/90 group-hover/vs:bg-cyan-400 group-hover/vs:scale-125 transition-all shadow-md" />
                      </div>

                      {/* 5. Top-Left Corner Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'nw')}
                        className="absolute -top-3 -left-3 w-5 h-5 flex items-center justify-center cursor-nwse-resize group/cnw z-40 select-none touch-none"
                        title="Resize"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-400 shadow-md group-hover/cnw:scale-125 transition-transform" />
                      </div>

                      {/* 6. Top-Right Corner Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'ne')}
                        className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center cursor-nesw-resize group/cne z-40 select-none touch-none"
                        title="Resize"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-400 shadow-md group-hover/cne:scale-125 transition-transform" />
                      </div>

                      {/* 7. Bottom-Left Corner Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'sw')}
                        className="absolute -bottom-3 -left-3 w-5 h-5 flex items-center justify-center cursor-nesw-resize group/csw z-40 select-none touch-none"
                        title="Resize"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-400 shadow-md group-hover/csw:scale-125 transition-transform" />
                      </div>

                      {/* 8. Bottom-Right Corner Handle */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, overlay.id, 'se')}
                        className="absolute -bottom-3 -right-3 w-5 h-5 flex items-center justify-center cursor-nwse-resize group/cse z-40 select-none touch-none"
                        title="Resize"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-400 shadow-md group-hover/cse:scale-125 transition-transform" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Drag to Trash Drop Zone at Bottom */}
          {draggingId && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-200">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${
                  isDraggingOverTrash
                    ? 'scale-125 bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse'
                    : 'bg-black/60 border-white/20 text-white/70 shadow-2xl'
                }`}
              >
                <Trash2 size={24} />
              </div>
            </div>
          )}

          {/* Stickers & Layer Sheet (Modal inside Canvas) */}
          {showStickerSheet && (
            <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-2xl flex flex-col justify-end p-4 animate-fadeIn">
              <div className="w-full bg-[#181822]/95 border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-sm font-bold text-white">Add to story</span>
                  <button
                    type="button"
                    onClick={() => setShowStickerSheet(false)}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => stickerFileInputRef.current?.click()}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ImageIcon size={18} className="text-pink-400" />
                    <span>Photo Sticker</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowStickerSheet(false);
                      setActiveTool('poll');
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <HelpCircle size={18} className="text-purple-400" />
                    <span>Poll</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowStickerSheet(false);
                      setActiveTool('link');
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LinkIcon size={18} className="text-cyan-400" />
                    <span>Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowStickerSheet(false);
                      setActiveTool('mention');
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <AtSign size={18} className="text-amber-400" />
                    <span>Mention</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* INSTAGRAM-STYLE FULL-SCREEN TEXT TOOL */}
          {/* ========================================================================= */}
          {activeTool === 'text' && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-4 animate-fadeIn">
              {/* Top Row: Clean Close & Done Buttons */}
              <div className="flex items-center justify-between w-full pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTool('none')}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                  title="Cancel"
                >
                  <X size={18} />
                </button>

                {/* Done Button (Apple Glass Pill) */}
                <button
                  type="button"
                  onClick={handleSaveText}
                  className="px-5 py-2 rounded-full bg-white text-black font-extrabold text-xs shadow-[0_4px_20px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* Center Work Area: Left Minimal Vertical Font Slider + Center Textarea */}
              <div className="relative flex items-center justify-center w-full flex-1 my-4 px-12">
                {/* Minimal Vertical Font-Size Slider on Left Edge */}
                <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-44 z-20">
                  <input
                    type="range"
                    min="3.5"
                    max="11.5"
                    step="0.2"
                    value={fontSizeCqw}
                    onChange={(e) => setFontSizeCqw(parseFloat(e.target.value))}
                    className="w-36 h-1 accent-white bg-white/25 rounded-full -rotate-90 cursor-pointer origin-center"
                    title="Text size"
                  />
                </div>

                {/* Center Text Display & Textarea */}
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type text..."
                  autoFocus
                  rows={3}
                  style={{
                    color: textColor,
                    fontFamily: getStoryFontFamily(fontFamily),
                    fontSize: `${fontSizeCqw}cqw`,
                    fontStyle: isItalic ? 'italic' : 'normal',
                    backgroundColor: bgStyle === 'solid' ? textBgColor : undefined,
                  }}
                  className={`w-full max-w-[300px] bg-transparent text-${textAlign} font-bold resize-none focus:outline-none placeholder-white/40 leading-snug transition-all ${
                    textAnimation === 'float'
                      ? 'story-anim-float'
                      : textAnimation === 'bounce'
                        ? 'story-anim-bounce'
                        : textAnimation === 'glow'
                          ? 'story-anim-glow'
                          : textAnimation === 'wave'
                            ? 'story-anim-wave'
                            : textAnimation === 'typewriter'
                              ? 'story-anim-typewriter'
                              : ''
                  } ${
                    bgStyle === 'solid'
                      ? 'px-4 py-2.5 rounded-2xl shadow-2xl'
                      : bgStyle === 'glass'
                        ? 'px-4 py-2.5 rounded-2xl bg-white/20 backdrop-blur-2xl border border-white/25 shadow-2xl'
                        : bgStyle === 'highlight'
                          ? 'px-4 py-2.5 rounded-2xl bg-amber-400 text-black font-black shadow-lg'
                          : bgStyle === 'neon'
                            ? 'px-4 py-2.5 rounded-2xl bg-purple-600/80 border border-pink-400 shadow-[0_0_25px_rgba(168,85,247,0.8)]'
                            : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                  }`}
                />
              </div>

              {/* Bottom Controls: Active Drawer + 6-Icon Toolbar */}
              <div className="flex flex-col gap-2.5">
                {/* 1. Drawer Above Toolbar with isolated horizontal wheel scroll */}
                {activeTextTab === 'font' && (
                  <div
                    onWheel={handleHorizontalWheel}
                    className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none justify-start sm:justify-center animate-fadeIn"
                  >
                    {STORY_FONTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontFamily(f.id)}
                        style={{ fontFamily: getStoryFontFamily(f.id) }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          fontFamily === f.id
                            ? 'bg-white text-black shadow-lg scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeTextTab === 'animation' && (
                  <div
                    onWheel={handleHorizontalWheel}
                    className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none justify-start sm:justify-center animate-fadeIn"
                  >
                    {STORY_ANIMATIONS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setTextAnimation(a.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          textAnimation === a.id
                            ? 'bg-white text-black shadow-lg scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/10'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeTextTab === 'color' && (
                  <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 animate-fadeIn">
                    {bgStyle !== 'none' && (
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => setColorTarget('text')}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            colorTarget === 'text'
                              ? 'bg-white text-black shadow'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          Text Color
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorTarget('background')}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            colorTarget === 'background'
                              ? 'bg-white text-black shadow'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          Background Color
                        </button>
                      </div>
                    )}
                    <div
                      onWheel={handleHorizontalWheel}
                      className="flex items-center gap-2 overflow-x-auto py-1 px-1 justify-start sm:justify-center scrollbar-none"
                    >
                      {COLOR_PALETTE.map((c) => {
                        const activeColor = colorTarget === 'text' ? textColor : textBgColor;
                        const isSelected = activeColor.toLowerCase() === c.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              if (colorTarget === 'text') setTextColor(c);
                              else setTextBgColor(c);
                            }}
                            style={{ backgroundColor: c }}
                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer shrink-0 ${
                              isSelected
                                ? 'scale-125 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                                : 'border-white/30 hover:scale-110'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Instagram 6-Icon Toolbar */}
                <div className="flex items-center justify-between bg-[#1c1c26]/90 backdrop-blur-2xl border border-white/15 rounded-full px-3 py-1.5 shadow-2xl max-w-[340px] mx-auto w-full">
                  {/* 1. Font Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTextTab(activeTextTab === 'font' ? 'none' : 'font')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeTextTab === 'font'
                        ? 'bg-white text-black shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                    title="Fonts"
                  >
                    <span className="text-sm font-extrabold">Aa</span>
                  </button>

                  {/* 2. Color Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTextTab(activeTextTab === 'color' ? 'none' : 'color')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeTextTab === 'color' ? 'bg-white/20 scale-105' : 'hover:scale-105'
                    }`}
                    title="Color"
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white shadow-sm"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      }}
                    />
                  </button>

                  {/* 3. Slant / Italic Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsItalic((prev) => !prev)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isItalic ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
                    }`}
                    title="Italic text"
                  >
                    <span className="text-xs font-black italic tracking-tighter">//A</span>
                  </button>

                  {/* 4. Animation Tab */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTextTab(activeTextTab === 'animation' ? 'none' : 'animation')
                    }
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeTextTab === 'animation'
                        ? 'bg-white text-black shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                    title="Animations"
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs font-black">A</span>
                      <Sparkles
                        size={11}
                        className={activeTextTab === 'animation' ? 'text-black' : 'text-pink-400'}
                      />
                    </div>
                  </button>

                  {/* 5. Alignment Cycle */}
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        textAlign === 'center' ? 'left' : textAlign === 'left' ? 'right' : 'center';
                      setTextAlign(next);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                    title="Alignment"
                  >
                    {textAlign === 'left' ? (
                      <AlignLeft size={17} />
                    ) : textAlign === 'right' ? (
                      <AlignRight size={17} />
                    ) : (
                      <AlignCenter size={17} />
                    )}
                  </button>

                  {/* 6. Background Style Cycle */}
                  <button
                    type="button"
                    onClick={() => {
                      const styles: ('none' | 'solid' | 'glass' | 'highlight' | 'neon')[] = [
                        'none',
                        'solid',
                        'glass',
                        'highlight',
                        'neon',
                      ];
                      const nextStyle = styles[(styles.indexOf(bgStyle) + 1) % styles.length];
                      setBgStyle(nextStyle);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer"
                    title="Background style"
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-black border transition-all ${
                        bgStyle !== 'none'
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'border-white/60 text-white hover:border-white'
                      }`}
                    >
                      A
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Poll Tool Dialog */}
          {activeTool === 'poll' && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-center items-center p-4 animate-fadeIn">
              <div className="w-full max-w-[290px] bg-[#16161f] border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider text-center">
                  New Poll
                </span>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-semibold text-center"
                />

                <div className="flex flex-col gap-2">
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none text-center"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTool('none')}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPoll}
                    className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Link Tool Dialog */}
          {activeTool === 'link' && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-center items-center p-4 animate-fadeIn">
              <div className="w-full max-w-[290px] bg-[#16161f] border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider text-center">
                  Link Sticker
                </span>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL (https://...)"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Sticker text (e.g. SHOP NOW 🔥)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTool('none')}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="flex-1 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Attach
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Mention Tool Dialog */}
          {activeTool === 'mention' && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-center items-center p-4 animate-fadeIn">
              <div className="w-full max-w-[290px] bg-[#16161f] border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider text-center">
                  Mention
                </span>
                <input
                  type="text"
                  value={mentionQuery}
                  onChange={(e) => setMentionQuery(e.target.value)}
                  placeholder="@username"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 text-center font-bold"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTool('none')}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMention}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Mention
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Emoji Picker Popover */}
          {isEmojiPickerOpen && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-x-4 bottom-20 z-50 flex justify-center animate-fadeIn"
            >
              <div className="relative shadow-2xl rounded-3xl overflow-hidden border border-white/20 bg-[#161622]/95 backdrop-blur-2xl p-1">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-bold text-white">Choose emoji sticker</span>
                  <button
                    type="button"
                    onClick={() => setIsEmojiPickerOpen(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <Suspense
                  fallback={
                    <div className="w-[300px] h-[340px] flex items-center justify-center text-white/50 text-xs">
                      <Loader2 className="animate-spin" size={20} />
                    </div>
                  }
                >
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      const newOverlay: TextOverlay = {
                        id: uid(8),
                        type: 'text',
                        text: emojiData.emoji,
                        xPercent: 50,
                        yPercent: 50,
                        scale: 1.5,
                        rotation: 0,
                        color: '#ffffff',
                        backgroundColor: 'transparent',
                        fontFamily: 'modern',
                        backgroundStyle: 'none',
                        fontSize: 48,
                        fontSizeCqw: 12,
                        textAlign: 'center',
                        animation: 'none',
                        fontStyle: 'normal',
                        zIndex: overlays.length + 1,
                      };
                      addOverlay(newOverlay);
                      setIsEmojiPickerOpen(false);
                    }}
                    theme={'dark' as EmojiTheme}
                    lazyLoadEmojis
                    previewConfig={{ showPreview: false }}
                    height={330}
                    width={300}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Filters Carousel (Instagram Style at Bottom of Canvas) */}
          {isFiltersOpen && (
            <div className="absolute inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-6 pb-4 animate-fadeIn">
              <StoryFiltersCarousel
                activeFilterId={activeFilter}
                onSelectFilter={(id) => setActiveFilter(id)}
                onClose={() => setIsFiltersOpen(false)}
              />
            </div>
          )}

          {/* Full-Screen HiDPI Drawing Canvas Mode */}
          {isDrawingMode && (
            <div className="absolute inset-0 z-50">
              <StoryDrawingCanvas
                initialStrokes={
                  (overlays.find((o) => o.type === 'drawing') as DrawingOverlay | undefined)
                    ?.strokes || []
                }
                onSave={(strokes) => {
                  const existing = overlays.find((o) => o.type === 'drawing');
                  if (strokes.length === 0) {
                    if (existing) {
                      removeOverlay(existing.id);
                    }
                  } else {
                    if (existing) {
                      updateOverlay(existing.id, { strokes });
                    } else {
                      const newDrawing: DrawingOverlay = {
                        id: uid(8),
                        type: 'drawing',
                        strokes,
                        xPercent: 0,
                        yPercent: 0,
                        scale: 1,
                        rotation: 0,
                        zIndex: 12,
                      };
                      addOverlay(newDrawing);
                    }
                  }
                  setIsDrawingMode(false);
                }}
                onCancel={() => setIsDrawingMode(false)}
              />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ACTION BAR (Instagram / Apple Liquid Glass) - Hides when Filters are open */}
        {/* ========================================================================= */}
        {!isFiltersOpen && (
          <div className="w-full flex flex-col gap-2 mt-2 z-30 animate-fadeIn">
            {/* Caption Input Pill */}
            <div className="relative w-full">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white placeholder-white/50 text-xs font-medium focus:outline-none focus:border-white/30 backdrop-blur-xl transition-all shadow-lg"
              />
            </div>

            {/* Three Balanced Bottom Action Buttons */}
            <div className="w-full flex items-center justify-between gap-2.5">
              {/* 1. Your story button */}
              <button
                type="button"
                disabled={createStoryMutation.isPending}
                onClick={() => handlePublish('ALL_FOLLOWERS')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50 backdrop-blur-xl"
              >
                {createStoryMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                ) : (
                  <Avatar src={currentUser?.avatar} size="xs" />
                )}
                <span className="truncate">Your story</span>
              </button>

              {/* 2. Close friends button */}
              <button
                type="button"
                disabled={createStoryMutation.isPending}
                onClick={() => handlePublish('CLOSE_FRIENDS')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50 backdrop-blur-xl"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-[10px] shadow-sm">
                  ★
                </div>
                <span className="truncate">Close Friends</span>
              </button>

              {/* 3. Circular Forward Arrow Button (Signature Purple) */}
              <button
                type="button"
                disabled={createStoryMutation.isPending}
                onClick={() => handlePublish()}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(168,85,247,0.6)] cursor-pointer disabled:opacity-50 shrink-0"
                title="Share"
              >
                <ArrowRight size={20} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Music Search Modal */}
      <StoryMusicSearchModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        onSelectTrack={(track) => {
          const newOverlay: AudioOverlay = {
            id: uid(8),
            type: 'audio',
            title: track.title,
            artist: track.artist,
            albumArt: track.albumArt,
            audioUrl: track.streamUrl || track.audioUrl || '',
            musicStyle: track.musicStyle || 'card',
            stickerColor: track.stickerColor,
            startTimeMs: track.startTimeMs ?? 0,
            clipDurationSeconds: track.clipDurationSeconds ?? 15,
            waveform: [45, 75, 90, 60, 100, 80, 55, 70, 95, 60, 40, 85],
            xPercent: 50,
            yPercent: 75,
            scale: 1,
            rotation: 0,
            videoVolume: 0, // Auto-mute video by default!
            musicVolume: 100,
            zIndex: overlays.length + 1,
          };
          addOverlay(newOverlay);
          setAudioVolumes(0, 100);
          setIsMusicModalOpen(false);
        }}
      />
    </div>
  );
}
