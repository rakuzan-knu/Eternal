import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Palette,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Bookmark,
  RotateCw,
  Plus,
  Trash2,
  Sliders,
  Upload,
  Layers,
  Eye,
  CheckCheck,
  Smartphone,
  Monitor,
  RefreshCcw,
  Pipette,
  Dices,
  Send,
  Share2,
  Download,
  Copy,
  Wand2,
  Flame,
  Heart,
  SmilePlus,
  Waves,
  Zap,
  Volume2,
  Compass,
  Film,
  ShieldCheck,
  Radio,
  Pencil,
  Shapes,
  Type,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../../../shared/ui/Modal';
import { BubbleTail } from './BubbleTail';
import { BubbleDecoration } from './BubbleDecoration';
import {
  BUBBLE_SHAPE_PRESETS,
  BUILT_IN_BUBBLE_PRESETS,
  BUILT_IN_PRESETS,
  BubbleShapePreset,
  BubbleShapeType,
  CHAT_FONTS,
  CHAT_TEXT_EFFECTS,
  ChatFontMeta,
  ChatTextEffectOption,
  ChatThemeConfig,
  DEFAULT_DARK_THEME_CONFIG,
  DISCORD_TEXT_COLORS,
  PROCEDURAL_SHADER_PRESETS,
  PresetBubble,
  PresetTheme,
  RecentWallpaperItem,
  ShaderWallpaperPreset,
} from '../model/chatTheme';
import {
  addRecentWallpaper,
  decodeThemeCode,
  deleteCustomPreset,
  deleteRecentWallpaper,
  encodeThemeCode,
  extractDominantColorsFromImage,
  generateHarmonicGradient,
  getBubbleContrastTheme,
  getBubbleStyle,
  getBubbleShapeStyles,
  getChatBackgroundStyle,
  getCustomPresets,
  getRecentWallpapers,
  getThemeTextStyle,
  parseChatTheme,
  sanitizeAndValidateSvg,
  saveCustomPreset,
  serializeChatTheme,
  triggerHapticFeedback,
  updateMetaThemeColor,
} from '../lib/themeUtils';
import { preloadTextTabFonts } from '../lib/fontLoader';
import { useChatTheme } from '../model/useChatTheme';
import { chatApi } from '../api/chatApi';
import { useRecentReactions } from '../model/useRecentReactions';
import { triggerReactionBurst } from '../lib/reactionBurstEngine';
import { idbDelete } from '../../../shared/lib/indexedDbStorage';
import ProceduralChatBackground from './ProceduralChatBackground';

interface SelectThemeModalProps {
  conversationId: string;
  currentTheme?: string;
  sharedTheme?: string | null;
  onClose: () => void;
}

type TabType = 'background' | 'bubbles' | 'text' | 'presets' | 'custom_presets';
type BackgroundSubMode = 'solid' | 'gradient' | 'shader' | 'image';

const SOLID_PALETTE = [
  { name: 'Eternal Dark', color: '#0b0b0c' },
  { name: 'Pure Black (OLED)', color: '#000000' },
  { name: 'Discord Slate', color: '#1e1f29' },
  { name: 'Deep Slate', color: '#0f172a' },
  { name: 'Midnight Violet', color: '#180a2a' },
  { name: 'Deep Forest', color: '#051b14' },
  { name: 'Cyberpunk Dark', color: '#1a0624' },
  { name: 'Clean White', color: '#f8fafc' },
];

const PRESET_ANGLES = [45, 90, 135, 180, 225, 270, 315];

const TABS: {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}[] = [
  { id: 'background', label: 'Chat Background', icon: Palette },
  { id: 'bubbles', label: 'Message Bubbles', icon: MessageSquare },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'presets', label: 'Presets', icon: Sparkles },
  { id: 'custom_presets', label: 'My Themes', icon: Bookmark },
];

interface TestMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  time: string;
  replySnippet?: string;
  reactions: { [emoji: string]: number };
}

function RecentWallpaperThumb({ item }: { item: RecentWallpaperItem }) {
  const [hasError, setHasError] = useState(false);

  if (item.type === 'shader') {
    return <div className="w-full h-full" style={{ background: item.previewBg || '#1e0533' }} />;
  }

  if (item.url && !hasError) {
    return (
      <img
        src={item.url}
        alt={item.name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return <ImageIcon size={18} className="text-gray-400" />;
}

export default function SelectThemeModal({
  conversationId,
  currentTheme = 'default',
  sharedTheme,
  onClose,
}: SelectThemeModalProps) {
  const { theme, isLoading, applyTheme, revertTheme } = useChatTheme(
    conversationId,
    currentTheme,
    sharedTheme,
  );
  const { dockReactions } = useRecentReactions();

  // Store initial original theme for comparison (deep clone so no edits mutate it)
  const initialThemeRef = useRef<ChatThemeConfig>(
    JSON.parse(JSON.stringify(parseChatTheme(currentTheme))),
  );
  // Preview comparison mode: 'draft' (new changes) | 'initial' (before changes) | 'default' (clean dark default)
  const [previewMode, setPreviewMode] = useState<'draft' | 'initial' | 'default'>('draft');
  const isInitialThemeLoadedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<TabType>('background');
  const [bgSubMode, setBgSubMode] = useState<BackgroundSubMode>('solid');
  const [bubbleSubTab, setBubbleSubTab] = useState<'gradient' | 'solid' | 'custom'>('custom');
  const [customCategoryFilter, setCustomCategoryFilter] = useState<'all' | 'animals' | 'fx'>('all');
  const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor');

  // Working theme state inside editor
  const [draftTheme, setDraftTheme] = useState<ChatThemeConfig>(() => {
    return JSON.parse(JSON.stringify(initialThemeRef.current));
  });

  // Toggles
  const [applyToAll, setApplyToAll] = useState(false);
  const [syncDevices, setSyncDevices] = useState(true);

  // Custom presets & Recent wallpapers lists
  const [customPresets, setCustomPresets] = useState<PresetTheme[]>([]);
  const [customPresetName, setCustomPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [recentWallpapers, setRecentWallpapers] = useState<RecentWallpaperItem[]>([]);

  // Sync initial loaded theme from hook once loaded from IDB / server
  useEffect(() => {
    if (!isLoading && theme && !isInitialThemeLoadedRef.current) {
      const cloned = JSON.parse(JSON.stringify(theme)) as ChatThemeConfig;
      initialThemeRef.current = cloned;
      setDraftTheme(cloned);
      isInitialThemeLoadedRef.current = true;
    }
  }, [isLoading, theme]);

  // Smart Helpers: Magic Color Match & Randomizer feedback
  const [magicPalette, setMagicPalette] = useState<string[]>([]);
  const [randomSchemeNotice, setRandomSchemeNotice] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Browser capability check for EyeDropper
  const [isEyeDropperSupported, setIsEyeDropperSupported] = useState(false);

  // Theme Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Interactive Live Preview State
  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState<TestMessage[]>([
    {
      id: 'm1',
      sender: 'other',
      text: 'Hey! How do you like this chat theme? ✨',
      time: '12:40',
      reactions: { '🔥': 2 },
    },
    {
      id: 'm2',
      sender: 'me',
      text: 'Wow, this looks amazing! The colors and bubbles are perfectly adjusted. 🚀',
      time: '12:41',
      replySnippet: 'Hey! How do you like...',
      reactions: { '❤️': 1 },
    },
  ]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const [hoveredFont, setHoveredFont] = useState<string | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  // Preload fonts on-demand when user opens the Text tab
  useEffect(() => {
    if (activeTab === 'text') {
      preloadTextTabFonts();
    }
  }, [activeTab]);

  // Check browser EyeDropper support
  useEffect(() => {
    setIsEyeDropperSupported(typeof window !== 'undefined' && 'EyeDropper' in window);
  }, []);

  // Load custom presets and recent wallpapers on mount
  useEffect(() => {
    getCustomPresets().then(setCustomPresets);
    getRecentWallpapers().then(setRecentWallpapers);
  }, []);

  // Sync mobile <meta name="theme-color"> in real-time
  useEffect(() => {
    updateMetaThemeColor(draftTheme);
  }, [draftTheme]);

  // Initialize submode based on draftTheme backgroundType
  useEffect(() => {
    if (draftTheme.backgroundType === 'shader') setBgSubMode('shader');
    else if (draftTheme.backgroundType === 'image') setBgSubMode('image');
    else if (draftTheme.backgroundType === 'gradient') setBgSubMode('gradient');
    else setBgSubMode('solid');
  }, [draftTheme.backgroundType]);

  // Extract palette whenever image background is loaded
  useEffect(() => {
    if (draftTheme.backgroundType === 'image' && draftTheme.bgImageUrl) {
      extractDominantColorsFromImage(draftTheme.bgImageUrl, 4).then((palette) => {
        if (palette && palette.length > 0) {
          setMagicPalette(palette);
        }
      });
    } else {
      setMagicPalette([]);
    }
  }, [draftTheme.backgroundType, draftTheme.bgImageUrl]);

  // Scroll to bottom of preview when new test message is added
  useEffect(() => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
    }
  }, [testMessages]);

  // EyeDropper handler
  const handleEyeDrop = async (callback: (hex: string) => void) => {
    if (isEyeDropperSupported) {
      try {
        const eyeDropper = new (
          window as unknown as {
            EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
          }
        ).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          triggerHapticFeedback(8);
          callback(result.sRGBHex);
        }
      } catch {
        // User cancelled eye dropper
      }
    }
  };

  // Magic Palette 1-Click apply
  const handleApplyMagicPalette = () => {
    if (magicPalette.length === 0) return;
    triggerHapticFeedback(12);
    const bubbleColors =
      magicPalette.length >= 2 ? magicPalette.slice(0, 3) : [magicPalette[0], '#6366f1'];
    setDraftTheme((prev) => ({
      ...prev,
      bubbleType: 'gradient',
      bubbleGradientColors: bubbleColors,
      bubbleGradientAngle: 135,
    }));
    setCopyToast('✨ Bubble colors matched to background!');
    setTimeout(() => setCopyToast(null), 2500);
  };

  // Angle changes with tactile haptic feedback
  const handleBgAngleChange = (newAngle: number) => {
    if (
      newAngle % 45 === 0 ||
      newAngle === 0 ||
      newAngle === 90 ||
      newAngle === 180 ||
      newAngle === 270 ||
      newAngle === 360
    ) {
      triggerHapticFeedback(6);
    }
    setDraftTheme((p) => ({ ...p, gradientAngle: newAngle }));
  };

  const handleBubbleAngleChange = (newAngle: number) => {
    if (
      newAngle % 45 === 0 ||
      newAngle === 0 ||
      newAngle === 90 ||
      newAngle === 180 ||
      newAngle === 270 ||
      newAngle === 360
    ) {
      triggerHapticFeedback(6);
    }
    setDraftTheme((p) => ({ ...p, bubbleGradientAngle: newAngle }));
  };

  // Random harmonic gradient generator
  const handleRandomizeBackgroundGradient = () => {
    triggerHapticFeedback(10);
    const harmonic = generateHarmonicGradient();
    setDraftTheme((prev) => ({
      ...prev,
      backgroundType: 'gradient',
      gradientColors: harmonic.colors,
      gradientAngle: harmonic.angle,
    }));
    setRandomSchemeNotice(`✨ ${harmonic.schemeName} (${harmonic.angle}°)`);
    setTimeout(() => setRandomSchemeNotice(null), 2200);
  };

  const handleRandomizeBubbleGradient = () => {
    triggerHapticFeedback(10);
    const harmonic = generateHarmonicGradient();
    setDraftTheme((prev) => ({
      ...prev,
      bubbleType: 'gradient',
      bubbleGradientColors: harmonic.colors,
      bubbleGradientAngle: harmonic.angle,
    }));
    setRandomSchemeNotice(`✨ ${harmonic.schemeName} (${harmonic.angle}°)`);
    setTimeout(() => setRandomSchemeNotice(null), 2200);
  };

  // Select Procedural WebGL Shader
  const handleSelectShader = async (preset: ShaderWallpaperPreset) => {
    triggerHapticFeedback(10);
    setDraftTheme((prev) => ({
      ...prev,
      backgroundType: 'shader',
      shaderPresetId: preset.id,
      audioReactive: prev.audioReactive ?? true,
      parallax3d: prev.parallax3d ?? true,
    }));

    // Save to Recent Wallpapers
    const updatedRecents = await addRecentWallpaper({
      type: 'shader',
      shaderId: preset.id,
      name: preset.name,
      previewBg: preset.previewGradient,
    });
    setRecentWallpapers(updatedRecents);
  };

  // Apply a Recent Wallpaper
  const handleSelectRecentWallpaper = (item: RecentWallpaperItem) => {
    triggerHapticFeedback(8);
    if (item.type === 'shader' && item.shaderId) {
      setDraftTheme((prev) => ({
        ...prev,
        backgroundType: 'shader',
        shaderPresetId: item.shaderId,
      }));
      setBgSubMode('shader');
    } else if (item.url) {
      setDraftTheme((prev) => ({
        ...prev,
        backgroundType: 'image',
        bgImageUrl: item.url,
      }));
      setBgSubMode('image');
    }
  };

  // Delete a Recent Wallpaper & purge from storage if orphaned
  const handleDeleteRecentWallpaper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback(8);

    const itemToDelete = recentWallpapers.find((w) => w.id === id);
    const updated = await deleteRecentWallpaper(id);
    setRecentWallpapers(updated);

    if (itemToDelete?.url) {
      const deletedUrl = itemToDelete.url;
      const isUsedInActiveTheme = theme?.bgImageUrl === deletedUrl;
      const isUsedInSavedPresets = customPresets.some((p) => p.config.bgImageUrl === deletedUrl);
      const isUsedInRemainingRecents = updated.some((w) => w.url === deletedUrl);

      // If it is NOT active on the chat background, NOT in saved presets, and NOT in remaining recents:
      if (!isUsedInActiveTheme && !isUsedInSavedPresets && !isUsedInRemainingRecents) {
        // 1. Reset draftTheme if currently previewing this deleted image
        if (draftTheme.bgImageUrl === deletedUrl) {
          setDraftTheme((prev) => ({
            ...prev,
            backgroundType:
              theme?.backgroundType && theme.backgroundType !== 'image'
                ? theme.backgroundType
                : 'solid',
            bgImageUrl: undefined,
            backgroundColor: theme?.backgroundColor || '#0b0b0c',
          }));
          if (bgSubMode === 'image') {
            setBgSubMode('solid');
          }
        }

        // 2. Revoke blob URL from memory if it's a blob
        if (deletedUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(deletedUrl);
          } catch {}
        }

        // 3. Clear from IndexedDB storage
        try {
          await idbDelete(deletedUrl);
        } catch {}
      }
    }
  };

  // Theme code copy (ensures custom image, bubbles, and text customizations are fully exported)
  const handleCopyThemeCode = async () => {
    triggerHapticFeedback(8);
    const themeToExport = { ...draftTheme };

    // If background image is a local blob URL, convert it to a portable data URL so it can be shared!
    if (themeToExport.bgImageUrl?.startsWith('blob:')) {
      try {
        const resp = await fetch(themeToExport.bgImageUrl);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        themeToExport.bgImageUrl = dataUrl;
      } catch (err) {
        console.warn('[SelectThemeModal] Failed to convert blob URL for export:', err);
      }
    }

    const code = encodeThemeCode(themeToExport);
    navigator.clipboard.writeText(code).then(() => {
      setCopyToast('📋 Theme code copied to clipboard!');
      setTimeout(() => setCopyToast(null), 2500);
    });
  };

  // Theme code import (restores background image, bubble, and text customizations)
  const handleImportThemeCode = async () => {
    if (!importCodeInput.trim()) return;
    const decoded = decodeThemeCode(importCodeInput);
    if (!decoded) {
      triggerHapticFeedback([10, 40, 10]);
      setImportError('Invalid or unsafe theme code');
      return;
    }
    triggerHapticFeedback(12);
    setDraftTheme(decoded);

    // If imported theme has a background image (custom or CDN), add it to recent wallpapers so user can re-use it!
    if (decoded.backgroundType === 'image' && decoded.bgImageUrl) {
      const updatedRecents = await addRecentWallpaper({
        type: decoded.bgImageUrl.toLowerCase().endsWith('.gif') ? 'gif' : 'image',
        url: decoded.bgImageUrl,
        name: decoded.name ? `${decoded.name} BG` : 'Imported Background',
        thumbnailUrl: decoded.bgImageUrl,
      });
      setRecentWallpapers(updatedRecents);
      setBgSubMode('image');
    } else if (decoded.backgroundType === 'shader' && decoded.shaderPresetId) {
      setBgSubMode('shader');
    } else if (decoded.backgroundType === 'gradient') {
      setBgSubMode('gradient');
    } else {
      setBgSubMode('solid');
    }

    setIsImportModalOpen(false);
    setImportCodeInput('');
    setImportError(null);
    setCopyToast('📥 Theme imported successfully!');
    setTimeout(() => setCopyToast(null), 2500);
  };

  // Handle color changes for background
  const handleSolidBgChange = (color: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      backgroundType: 'solid',
      backgroundColor: color,
    }));
  };

  const handleGradientColorChange = (index: number, color: string) => {
    setDraftTheme((prev) => {
      const colors = [...prev.gradientColors];
      colors[index] = color;
      return {
        ...prev,
        backgroundType: 'gradient',
        gradientColors: colors,
      };
    });
  };

  const handleAddGradientColor = () => {
    if (draftTheme.gradientColors.length >= 3) return;
    triggerHapticFeedback(8);
    setDraftTheme((prev) => ({
      ...prev,
      backgroundType: 'gradient',
      gradientColors: [...prev.gradientColors, '#ec4899'],
    }));
  };

  const handleRemoveGradientColor = (index: number) => {
    if (draftTheme.gradientColors.length <= 2) return;
    triggerHapticFeedback(8);
    setDraftTheme((prev) => {
      const colors = prev.gradientColors.filter((_, i) => i !== index);
      return {
        ...prev,
        backgroundType: 'gradient',
        gradientColors: colors,
      };
    });
  };

  // Handle color changes for message bubbles
  const handleBubbleColorChange = (color: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      bubbleType: 'solid',
      bubbleColor: color,
    }));
  };

  const handleIncomingBubbleColorChange = (color: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      incomingBubbleColor: color,
    }));
  };

  const handleBubbleGradientColorChange = (index: number, color: string) => {
    setDraftTheme((prev) => {
      const colors = [...(prev.bubbleGradientColors || ['#9333ea', '#6366f1'])];
      colors[index] = color;
      return {
        ...prev,
        bubbleType: 'gradient',
        bubbleGradientColors: colors,
      };
    });
  };

  const handleAddBubbleGradientColor = () => {
    const current = draftTheme.bubbleGradientColors || ['#9333ea', '#6366f1'];
    if (current.length >= 3) return;
    triggerHapticFeedback(8);
    setDraftTheme((prev) => ({
      ...prev,
      bubbleType: 'gradient',
      bubbleGradientColors: [...current, '#3b82f6'],
    }));
  };

  const handleRemoveBubbleGradientColor = (index: number) => {
    const current = draftTheme.bubbleGradientColors || ['#9333ea', '#6366f1'];
    if (current.length <= 2) return;
    triggerHapticFeedback(8);
    setDraftTheme((prev) => ({
      ...prev,
      bubbleType: 'gradient',
      bubbleGradientColors: current.filter((_, i) => i !== index),
    }));
  };

  // Upload image/GIF/SVG file with strict security sanitization
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      triggerHapticFeedback(10);

      let finalUrl = '';
      let durableUrl = '';

      const readFileAsDataUrl = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      // Check if SVG format -> validate & sanitize
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        const text = await file.text();
        const sanitizeResult = sanitizeAndValidateSvg(text);
        if (!sanitizeResult.isValid || !sanitizeResult.sanitizedSvg) {
          alert('Warning: The uploaded SVG contains unsupported or unsafe scripts.');
          return;
        }
        const base64Svg = btoa(unescape(encodeURIComponent(sanitizeResult.sanitizedSvg)));
        durableUrl = `data:image/svg+xml;base64,${base64Svg}`;
        finalUrl = durableUrl;
      } else {
        try {
          durableUrl = await readFileAsDataUrl(file);
          finalUrl = durableUrl;
        } catch {
          finalUrl = URL.createObjectURL(file);
        }
      }

      // If syncDevices is enabled and conversationId is available, upload to server CDN
      if (syncDevices && conversationId) {
        try {
          const uploadRes = await chatApi.uploadAttachment(conversationId, file);
          if (uploadRes?.url) {
            finalUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn(
            '[SelectThemeModal] Server upload failed, using local durable URL:',
            uploadErr,
          );
        }
      }

      setDraftTheme((prev) => ({
        ...prev,
        backgroundType: 'image',
        bgImageUrl: finalUrl,
      }));
      setBgSubMode('image');

      // Save to Recent Wallpapers
      const updatedRecents = await addRecentWallpaper({
        type: file.name.toLowerCase().endsWith('.gif') ? 'gif' : 'image',
        url: finalUrl,
        name: file.name,
        thumbnailUrl: finalUrl,
      });
      setRecentWallpapers(updatedRecents);
    } catch {
      const localBlobUrl = URL.createObjectURL(file);
      setDraftTheme((prev) => ({
        ...prev,
        backgroundType: 'image',
        bgImageUrl: localBlobUrl,
      }));
      setBgSubMode('image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Select Preset
  const handleSelectPreset = (preset: PresetTheme) => {
    triggerHapticFeedback(8);
    setDraftTheme({
      ...preset.config,
      id: preset.id,
      name: preset.name,
    });
  };

  // Select Bubble Preset
  const handleSelectBubblePreset = (bp: PresetBubble) => {
    triggerHapticFeedback(8);
    setDraftTheme((prev) => ({
      ...prev,
      bubbleType: bp.bubbleType,
      bubbleColor: bp.bubbleColor || prev.bubbleColor,
      bubbleGradientColors: bp.bubbleGradientColors || prev.bubbleGradientColors,
      bubbleGradientAngle: bp.bubbleGradientAngle ?? prev.bubbleGradientAngle,
      bubbleContinuousGradient: bp.bubbleContinuousGradient ?? prev.bubbleContinuousGradient,
    }));
  };

  // Save to custom presets
  const handleSaveToCustomPresets = async () => {
    const name = customPresetName.trim() || `My Theme ${customPresets.length + 1}`;
    setIsSavingPreset(true);
    triggerHapticFeedback(10);
    try {
      const updated = await saveCustomPreset(name, draftTheme);
      setCustomPresets(updated);
      setCustomPresetName('');
      setActiveTab('custom_presets');
    } finally {
      setIsSavingPreset(false);
    }
  };

  // Delete custom preset
  const handleDeleteCustomPreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback(8);
    const updated = await deleteCustomPreset(presetId);
    setCustomPresets(updated);
  };

  // Rename custom preset
  const handleSaveRename = async (presetId: string) => {
    const trimmed = editingPresetName.trim();
    if (!trimmed) {
      setEditingPresetId(null);
      return;
    }
    const target = customPresets.find((p) => p.id === presetId);
    if (!target) return;
    triggerHapticFeedback(8);
    const updatedPreset: PresetTheme = {
      ...target,
      name: trimmed,
      config: {
        ...target.config,
        name: trimmed,
      },
    };
    const updatedList = await saveCustomPreset(updatedPreset);
    setCustomPresets(updatedList);
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  // Interactive Live Preview: Send test message
  const handleSendTestMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    triggerHapticFeedback(8);
    const newMsg: TestMessage = {
      id: `test-${Date.now()}`,
      sender: 'me',
      text: testInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {},
    };

    setTestMessages((prev) => [...prev, newMsg]);
    setTestInput('');
  };

  // Interactive Live Preview: Click reaction
  const handlePreviewReaction = (
    messageId: string,
    emoji: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    // Trigger Telegram flying burst
    triggerReactionBurst(origin.x, origin.y, emoji);
    triggerHapticFeedback(10);

    setTestMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentCount = msg.reactions[emoji] || 0;
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            [emoji]: currentCount + 1,
          },
        };
      }),
    );
  };

  // Apply Theme
  const handleApply = async () => {
    setIsApplying(true);
    triggerHapticFeedback(12);
    try {
      await applyTheme(draftTheme, {
        applyToAll,
        syncDevices,
      });
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  // Revert Theme
  const handleRevert = async () => {
    setIsApplying(true);
    triggerHapticFeedback(10);
    try {
      setDraftTheme({ ...DEFAULT_DARK_THEME_CONFIG });
      initialThemeRef.current = { ...DEFAULT_DARK_THEME_CONFIG };
      setPreviewMode('draft');
      await revertTheme({ applyToAll, syncDevices });
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  // Propose as Shared Theme (Instagram Direct / Messenger style)
  const handleProposeSharedTheme = async () => {
    if (!conversationId) return;
    setIsProposing(true);
    triggerHapticFeedback(12);
    try {
      const themeToPropose = { ...draftTheme };

      // Convert local blob URL to durable portable format if needed so partner receives the image
      if (themeToPropose.bgImageUrl?.startsWith('blob:')) {
        try {
          const resp = await fetch(themeToPropose.bgImageUrl);
          const blob = await resp.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          themeToPropose.bgImageUrl = dataUrl;
        } catch (err) {
          console.warn('[SelectThemeModal] Failed to convert blob URL for proposal:', err);
        }
      }

      const serialized = serializeChatTheme(themeToPropose);
      await chatApi.proposeTheme(conversationId, serialized);
      setCopyToast('✨ Paired theme proposal sent to chat!');
      setTimeout(() => {
        setCopyToast(null);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send theme proposal';
      setCopyToast(`⚠️ ${msg}`);
      setTimeout(() => setCopyToast(null), 3500);
    } finally {
      setIsProposing(false);
    }
  };

  // Active theme for Live Preview rendering (supports Draft, Initial before edits, and Default dark)
  const displayTheme =
    previewMode === 'initial'
      ? initialThemeRef.current
      : previewMode === 'default'
        ? DEFAULT_DARK_THEME_CONFIG
        : draftTheme;

  const bgStyle = getChatBackgroundStyle(displayTheme);
  const outgoingBubble = getBubbleStyle(displayTheme, true);
  const incomingBubble = getBubbleStyle(displayTheme, false);
  const outgoingContrast = getBubbleContrastTheme(displayTheme, true);
  const incomingContrast = getBubbleContrastTheme(displayTheme, false);

  return (
    <Modal onClose={onClose} className="w-full max-w-5xl">
      {(close) => (
        <div className="bg-[#12131b]/95 border border-white/10 rounded-3xl w-full shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col max-h-[94vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400/40 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Palette size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Chat Theme Customizer</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Export / Share Theme Button */}
              <button
                type="button"
                onClick={handleCopyThemeCode}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition active:scale-95"
                title="Copy theme code to share with friends"
              >
                <Share2 size={13} />
                <span>Share Code</span>
              </button>

              {/* Import Theme Button */}
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/30 text-xs font-semibold text-purple-300 hover:text-purple-200 transition active:scale-95"
                title="Import theme by code"
              >
                <Download size={13} />
                <span>Import</span>
              </button>

              {/* Mobile View Switcher */}
              <div className="flex md:hidden items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('editor')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                    mobileViewMode === 'editor'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('preview')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                    mobileViewMode === 'preview'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>

              <button
                type="button"
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Toast Notification Banner */}
          <AnimatePresence>
            {copyToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold text-center shadow-lg border-b border-purple-400/30 flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                <span>{copyToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Body: Two columns on desktop */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Column: Editor Tabs & Controls */}
            <div
              className={`flex-1 flex flex-col min-h-0 border-r border-white/5 overflow-y-auto custom-scrollbar p-6 ${
                mobileViewMode === 'preview' ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Sliding Pill Tab Navigation Bar */}
              <div className="relative flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setActiveTab(tab.id);
                      }}
                      className={`relative flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 z-10 select-none ${
                        isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeThemeTabPill"
                          className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 border border-purple-400/40 rounded-xl shadow-lg shadow-purple-500/25 -z-10"
                          transition={{ type: 'spring', stiffness: 480, damping: 35 }}
                        />
                      )}
                      <Icon size={14} className="relative z-10" />
                      <span className="relative z-10 truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Chat Background */}
              {activeTab === 'background' && (
                <div className="space-y-6">
                  {/* Background Mode Selector */}
                  <div className="grid grid-cols-4 gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBgSubMode('solid');
                        setDraftTheme((p) => ({ ...p, backgroundType: 'solid' }));
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate ${
                        bgSubMode === 'solid'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBgSubMode('gradient');
                        setDraftTheme((p) => ({ ...p, backgroundType: 'gradient' }));
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate ${
                        bgSubMode === 'gradient'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Gradient
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBgSubMode('shader');
                        setDraftTheme((p) => ({
                          ...p,
                          backgroundType: 'shader',
                          shaderPresetId: p.shaderPresetId || 'neon-smoke',
                        }));
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate flex items-center justify-center gap-1 ${
                        bgSubMode === 'shader'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Sparkles size={11} className="text-purple-400" />
                      <span>Shaders</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBgSubMode('image');
                        setDraftTheme((p) => ({ ...p, backgroundType: 'image' }));
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate ${
                        bgSubMode === 'image'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Image / GIF
                    </button>
                  </div>

                  {/* Mode A: Solid Color */}
                  {bgSubMode === 'solid' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Choose Solid Color
                        </span>
                        <div className="flex items-center gap-2">
                          {isEyeDropperSupported && (
                            <button
                              type="button"
                              onClick={() => handleEyeDrop((hex) => handleSolidBgChange(hex))}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 hover:text-white border border-white/10 transition"
                              title="Eyedropper: pick color from screen"
                            >
                              <Pipette size={12} className="text-purple-400" />
                              <span>Eyedropper</span>
                            </button>
                          )}
                          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                              style={{ backgroundColor: draftTheme.backgroundColor }}
                            />
                            <span className="text-xs font-mono text-gray-300">
                              {draftTheme.backgroundColor.toUpperCase()}
                            </span>
                            <input
                              type="color"
                              value={draftTheme.backgroundColor}
                              onChange={(e) => handleSolidBgChange(e.target.value)}
                              className="opacity-0 w-0 h-0 absolute pointer-events-none"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Solid Palette Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {SOLID_PALETTE.map((pal) => {
                          const isSelected =
                            draftTheme.backgroundColor.toLowerCase() === pal.color.toLowerCase();
                          return (
                            <button
                              key={pal.name}
                              type="button"
                              onClick={() => {
                                triggerHapticFeedback(6);
                                handleSolidBgChange(pal.color);
                              }}
                              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                                isSelected
                                  ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <span
                                className="w-6 h-6 rounded-full border border-white/20 shadow-md flex-shrink-0"
                                style={{ backgroundColor: pal.color }}
                              />
                              <span className="text-xs font-medium text-gray-200 truncate">
                                {pal.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode B: Gradient Builder */}
                  {bgSubMode === 'gradient' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Gradients
                          </span>
                          {randomSchemeNotice && (
                            <span className="text-[11px] text-purple-300 font-semibold animate-pulse">
                              {randomSchemeNotice}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRandomizeBackgroundGradient}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-400/30 text-xs font-semibold transition active:scale-95 shadow-sm"
                            title="Generate harmonious gradient using color wheel"
                          >
                            <Dices size={14} className="animate-spin-once" />
                            <span>🎲 Random Gradient</span>
                          </button>

                          {draftTheme.gradientColors.length < 3 && (
                            <button
                              type="button"
                              onClick={handleAddGradientColor}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 transition"
                            >
                              <Plus size={13} />
                              <span>Add 3rd Color</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Color Stop Chips */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {draftTheme.gradientColors.map((color, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <label
                                className="relative w-8 h-8 rounded-xl border border-white/20 shadow-md cursor-pointer flex-shrink-0 flex items-center justify-center overflow-hidden"
                                style={{ backgroundColor: color }}
                              >
                                <input
                                  type="color"
                                  value={color}
                                  onChange={(e) => handleGradientColorChange(index, e.target.value)}
                                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                                />
                              </label>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">
                                  Color {index + 1}
                                </p>
                                <p className="text-xs font-mono text-gray-200 truncate">
                                  {color.toUpperCase()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {isEyeDropperSupported && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEyeDrop((hex) => handleGradientColorChange(index, hex))
                                  }
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-300 hover:bg-white/10 transition"
                                  title="Eyedropper"
                                >
                                  <Pipette size={13} />
                                </button>
                              )}

                              {draftTheme.gradientColors.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGradientColor(index)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/20 transition"
                                  title="Remove color stop"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Gradient Angle Rotary / Slider with Haptic Feedback */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                            <RotateCw size={14} className="text-purple-400" />
                            <span>Gradient Angle (0° – 360°)</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-300 px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-400/30">
                            {draftTheme.gradientAngle ?? 135}°
                          </span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={5}
                          value={draftTheme.gradientAngle ?? 135}
                          onChange={(e) => handleBgAngleChange(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />

                        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                          {PRESET_ANGLES.map((ang) => (
                            <button
                              key={ang}
                              type="button"
                              onClick={() => {
                                triggerHapticFeedback(8);
                                setDraftTheme((p) => ({ ...p, gradientAngle: ang }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                                (draftTheme.gradientAngle ?? 135) === ang
                                  ? 'bg-purple-600 text-white font-bold'
                                  : 'bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              {ang}°
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode C: Procedural WebGL / Shader Live Wallpapers */}
                  {bgSubMode === 'shader' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap size={14} className="text-purple-400" />
                          <span>Animated wallpapers</span>
                        </span>
                      </div>

                      {/* Shader Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PROCEDURAL_SHADER_PRESETS.map((preset) => {
                          const isSelected =
                            draftTheme.backgroundType === 'shader' &&
                            draftTheme.shaderPresetId === preset.id;

                          return (
                            <div
                              key={preset.id}
                              onClick={() => handleSelectShader(preset)}
                              className={`p-3.5 rounded-2xl border cursor-pointer text-left transition-all ${
                                isSelected
                                  ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/20'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-12 h-12 rounded-xl border border-white/20 shadow-inner flex-shrink-0 relative overflow-hidden"
                                  style={{ background: preset.previewGradient }}
                                >
                                  <div className="absolute inset-0 bg-black/20" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-bold text-white truncate">
                                      {preset.name}
                                    </p>
                                    {isSelected && (
                                      <span className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
                                        <Check size={10} strokeWidth={3} />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-purple-300 font-medium">
                                    {preset.category}
                                  </p>
                                  <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                                    {preset.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Advanced Shader Toggles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Audio-Reactive Toggle */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                              <Volume2 size={15} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">
                                Audio-Reactive Background
                              </p>
                              <p className="text-[10px] text-gray-400">
                                Pulses to the beat of voice and music
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(8);
                              setDraftTheme((p) => ({
                                ...p,
                                audioReactive: !(p.audioReactive ?? true),
                              }));
                            }}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              (draftTheme.audioReactive ?? true) ? 'bg-purple-600' : 'bg-white/20'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                (draftTheme.audioReactive ?? true) ? 'translate-x-5' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* 3D Gyro Parallax Toggle */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                              <Compass size={15} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">
                                3D Depth Parallax
                              </p>
                              <p className="text-[10px] text-gray-400">
                                Gyroscope tilt on mobile devices
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(8);
                              setDraftTheme((p) => ({ ...p, parallax3d: !(p.parallax3d ?? true) }));
                            }}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              (draftTheme.parallax3d ?? true) ? 'bg-purple-600' : 'bg-white/20'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                (draftTheme.parallax3d ?? true) ? 'translate-x-5' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode D: Image / Animated GIF / SVG Upload */}
                  {bgSubMode === 'image' && (
                    <div className="space-y-5">
                      {/* Unified Upload Image or GIF Card */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-6 rounded-3xl border border-dashed border-white/15 hover:border-purple-500/60 bg-[#161722]/80 hover:bg-[#1a1b2a] transition flex flex-col items-center justify-center text-center cursor-pointer group min-h-[140px] shadow-lg relative overflow-hidden"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.gif,.webp,.svg"
                          onChange={handleFileSelected}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-gray-300 group-hover:text-purple-300 group-hover:scale-110 flex items-center justify-center transition">
                            <Upload size={20} />
                          </div>
                          <div className="w-11 h-11 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-400/30 group-hover:scale-110 flex items-center justify-center transition">
                            <Film size={20} />
                          </div>
                        </div>
                        <p className="text-sm font-bold text-white mb-1">
                          {isUploading ? 'Uploading...' : 'Upload Image or GIF'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Supports PNG, JPG, WebP, SVG, and animated GIFs
                        </p>
                      </div>

                      {/* Magic Color Match Banner */}
                      {magicPalette.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-pink-900/40 border border-purple-500/40 flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 flex-shrink-0">
                              <Wand2 size={16} className="animate-pulse" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white leading-tight">
                                Magic Color Match
                              </p>
                              <p className="text-[10px] text-purple-200/80 truncate">
                                Bubble colors from photo palette
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex -space-x-1.5">
                              {magicPalette.map((c, i) => (
                                <span
                                  key={i}
                                  className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                                  style={{ background: c }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyMagicPalette}
                              className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-[11px] font-bold shadow-md transition flex items-center gap-1 active:scale-95"
                            >
                              <span>🪄 Match in 1 Click</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Image Fine-Tuning Controls */}
                      {draftTheme.bgImageUrl && (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                            <Sliders size={14} className="text-purple-400" />
                            <span>Readability & Blur Overlay</span>
                          </span>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Darkness Overlay</span>
                              <span className="text-gray-200 font-mono">
                                {Math.round((1 - (draftTheme.bgBrightness ?? 0.8)) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.1}
                              max={1.0}
                              step={0.05}
                              value={draftTheme.bgBrightness ?? 0.8}
                              onChange={(e) =>
                                setDraftTheme((p) => ({
                                  ...p,
                                  bgBrightness: parseFloat(e.target.value),
                                }))
                              }
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Background Blur</span>
                              <span className="text-gray-200 font-mono">
                                {draftTheme.bgBlur ?? 0}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={20}
                              step={1}
                              value={draftTheme.bgBlur ?? 0}
                              onChange={(e) =>
                                setDraftTheme((p) => ({
                                  ...p,
                                  bgBlur: parseInt(e.target.value, 10),
                                }))
                              }
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section: Recent Wallpapers */}
                  {recentWallpapers.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">
                          Recent Wallpapers
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Browse up to 5 of your recently uploaded wallpapers and themes.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 overflow-x-auto py-1">
                        {recentWallpapers.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectRecentWallpaper(item)}
                            className="relative group cursor-pointer flex-shrink-0"
                            title={item.name}
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-purple-400 group-hover:scale-105 transition-all shadow-md flex items-center justify-center bg-black/40">
                              <RecentWallpaperThumb item={item} />
                            </div>

                            {/* Delete button on hover */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecentWallpaper(item.id, e)}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow-sm hover:scale-110"
                              title="Remove from recents"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Message Bubbles Customization */}
              {activeTab === 'bubbles' && (
                <div className="space-y-6">
                  {/* Bubble Sub-Mode Switcher: Bubble Gradient | Solid Bubble | Custom Bubbles */}
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBubbleSubTab('gradient');
                        setDraftTheme((p) => ({ ...p, bubbleType: 'gradient' }));
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate flex items-center justify-center gap-1.5 ${
                        bubbleSubTab === 'gradient'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Sliders size={12} className="text-purple-400" />
                      <span>Bubble Gradient</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBubbleSubTab('solid');
                        setDraftTheme((p) => ({ ...p, bubbleType: 'solid' }));
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate flex items-center justify-center gap-1.5 ${
                        bubbleSubTab === 'solid'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Palette size={12} className="text-purple-400" />
                      <span>Solid Bubble</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setBubbleSubTab('custom');
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition truncate flex items-center justify-center gap-1.5 ${
                        bubbleSubTab === 'custom'
                          ? 'bg-white/15 text-white shadow-sm ring-1 ring-purple-400/40'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Sparkles size={12} className="text-pink-400 animate-pulse" />
                      <span>Custom Bubbles</span>
                    </button>
                  </div>

                  {/* Sub-tab 3: Custom Bubbles Gallery */}
                  {bubbleSubTab === 'custom' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Shapes size={14} className="text-purple-400" />
                          <span>Bubble Shapes & Borders</span>
                        </span>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'animals', label: '🐾 TikTok Animals' },
                          { id: 'fx', label: '✨ Animated' },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(6);
                              setCustomCategoryFilter(cat.id as any);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                              customCategoryFilter === cat.id
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Presets Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {BUBBLE_SHAPE_PRESETS.filter(
                          (p) =>
                            customCategoryFilter === 'all' || p.category === customCategoryFilter,
                        ).map((preset) => {
                          const isSelected = draftTheme.bubbleShape === preset.id;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => {
                                triggerHapticFeedback(8);
                                setDraftTheme((prev) => {
                                  const next = {
                                    ...prev,
                                    bubbleShape: preset.id,
                                  };
                                  if (
                                    preset.recommendedType === 'gradient' &&
                                    preset.gradientColors
                                  ) {
                                    next.bubbleType = 'gradient';
                                    next.bubbleGradientColors = [...preset.gradientColors];
                                  } else if (
                                    preset.recommendedType === 'solid' &&
                                    preset.bubbleColor
                                  ) {
                                    next.bubbleType = 'solid';
                                    next.bubbleColor = preset.bubbleColor;
                                    if (preset.incomingBubbleColor) {
                                      next.incomingBubbleColor = preset.incomingBubbleColor;
                                    }
                                  }
                                  return next;
                                });
                              }}
                              className={`group relative p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
                                isSelected
                                  ? 'bg-purple-600/15 border-purple-400 ring-2 ring-purple-400/40 shadow-lg shadow-purple-500/20 scale-[1.01]'
                                  : 'bg-[#161722]/80 border-white/10 hover:border-white/20 hover:bg-[#1a1b2a] hover:scale-[1.01]'
                              }`}
                            >
                              {/* Visual Preview Box */}
                              <div className="h-16 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-visible mb-2 px-2">
                                {preset.id === 'capybara' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="capybara" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] rounded-bl-[4px] border-2 border-[#78350f] bg-gradient-to-b from-[#c58f59] to-[#a8733f] text-[10.5px] font-bold text-white shadow-md">
                                      Capybara
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'frog' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="frog" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border-2 border-[#065f46] bg-gradient-to-b from-emerald-500 to-emerald-600 text-[10.5px] font-bold text-white shadow-md">
                                      Frog
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'cat-dog' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="cat-dog" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border-2 border-[#b45309]/50 bg-gradient-to-b from-[#fffbeb] to-[#fef3c7] text-[10.5px] font-bold text-[#78350f] shadow-md">
                                      Cat & Dog
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'doge' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="doge" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border-2 border-[#b45309] bg-gradient-to-b from-amber-300 to-amber-500 text-[10.5px] font-bold text-[#451a03] shadow-md">
                                      Doge
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'dino' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="dino" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border-2 border-[#0f766e] bg-gradient-to-b from-teal-400 to-teal-600 text-[10.5px] font-bold text-white shadow-md">
                                      Dino
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'heart-pepe' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="heart-pepe" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border-2 border-pink-400/60 bg-gradient-to-b from-pink-200 to-pink-300 text-[10.5px] font-bold text-pink-900 shadow-md">
                                      Pepe
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'gummy' && (
                                  <div className="relative animate-gummy-squish">
                                    <BubbleDecoration shape="gummy" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[16px] border border-white/50 bg-gradient-to-br from-pink-400 via-purple-400 to-sky-400 text-[11px] font-bold text-white shadow-md shadow-pink-500/25 flex items-center gap-1">
                                      <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                                        Gummy
                                      </span>
                                      <span className="text-[10px]">🍬</span>
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'prisma' && (
                                  <div
                                    className="relative animate-prisma-flow rounded-[14px] border border-white/50 px-3.5 py-1 text-[11px] font-bold text-white shadow-md shadow-blue-500/25 flex items-center gap-1"
                                    style={{
                                      backgroundImage:
                                        'linear-gradient(90deg, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #f97316, #f59e0b)',
                                      backgroundSize: '200% 100%',
                                    }}
                                  >
                                    <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                                      Prisma
                                    </span>
                                    <span className="text-[10px]">🌈</span>
                                  </div>
                                )}

                                {preset.id === 'cyber-glass' && (
                                  <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6),inset_0_0_8px_rgba(147,51,234,0.3)] ring-1 ring-cyan-300/40 text-[10px] font-mono text-cyan-200 tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    <span>CYBER</span>
                                  </div>
                                )}

                                {preset.id === 'retro-pixel' && (
                                  <div className="relative px-3 py-0.5 rounded-none border-2 border-black bg-purple-600 shadow-[2px_2px_0px_#000] text-[10px] font-mono text-white tracking-tight">
                                    <BubbleDecoration shape="retro-pixel" isOwnMessage={false} />
                                    <span>8-BIT</span>
                                  </div>
                                )}

                                {preset.id === 'liquid-neon' && (
                                  <div className="relative px-3.5 py-1 rounded-[16px] bg-[#0f0b1e] border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.4)] flex items-center justify-center">
                                    <BubbleDecoration shape="liquid-neon" isOwnMessage={false} />
                                    <span className="text-[10px] font-bold text-white tracking-wide">
                                      Neon ✨
                                    </span>
                                  </div>
                                )}

                                {preset.id === 'star-bubble' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="star-bubble" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] rounded-bl-[4px] border border-amber-600/40 bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-[10.5px] font-bold text-[#451a03] shadow-md">
                                      Star ☀️
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'pink-cream' && (
                                  <div className="relative pb-2">
                                    <BubbleDecoration shape="pink-cream" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-t-[14px] rounded-b-[4px] border border-pink-300/40 bg-gradient-to-b from-[#fbcfe8] via-[#f472b6] to-[#fb7185] text-[10.5px] font-bold text-[#831843] shadow-md">
                                      Cream 🍧
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'sheetbook-note' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="sheetbook-note" isOwnMessage={false} />
                                    <div
                                      className="px-3.5 py-1 rounded-[12px] border border-slate-300 bg-white text-[10.5px] font-bold text-[#1e293b] shadow-sm"
                                      style={{
                                        backgroundImage:
                                          'linear-gradient(to right, rgba(59, 130, 246, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
                                        backgroundSize: '10px 10px',
                                      }}
                                    >
                                      Note 📝
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'moon-bubble' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="moon-bubble" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border border-purple-500/30 bg-gradient-to-br from-[#181135] via-[#29154e] to-[#120c2b] text-[10.5px] font-bold text-white shadow-md">
                                      Moon 🪐
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'cloudy-bubble' && (
                                  <div className="relative pb-2">
                                    <BubbleDecoration shape="cloudy-bubble" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-t-[14px] rounded-b-[4px] border border-blue-400/30 bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-[10.5px] font-bold text-white shadow-md">
                                      Cloud ☁️
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'evil-bubble' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="evil-bubble" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border border-red-500/70 bg-[#260a12] text-[10.5px] font-bold text-[#ffe4e6] shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                                      Evil 😈
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'halo-bubble' && (
                                  <div className="relative">
                                    <BubbleDecoration shape="halo-bubble" isOwnMessage={false} />
                                    <div className="px-3.5 py-1 rounded-[14px] border-2 border-amber-400 bg-white text-[10.5px] font-bold text-[#1f2937] shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                                      Halo 😇
                                    </div>
                                  </div>
                                )}

                                {preset.id === 'system-bubble' && (
                                  <div className="relative px-3 py-1 rounded-lg bg-[#050805] border border-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.35)] font-mono text-[10px] text-[#4ade80] flex items-center gap-1">
                                    <BubbleDecoration shape="system-bubble" isOwnMessage={false} />
                                    <span className="pl-3">SYSTEM_</span>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  {preset.id === 'gummy' ? (
                                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate flex items-center gap-1">
                                      <span>
                                        <span className="text-[#f472b6]">G</span>
                                        <span className="text-[#38bdf8]">u</span>
                                        <span className="text-[#c084fc]">m</span>
                                        <span className="text-[#34d399]">m</span>
                                        <span className="text-[#f472b6]">y</span>
                                      </span>
                                    </h4>
                                  ) : preset.id === 'prisma' ? (
                                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate flex items-center gap-1">
                                      <span>
                                        <span className="text-[#eab308]">P</span>
                                        <span className="text-[#22c55e]">r</span>
                                        <span className="text-[#eab308]">i</span>
                                        <span className="text-[#ec4899]">s</span>
                                        <span className="text-[#3b82f6]">m</span>
                                        <span className="text-[#f97316]">a</span>
                                      </span>
                                    </h4>
                                  ) : (
                                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">
                                      {preset.name}
                                    </h4>
                                  )}
                                  {isSelected && (
                                    <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 ml-1">
                                      <Check size={10} strokeWidth={3} />
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">
                                  {preset.subtitle}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 1: Solid Bubble Colors */}
                  {bubbleSubTab === 'solid' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Outgoing Bubble Color
                        </span>
                        <div className="flex items-center gap-2">
                          {isEyeDropperSupported && (
                            <button
                              type="button"
                              onClick={() => handleEyeDrop((hex) => handleBubbleColorChange(hex))}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 hover:text-white border border-white/10 transition"
                              title="Eyedropper: pick color from screen"
                            >
                              <Pipette size={12} className="text-purple-400" />
                              <span>Eyedropper</span>
                            </button>
                          )}
                          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                              style={{ backgroundColor: draftTheme.bubbleColor }}
                            />
                            <span className="text-xs font-mono text-gray-300">
                              {draftTheme.bubbleColor.toUpperCase()}
                            </span>
                            <input
                              type="color"
                              value={draftTheme.bubbleColor}
                              onChange={(e) => handleBubbleColorChange(e.target.value)}
                              className="opacity-0 w-0 h-0 absolute pointer-events-none"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Quick Palette */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          '#9333ea',
                          '#3b82f6',
                          '#10b981',
                          '#f59e0b',
                          '#ec4899',
                          '#06b6d4',
                          '#6366f1',
                          '#1e293b',
                        ].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(6);
                              handleBubbleColorChange(c);
                            }}
                            className={`h-9 rounded-xl border flex items-center justify-center transition-all ${
                              draftTheme.bubbleColor.toLowerCase() === c.toLowerCase()
                                ? 'border-white ring-2 ring-purple-500/40 shadow-md scale-105'
                                : 'border-white/10 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      {/* Incoming Bubble Solid Color */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Incoming Bubble Color
                        </span>
                        <div className="flex items-center gap-2">
                          {isEyeDropperSupported && (
                            <button
                              type="button"
                              onClick={() =>
                                handleEyeDrop((hex) => handleIncomingBubbleColorChange(hex))
                              }
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 hover:text-white border border-white/10 transition"
                              title="Eyedropper"
                            >
                              <Pipette size={12} className="text-purple-400" />
                              <span>Eyedropper</span>
                            </button>
                          )}
                          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                              style={{
                                backgroundColor: draftTheme.incomingBubbleColor || '#12131b',
                              }}
                            />
                            <span className="text-xs font-mono text-gray-300">
                              {(draftTheme.incomingBubbleColor || '#12131B').toUpperCase()}
                            </span>
                            <input
                              type="color"
                              value={draftTheme.incomingBubbleColor || '#12131b'}
                              onChange={(e) => handleIncomingBubbleColorChange(e.target.value)}
                              className="opacity-0 w-0 h-0 absolute pointer-events-none"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: Bubble Gradients */}
                  {bubbleSubTab === 'gradient' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Bubble Gradients
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRandomizeBubbleGradient}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-400/30 text-xs font-semibold transition active:scale-95 shadow-sm"
                            title="Generate beautiful random bubble gradient"
                          >
                            <Dices size={14} />
                            <span>🎲 Random</span>
                          </button>

                          {(draftTheme.bubbleGradientColors || []).length < 3 && (
                            <button
                              type="button"
                              onClick={handleAddBubbleGradientColor}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95"
                            >
                              <Plus size={14} />
                              <span>Add Color</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Gradient Color Stops */}
                      <div className="space-y-2">
                        {(draftTheme.bubbleGradientColors || ['#9333ea', '#6366f1']).map(
                          (color, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
                            >
                              <span className="text-xs text-gray-400 font-medium">
                                Stop {index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-xs font-mono text-gray-300">
                                    {color.toUpperCase()}
                                  </span>
                                  <input
                                    type="color"
                                    value={color}
                                    onChange={(e) =>
                                      handleBubbleGradientColorChange(index, e.target.value)
                                    }
                                    className="opacity-0 w-0 h-0 absolute pointer-events-none"
                                  />
                                </label>

                                {isEyeDropperSupported && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEyeDrop((hex) =>
                                        handleBubbleGradientColorChange(index, hex),
                                      )
                                    }
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-300 hover:bg-white/10 transition"
                                    title="Eyedropper"
                                  >
                                    <Pipette size={13} />
                                  </button>
                                )}

                                {(draftTheme.bubbleGradientColors || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBubbleGradientColor(index)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/20 transition"
                                    title="Remove color stop"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      {/* Bubble Gradient Angle Rotary / Slider */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                            <RotateCw size={14} className="text-purple-400" />
                            <span>Bubble Gradient Angle (0° – 360°)</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-300 px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-400/30">
                            {draftTheme.bubbleGradientAngle ?? 135}°
                          </span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={5}
                          value={draftTheme.bubbleGradientAngle ?? 135}
                          onChange={(e) => handleBubbleAngleChange(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />

                        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                          {PRESET_ANGLES.map((ang) => (
                            <button
                              key={ang}
                              type="button"
                              onClick={() => {
                                triggerHapticFeedback(8);
                                setDraftTheme((p) => ({ ...p, bubbleGradientAngle: ang }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                                (draftTheme.bubbleGradientAngle ?? 135) === ang
                                  ? 'bg-purple-600 text-white font-bold'
                                  : 'bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              {ang}°
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Glassmorphism Frosted Glass Controls */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Layers size={14} className="text-purple-400" />
                      <span>Glassmorphism & Frosted Glass</span>
                    </span>

                    {/* Bubble Opacity Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Bubble Opacity</span>
                        <span className="text-gray-200 font-mono font-semibold">
                          {Math.round((draftTheme.bubbleOpacity ?? 0.95) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={1.0}
                        step={0.05}
                        value={draftTheme.bubbleOpacity ?? 0.95}
                        onChange={(e) =>
                          setDraftTheme((p) => ({
                            ...p,
                            bubbleOpacity: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    {/* Backdrop Blur Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Backdrop Blur</span>
                        <span className="text-gray-200 font-mono font-semibold">
                          {draftTheme.bubbleBlur ?? 16}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        step={2}
                        value={draftTheme.bubbleBlur ?? 16}
                        onChange={(e) =>
                          setDraftTheme((p) => ({
                            ...p,
                            bubbleBlur: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>

                  {/* Instagram / Telegram Continuous Screen Gradient Toggle */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-purple-400" />
                        <span>Continuous Screen Gradient</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        One smooth gradient stretches across the entire screen height as messages
                        scroll
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(8);
                        setDraftTheme((p) => ({
                          ...p,
                          bubbleContinuousGradient: !p.bubbleContinuousGradient,
                        }));
                      }}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        draftTheme.bubbleContinuousGradient ? 'bg-purple-600' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          draftTheme.bubbleContinuousGradient ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bubble Presets Grid */}
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                      Popular Bubble Styles
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BUILT_IN_BUBBLE_PRESETS.map((bp) => (
                        <button
                          key={bp.id}
                          type="button"
                          onClick={() => handleSelectBubblePreset(bp)}
                          className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0 shadow-md"
                            style={{ background: bp.previewBg }}
                          />
                          <span className="text-xs font-medium text-gray-200 truncate">
                            {bp.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Text (Discord-Style Custom Typography & Effects) */}
              {activeTab === 'text' && (
                <div className="space-y-6">
                  {/* 1. Font Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        Font Selection
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback(6);
                          setDraftTheme((p) => ({ ...p, textFont: 'default' }));
                        }}
                        title="Reset font to default"
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg transition hover:bg-white/10 flex items-center gap-1 text-xs"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5">
                      {CHAT_FONTS.map((font) => {
                        const isSelected = (draftTheme.textFont || 'default') === font.id;
                        const isHovered = hoveredFont === font.id;
                        return (
                          <div key={font.id} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHapticFeedback(6);
                                setDraftTheme((p) => ({ ...p, textFont: font.id }));
                              }}
                              onMouseEnter={() => setHoveredFont(font.id)}
                              onMouseLeave={() => setHoveredFont(null)}
                              className={`w-full aspect-[1.15/1] rounded-2xl flex items-center justify-center transition-all duration-150 relative ${
                                isSelected
                                  ? 'bg-[#1e1f29] border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500/50'
                                  : 'bg-[#181922] hover:bg-[#20222e] border border-white/5 hover:border-white/10'
                              }`}
                              title={font.name}
                            >
                              {/* Selection indicator dot matching screenshot */}
                              {isSelected && (
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                              )}

                              <span
                                style={{
                                  fontFamily: font.fontFamily,
                                  fontSize: font.scale ? `${font.scale * 1.55}rem` : '1.55rem',
                                  lineHeight: 1,
                                }}
                                className="text-white font-bold select-none tracking-tight"
                              >
                                {font.sampleText || 'Gg'}
                              </span>
                            </button>

                            {/* Discord-style Tooltip on Hover */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 2, scale: 0.95 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute z-30 bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#111216] border border-white/10 text-white text-[11px] font-medium whitespace-nowrap shadow-xl pointer-events-none"
                                >
                                  {font.name}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111216]" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Effect Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        Effect Selection
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback(6);
                          setDraftTheme((p) => ({ ...p, textEffect: 'minimal' }));
                        }}
                        title="Reset text effect"
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg transition hover:bg-white/10 flex items-center gap-1 text-xs"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5">
                      {CHAT_TEXT_EFFECTS.map((effect) => {
                        const isSelected = (draftTheme.textEffect || 'minimal') === effect.id;
                        return (
                          <button
                            key={effect.id}
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(6);
                              setDraftTheme((p) => ({ ...p, textEffect: effect.id }));
                            }}
                            className={`h-14 rounded-2xl flex items-center justify-center px-2 py-1 transition-all duration-150 text-center ${
                              isSelected
                                ? 'bg-[#1e1f29] border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500/50'
                                : 'bg-[#181922] hover:bg-[#20222e] border border-white/5 hover:border-white/10'
                            }`}
                            title={effect.name}
                          >
                            <span
                              className={`text-xs font-bold truncate max-w-full select-none ${
                                effect.id === 'gradient'
                                  ? 'msg-effect-gradient font-extrabold'
                                  : effect.id === 'neon'
                                    ? 'msg-effect-neon font-extrabold text-purple-300'
                                    : effect.id === 'cartoon'
                                      ? 'msg-effect-cartoon text-pink-400 font-extrabold'
                                      : effect.id === 'highlight'
                                        ? 'msg-effect-highlight text-emerald-400 font-bold'
                                        : effect.id === 'gummy'
                                          ? 'msg-effect-gummy text-pink-300 font-extrabold'
                                          : effect.id === 'prism'
                                            ? 'msg-effect-prism text-white font-bold'
                                            : 'text-gray-200'
                              }`}
                            >
                              {effect.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Color Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        Color Selection
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback(6);
                          setDraftTheme((p) => ({ ...p, textColor: 'auto' }));
                        }}
                        title="Reset color (Auto)"
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg transition hover:bg-white/10 flex items-center gap-1 text-xs"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active Color Preview Block */}
                      <div
                        className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10 relative overflow-hidden"
                        style={{
                          backgroundColor:
                            draftTheme.textColor && draftTheme.textColor !== 'auto'
                              ? draftTheme.textColor
                              : '#ec4899',
                        }}
                      >
                        {(!draftTheme.textColor || draftTheme.textColor === 'auto') && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#111216] to-white/40 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow">
                              Auto
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Custom Color Picker Button (Red / custom square with pen icon matching screenshot) */}
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticFeedback(8);
                            textColorInputRef.current?.click();
                          }}
                          className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-red-400/40 transition active:scale-95"
                          title="Choose custom color"
                        >
                          <Pencil size={20} className="stroke-[2.5]" />
                        </button>
                        <input
                          ref={textColorInputRef}
                          type="color"
                          value={
                            draftTheme.textColor && draftTheme.textColor !== 'auto'
                              ? draftTheme.textColor
                              : '#ec4899'
                          }
                          onChange={(e) => {
                            triggerHapticFeedback(6);
                            setDraftTheme((p) => ({ ...p, textColor: e.target.value }));
                          }}
                          className="sr-only"
                        />
                      </div>

                      {/* 14 Preset Color Dots (2 rows of 7 dots) */}
                      <div className="grid grid-rows-2 grid-flow-col gap-2 flex-1 justify-start">
                        {DISCORD_TEXT_COLORS.map((item) => {
                          const isSelected = (draftTheme.textColor || 'auto') === item.color;
                          const isAuto = item.color === 'auto';
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => {
                                triggerHapticFeedback(6);
                                setDraftTheme((p) => ({ ...p, textColor: item.color }));
                              }}
                              className={`w-6 h-6 rounded-full transition-transform active:scale-90 relative ${
                                isSelected
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0b0b0c] scale-110 shadow-md'
                                  : 'hover:scale-105 opacity-90 hover:opacity-100'
                              }`}
                              style={{
                                backgroundColor: isAuto ? '#22232b' : item.color,
                                border: isAuto ? '1px dashed rgba(255,255,255,0.4)' : 'none',
                              }}
                              title={`${item.name} ${isAuto ? '(High-contrast Auto)' : ''}`}
                            >
                              {isAuto && (
                                <span className="text-[7px] font-bold text-gray-300 block text-center leading-none">
                                  A
                                </span>
                              )}
                              {isSelected && !isAuto && (
                                <Check
                                  size={12}
                                  className="absolute inset-0 m-auto text-white drop-shadow stroke-[3]"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 4. Apply to All Messages Toggle Card */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 transition hover:bg-white/[0.07]">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">Apply to All Messages</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Without this, styles only apply to your messages; with it, incoming messages
                        match too
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draftTheme.textApplyToAll ?? false}
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setDraftTheme((p) => ({ ...p, textApplyToAll: !p.textApplyToAll }));
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        draftTheme.textApplyToAll
                          ? 'bg-purple-600 shadow-lg shadow-purple-500/30'
                          : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          draftTheme.textApplyToAll ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Built-In Presets */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUILT_IN_PRESETS.map((preset) => {
                      const isSelected = draftTheme.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl border border-white/20 shadow-inner flex-shrink-0"
                              style={{ background: preset.previewBg }}
                            />
                            <div>
                              <p className="text-sm font-bold text-white">{preset.name}</p>
                              <p className="text-xs text-gray-400 capitalize">{preset.category}</p>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 4: My Custom Presets */}
              {activeTab === 'custom_presets' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <input
                      type="text"
                      value={customPresetName}
                      onChange={(e) => setCustomPresetName(e.target.value)}
                      placeholder="Theme name (e.g. My Cyberpunk Neon)"
                      className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveToCustomPresets}
                      disabled={isSavingPreset}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Bookmark size={14} />
                      <span>Save Current Theme</span>
                    </button>
                  </div>

                  {customPresets.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                      <Bookmark size={28} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-sm font-bold text-gray-300">No saved presets yet</p>
                      <p className="text-xs text-gray-500">
                        Create a custom color or GIF theme and click Save above
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customPresets.map((cp) => {
                        const isEditing = editingPresetId === cp.id;
                        return (
                          <div
                            key={cp.id}
                            onClick={() => !isEditing && handleSelectPreset(cp)}
                            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between cursor-pointer group transition"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className="w-10 h-10 rounded-xl border border-white/20 shadow-inner flex-shrink-0"
                                style={{ background: cp.previewBg }}
                              />
                              <div className="min-w-0 flex-1 mr-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingPresetName}
                                    onChange={(e) => setEditingPresetName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(cp.id);
                                      if (e.key === 'Escape') setEditingPresetId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    className="w-full px-2.5 py-1 rounded-lg bg-black/60 border border-purple-500 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                                  />
                                ) : (
                                  <>
                                    <p className="text-sm font-bold text-white truncate">
                                      {cp.name}
                                    </p>
                                    <p className="text-xs text-gray-400">Custom theme</p>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveRename(cp.id);
                                    }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition"
                                    title="Save name"
                                  >
                                    <Check size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPresetId(null);
                                    }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 transition"
                                    title="Cancel"
                                  >
                                    <X size={15} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPresetId(cp.id);
                                      setEditingPresetName(cp.name);
                                    }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-300 hover:bg-purple-500/20 transition"
                                    title="Edit theme name"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCustomPreset(cp.id, e)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/20 transition"
                                    title="Delete theme"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Live Interactive Chat Preview with Real Telegram Reactions */}
            <div
              className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col p-6 bg-black/40 border-l border-white/5 ${
                mobileViewMode === 'editor' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Interactive Live Preview</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Segmented Comparison Bar */}
                  <div className="flex items-center p-1 rounded-2xl bg-[#161722]/90 border border-white/10 shadow-inner">
                    {/* Option 1: Draft (New custom changes) */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setPreviewMode('draft');
                      }}
                      className={`px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs transition-all flex items-center justify-center font-medium ${
                        previewMode === 'draft'
                          ? 'bg-purple-600 text-white shadow-md font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Current theme with your new changes"
                    >
                      New
                    </button>

                    {/* Option 2: Initial (Theme before edits) */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setPreviewMode('initial');
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs transition-all cursor-pointer font-medium ${
                        previewMode === 'initial'
                          ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Original chat theme before changes"
                    >
                      <span>Before changes</span>
                    </button>

                    {/* Option 3: Default (Clean dark default theme) */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(6);
                        setPreviewMode('default');
                      }}
                      className={`px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs transition-all flex items-center justify-center font-medium ${
                        previewMode === 'default'
                          ? 'bg-indigo-600 text-white shadow-md font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Show standard default theme"
                    >
                      Default
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Frame Mockup */}
              <div className="relative flex-1 rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex flex-col min-h-[380px]">
                {/* Background Layer with Filters & Hardware Acceleration */}
                <div
                  className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
                  style={bgStyle}
                >
                  {displayTheme.backgroundType === 'shader' && (
                    <ProceduralChatBackground
                      shaderId={displayTheme.shaderPresetId || 'neon-smoke'}
                      audioReactive={displayTheme.audioReactive ?? true}
                      parallax3d={displayTheme.parallax3d ?? true}
                    />
                  )}
                  {displayTheme.backgroundType === 'image' && displayTheme.bgImageUrl && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: `rgba(0, 0, 0, ${1 - (displayTheme.bgBrightness ?? 0.8)})`,
                        backdropFilter: displayTheme.bgBlur
                          ? `blur(${displayTheme.bgBlur}px)`
                          : undefined,
                        WebkitBackdropFilter: displayTheme.bgBlur
                          ? `blur(${displayTheme.bgBlur}px)`
                          : undefined,
                      }}
                    />
                  )}
                </div>

                {/* Mock Chat Header (Liquid Glass) */}
                <div
                  className="relative z-10 px-4 py-3 bg-white/[0.05] backdrop-blur-2xl border-b border-white/10 flex items-center justify-between rounded-t-[23px] shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-purple-500/20 ring-1 ring-white/20">
                      EA
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">
                        Eternal Messenger
                      </p>
                      <p className="text-[10px] text-emerald-400 font-medium leading-tight flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">
                      Preview
                    </span>
                  </div>
                </div>

                {/* Mock Message List */}
                <div
                  ref={previewScrollRef}
                  className="relative z-10 flex-1 p-3.5 flex flex-col gap-3 overflow-y-auto custom-scrollbar"
                >
                  {testMessages.map((msg) => {
                    const isMe = msg.sender === 'me';
                    const bubble = isMe ? outgoingBubble : incomingBubble;
                    const contrast = isMe ? outgoingContrast : incomingContrast;
                    const shapeStyles = getBubbleShapeStyles(
                      displayTheme.bubbleShape || 'telegram-modern',
                      isMe,
                      'single',
                    );
                    const themeTextStyle = getThemeTextStyle(
                      displayTheme,
                      isMe,
                      contrast.textColor,
                    );
                    const tailColor = isMe
                      ? displayTheme.bubbleType === 'solid'
                        ? displayTheme.bubbleColor || '#9333ea'
                        : displayTheme.bubbleGradientColors &&
                            displayTheme.bubbleGradientColors.length > 0
                          ? displayTheme.bubbleGradientColors[
                              displayTheme.bubbleGradientColors.length - 1
                            ]
                          : '#6366f1'
                      : displayTheme.incomingBubbleColor || '#12131b';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMe
                            ? 'items-end self-end max-w-[88%]'
                            : 'items-start self-start max-w-[85%]'
                        }`}
                      >
                        <div className="relative inline-block max-w-full">
                          <BubbleDecoration shape={displayTheme.bubbleShape} isOwnMessage={isMe} />
                          <div
                            className={`relative px-3.5 py-2 transition-all duration-150 ${shapeStyles.roundingClass} ${bubble.className} ${shapeStyles.extraClass}`}
                            style={{
                              ...bubble.style,
                              color: contrast.textColor,
                              ...shapeStyles.extraStyle,
                            }}
                          >
                            {/* Quoted Reply Box */}
                            {msg.replySnippet && (
                              <div
                                className="px-2 py-1 rounded-lg mb-1.5 flex items-center gap-2 border-l-2 text-left select-none text-[10.5px]"
                                style={{
                                  backgroundColor: contrast.quoteBg,
                                  borderLeftColor: contrast.quoteBorder,
                                }}
                              >
                                <div>
                                  <p
                                    className="font-bold leading-tight"
                                    style={{ color: contrast.quoteAuthorColor }}
                                  >
                                    Alex
                                  </p>
                                  <p
                                    className="leading-tight truncate opacity-85"
                                    style={{ color: contrast.quoteSnippetColor }}
                                  >
                                    {msg.replySnippet}
                                  </p>
                                </div>
                              </div>
                            )}

                            <p
                              className={`text-xs leading-relaxed font-normal ${themeTextStyle.className}`}
                              style={{
                                color: contrast.textColor,
                                ...themeTextStyle.style,
                              }}
                            >
                              {msg.text}
                            </p>

                            <div className="flex items-center justify-end gap-1 mt-1 select-none">
                              <span
                                className="text-[9px] font-mono"
                                style={{ color: contrast.timeColor }}
                              >
                                {msg.time}
                              </span>
                              {isMe && (
                                <CheckCheck size={12} style={{ color: contrast.statusColor }} />
                              )}
                            </div>
                          </div>

                          {/* Bubble Tail for iOS / Telegram */}
                          {shapeStyles.showTail && (
                            <BubbleTail
                              tailType={shapeStyles.tailType!}
                              isOwnMessage={isMe}
                              color={tailColor}
                            />
                          )}
                        </div>

                        {/* Reaction Badges Container */}
                        {Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 px-1">
                            {Object.entries(msg.reactions).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => handlePreviewReaction(msg.id, emoji, e)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-[11px] text-white shadow-sm transition active:scale-95"
                              >
                                <span>{emoji}</span>
                                <span className="font-bold text-[10px] text-purple-300">
                                  {count}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Live Telegram Reaction Dock on Hover / Click */}
                        <div
                          className="flex items-center gap-1 mt-1 px-1 py-0.5 bg-black/40 rounded-full border border-white/5 opacity-80 hover:opacity-100 transition"
                          style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                          }}
                        >
                          {(dockReactions && dockReactions.length > 0
                            ? dockReactions.slice(0, 5)
                            : ['🔥', '❤️', '👍', '🎉', '🚀']
                          ).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => handlePreviewReaction(msg.id, emoji, e)}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs hover:scale-125 transition-transform"
                              title={`Reaction ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Interactive Test Composer Input (Liquid Glass) */}
                <form
                  onSubmit={handleSendTestMessage}
                  className="relative z-10 p-2.5 bg-white/[0.04] backdrop-blur-2xl border-t border-white/10 flex items-center gap-2 rounded-b-[23px]"
                  style={{
                    background:
                      'linear-gradient(0deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                  }}
                >
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Write a test message..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!testInput.trim()}
                    className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center transition disabled:opacity-30 flex-shrink-0 shadow-md active:scale-95"
                    title="Send test message to preview"
                  >
                    <Send size={12} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Footer Controls: Toggles & Action Buttons */}
          <div className="px-6 py-4 bg-[#0e0f15] border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0">
            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
              {/* Toggle 1: Apply to all chats */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    applyToAll ? 'bg-purple-600' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${
                      applyToAll ? 'translate-x-4' : ''
                    }`}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block leading-tight">
                    Apply to all chats
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    Sets as global default for current & new chats
                  </span>
                </div>
              </label>

              {/* Toggle 2: Sync across all devices */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncDevices}
                  onChange={(e) => setSyncDevices(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    syncDevices ? 'bg-purple-600' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${
                      syncDevices ? 'translate-x-4' : ''
                    }`}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block leading-tight">
                    Sync on all devices
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    Save to account (off = this device only via IndexedDB)
                  </span>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {/* Propose as Shared Theme (Direct Chats) */}
              {conversationId && (
                <button
                  type="button"
                  onClick={handleProposeSharedTheme}
                  disabled={isApplying || isProposing}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-400/30 shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  title="Propose this theme to partner as a shared paired theme"
                >
                  <Sparkles size={13} />
                  <span>{isProposing ? 'Sending...' : 'Propose Paired Theme'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRevert}
                disabled={isApplying}
                className="px-4 py-2 rounded-full text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
                title="Reset this chat to default theme"
              >
                <RefreshCcw size={13} />
                <span>Reset Theme</span>
              </button>

              <button
                type="button"
                onClick={close}
                disabled={isApplying}
                className="px-4 py-2 rounded-full text-xs font-medium text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:via-indigo-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isApplying ? (
                  <span>Applying...</span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Apply Theme</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Theme Code Modal Dialog with Zod Validation Feedback */}
          {isImportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
              <div className="w-full max-w-md bg-[#181926] border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download size={18} className="text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Import Theme by Code</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportError(null);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                <p className="text-xs text-gray-400">
                  Paste a shared Base64 theme code (e.g.{' '}
                  <span className="font-mono text-purple-300">ETERNAL-THEME:...</span>) below to
                  load and test it instantly:
                </p>

                <textarea
                  value={importCodeInput}
                  onChange={(e) => {
                    setImportCodeInput(e.target.value);
                    if (importError) setImportError(null);
                  }}
                  rows={4}
                  placeholder="Paste theme code here..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />

                {importError && <p className="text-xs text-red-400 font-semibold">{importError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportThemeCode}
                    disabled={!importCodeInput.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition disabled:opacity-40"
                  >
                    Load Theme
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
