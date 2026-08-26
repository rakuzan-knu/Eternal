import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Type,
  Smile,
  Mic,
  MicOff,
  Image as ImageIcon,
  Send,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  AtSign,
  Palette,
  Trash2,
  Check,
  Music,
  Star,
  Loader2,
} from 'lucide-react';
import { useStoryEditorStore } from '../model/useStoryEditorStore';
import { useCreateStory } from '../model/useStories';
import { uid } from 'uid';
import type {
  StoryOverlay,
  TextOverlay,
  PollOverlay,
  LinkOverlay,
  MentionOverlay,
  AudioOverlay,
  StoryPrivacy,
} from '../model/types';

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)',
  'linear-gradient(135deg, #831843 0%, #be185d 50%, #db2777 100%)',
  'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #06b6d4 100%)',
  'linear-gradient(135deg, #701a75 0%, #a21caf 50%, #c026d3 100%)',
  'linear-gradient(135deg, #431407 0%, #c2410c 50%, #ea580c 100%)',
  'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)',
];

const COLOR_PALETTE = [
  '#ffffff',
  '#f87171',
  '#fbbf24',
  '#34d399',
  '#60a5fa',
  '#c084fc',
  '#f472b6',
  '#000000',
];

export function StoryEditorModal() {
  const {
    isOpen,
    closeEditor,
    mediaFile,
    mediaUrl,
    mediaType,
    overlays,
    privacy,
    backgroundColor,
    activeTool,
    setMedia,
    addOverlay,
    updateOverlay,
    removeOverlay,
    setPrivacy,
    setBackgroundColor,
    setActiveTool,
  } = useStoryEditorStore();

  const createStoryMutation = useCreateStory();

  // Local editor tool state
  const [gradientIndex, setGradientIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Text Tool State
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState<
    'sans' | 'neon' | 'cyberpunk' | 'serif' | 'typewriter'
  >('neon');
  const [bgStyle, setBgStyle] = useState<'none' | 'solid' | 'neon' | 'glass'>('solid');

  // Poll Tool State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Да', 'Нет']);

  // Link Tool State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('НАЖМИ СЮДА 🔥');

  // Mention Tool State
  const [mentionQuery, setMentionQuery] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dragging overlay state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Video and file validation
  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');

    // 1. Check size limits
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxAudioSize = 25 * 1024 * 1024; // 25MB

    if (isVideo && file.size > maxVideoSize) {
      setErrorMessage('Размер видео не должен превышать 100 МБ');
      return;
    }
    if (isImage && file.size > maxImageSize) {
      setErrorMessage('Размер изображения не должен превышать 10 МБ');
      return;
    }
    if (isAudio && file.size > maxAudioSize) {
      setErrorMessage('Размер аудио не должен превышать 25 МБ');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    // 2. If video: validate duration <= 60 seconds
    if (isVideo) {
      const tempVideo = document.createElement('video');
      tempVideo.src = previewUrl;
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration > 65) {
          setErrorMessage('Длительность видео не может превышать 60 секунд');
          URL.revokeObjectURL(previewUrl);
          return;
        }
        setMedia(file, previewUrl, 'VIDEO');
      };
      tempVideo.onerror = () => {
        setErrorMessage('Не удалось прочитать видео файл');
      };
    } else if (isAudio) {
      setMedia(file, previewUrl, 'VOICE');
    } else {
      setMedia(file, previewUrl, 'IMAGE');
    }
  };

  // Cycle through gradient backgrounds
  const handleCycleGradient = () => {
    const nextIndex = (gradientIndex + 1) % GRADIENT_PRESETS.length;
    setGradientIndex(nextIndex);
    setBackgroundColor(GRADIENT_PRESETS[nextIndex]);
  };

  // Submit Text Overlay
  const handleAddText = () => {
    if (!textInput.trim()) {
      setActiveTool('none');
      return;
    }

    const newOverlay: TextOverlay = {
      id: uid(8),
      type: 'text',
      text: textInput.trim(),
      xPercent: 50,
      yPercent: 45,
      scale: 1,
      rotation: 0,
      color: textColor,
      fontFamily,
      backgroundStyle: bgStyle,
      fontSize: 24,
      textAlign: 'center',
    };

    addOverlay(newOverlay);
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
    };

    addOverlay(newOverlay);
    setPollQuestion('');
    setPollOptions(['Да', 'Нет']);
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
      title: linkTitle.trim() || 'Ссылка',
      xPercent: 50,
      yPercent: 65,
      scale: 1,
      rotation: 0,
    };

    addOverlay(newOverlay);
    setLinkUrl('');
    setLinkTitle('НАЖМИ СЮДА 🔥');
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
    };

    addOverlay(newOverlay);
    setMentionQuery('');
    setActiveTool('none');
  };

  // Start / Stop Voice Recording
  const startRecording = async () => {
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
        setMedia(audioFile, url, 'VOICE');

        const audioOverlay: AudioOverlay = {
          id: uid(8),
          type: 'audio',
          title: 'Голосовая история',
          audioUrl: url,
          duration: recordingSeconds,
          waveform: [40, 65, 85, 30, 95, 60, 45, 75, 90, 50, 60, 80],
          xPercent: 50,
          yPercent: 50,
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
      setErrorMessage('Не удалось получить доступ к микрофону');
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

  // Dragging calculation for overlays (converts pointer position to percentage coordinates)
  const handleOverlayPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, Math.round(x)));
    const clampedY = Math.max(5, Math.min(95, Math.round(y)));

    updateOverlay(draggingId, { xPercent: clampedX, yPercent: clampedY });
  };

  const handleOverlayPointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release fallback
      }
    }
  };

  // Publish Story
  const handlePublish = async (selectedPrivacy?: StoryPrivacy) => {
    const finalPrivacy = selectedPrivacy || privacy;

    try {
      await createStoryMutation.mutateAsync({
        file: mediaFile ?? undefined,
        mediaType: mediaType,
        overlays: overlays,
        privacy: finalPrivacy,
        backgroundColor: !mediaUrl ? backgroundColor : undefined,
      });

      closeEditor();
    } catch {
      setErrorMessage('Ошибка при публикации истории. Попробуйте еще раз.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-fadeIn select-none">
      {/* Hidden file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
        }}
      />

      {/* Main Container */}
      <div className="relative flex flex-col items-center max-w-full h-full justify-between py-2">
        {/* Top Control Bar */}
        <div className="w-full max-w-md flex items-center justify-between px-2 mb-2 z-30">
          <button
            type="button"
            onClick={closeEditor}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
            title="Закрыть"
          >
            <X size={20} />
          </button>

          {/* Tools Action Buttons */}
          <div className="flex items-center gap-1.5 bg-[#18181f]/80 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'text' ? 'none' : 'text')}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                activeTool === 'text' ? 'bg-purple-600 shadow-md scale-105' : 'hover:bg-white/10'
              }`}
              title="Добавить текст"
            >
              <Type size={18} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'poll' ? 'none' : 'poll')}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                activeTool === 'poll' ? 'bg-purple-600 shadow-md scale-105' : 'hover:bg-white/10'
              }`}
              title="Интерактивный опрос"
            >
              <HelpCircle size={18} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'link' ? 'none' : 'link')}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                activeTool === 'link' ? 'bg-purple-600 shadow-md scale-105' : 'hover:bg-white/10'
              }`}
              title="Прикрепить ссылку"
            >
              <LinkIcon size={18} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'mention' ? 'none' : 'mention')}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                activeTool === 'mention' ? 'bg-purple-600 shadow-md scale-105' : 'hover:bg-white/10'
              }`}
              title="Упомянуть пользователя"
            >
              <AtSign size={18} />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Загрузить фото / видео"
            >
              <ImageIcon size={18} />
            </button>

            {!mediaUrl && (
              <button
                type="button"
                onClick={handleCycleGradient}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Сменить фон"
              >
                <Palette size={18} />
              </button>
            )}

            {/* Voice record button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                  : 'text-white hover:bg-white/10'
              }`}
              title={isRecording ? 'Остановить запись' : 'Записать голос'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
        </div>

        {/* Error Alert Bar */}
        {errorMessage && (
          <div className="w-full max-w-md mb-2 px-4 py-2 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold text-center animate-shake">
            {errorMessage}
          </div>
        )}

        {/* 9:16 Story Canvas Preview */}
        <div
          ref={canvasRef}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
          style={{
            background: mediaUrl ? '#09090b' : backgroundColor,
          }}
          className="relative w-full max-w-[380px] aspect-[9/16] max-h-[74vh] rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center justify-center"
        >
          {/* Media Background */}
          {mediaUrl && mediaType === 'IMAGE' && (
            <img
              src={mediaUrl}
              alt="Story Preview"
              className="w-full h-full object-cover pointer-events-none"
            />
          )}

          {mediaUrl && mediaType === 'VIDEO' && (
            <video
              src={mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover pointer-events-none"
            />
          )}

          {/* Voice recording in progress animation */}
          {isRecording && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-3 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-red-500/30 border border-red-500 flex items-center justify-center animate-ping" />
              <div className="text-xl font-bold text-white tracking-widest font-mono">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </div>
              <p className="text-xs text-gray-300">Говорите... Идет запись голоса</p>
            </div>
          )}

          {/* Overlays Rendering on Canvas (using normalized percentage coordinates) */}
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              onPointerDown={(e) => handleOverlayPointerDown(e, overlay.id)}
              style={{
                left: `${overlay.xPercent}%`,
                top: `${overlay.yPercent}%`,
                transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg) scale(${
                  overlay.scale ?? 1
                })`,
                cursor: draggingId === overlay.id ? 'grabbing' : 'grab',
              }}
              className="absolute z-20 transition-transform duration-75 touch-none group/item"
            >
              {/* Delete button on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOverlay(overlay.id);
                }}
                className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg cursor-pointer"
              >
                <Trash2 size={12} />
              </button>

              {/* 1. Text Overlay */}
              {overlay.type === 'text' && (
                <div
                  style={{
                    color: overlay.color,
                  }}
                  className={`px-4 py-2 rounded-2xl text-center whitespace-pre-wrap select-none font-bold text-lg max-w-[280px] leading-snug ${
                    overlay.fontFamily === 'neon'
                      ? 'drop-shadow-[0_0_12px_rgba(236,72,153,0.85)] font-sans'
                      : overlay.fontFamily === 'cyberpunk'
                        ? 'font-mono tracking-wider'
                        : overlay.fontFamily === 'serif'
                          ? 'font-serif italic'
                          : overlay.fontFamily === 'typewriter'
                            ? 'font-mono'
                            : 'font-sans'
                  } ${
                    overlay.backgroundStyle === 'solid'
                      ? 'bg-black/75 backdrop-blur-md border border-white/10 shadow-xl'
                      : overlay.backgroundStyle === 'neon'
                        ? 'bg-purple-600/80 border border-pink-400 shadow-[0_0_15px_rgba(168,85,247,0.7)]'
                        : overlay.backgroundStyle === 'glass'
                          ? 'bg-white/15 backdrop-blur-xl border border-white/20'
                          : ''
                  }`}
                >
                  {overlay.text}
                </div>
              )}

              {/* 2. Poll Overlay */}
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

              {/* 3. Link Overlay */}
              {overlay.type === 'link' && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-black font-extrabold text-xs shadow-[0_8px_25px_rgba(255,255,255,0.3)] tracking-wide">
                  <LinkIcon size={14} className="stroke-[3]" />
                  <span>{overlay.title}</span>
                </div>
              )}

              {/* 4. Mention Overlay */}
              {overlay.type === 'mention' && (
                <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg">
                  <AtSign size={13} />
                  <span>{overlay.username}</span>
                </div>
              )}

              {/* 5. Audio Overlay */}
              {overlay.type === 'audio' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-purple-500/30 text-white shadow-xl">
                  <Music size={18} className="text-purple-400 shrink-0" />
                  <div className="flex items-center gap-1 h-4">
                    {(overlay.waveform || [30, 60, 90, 40, 80, 50, 70, 30]).map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1 bg-purple-400 rounded-full animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Active Overlay Modals within Canvas */}
          {/* Text Editor Dialog */}
          {activeTool === 'text' && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex flex-col justify-between p-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setFontFamily((curr) => {
                      const list: ('sans' | 'neon' | 'cyberpunk' | 'serif' | 'typewriter')[] = [
                        'sans',
                        'neon',
                        'cyberpunk',
                        'serif',
                        'typewriter',
                      ];
                      return list[(list.indexOf(curr) + 1) % list.length];
                    })
                  }
                  className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-white border border-white/15"
                >
                  Шрифт: {fontFamily}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBgStyle((curr) => {
                      const list: ('none' | 'solid' | 'neon' | 'glass')[] = [
                        'none',
                        'solid',
                        'neon',
                        'glass',
                      ];
                      return list[(list.indexOf(curr) + 1) % list.length];
                    })
                  }
                  className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-white border border-white/15"
                >
                  Стиль: {bgStyle}
                </button>

                <button
                  type="button"
                  onClick={handleAddText}
                  className="px-4 py-1.5 rounded-full bg-purple-600 text-white font-bold text-xs shadow-lg"
                >
                  Готово
                </button>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Введите текст... (**жирный**, *курсив*)"
                autoFocus
                rows={4}
                style={{ color: textColor }}
                className="w-full bg-transparent text-center text-xl font-bold resize-none focus:outline-none placeholder-gray-500"
              />

              {/* Color Palette */}
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      textColor === c ? 'scale-125 border-white shadow-md' : 'border-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Poll Editor Dialog */}
          {activeTool === 'poll' && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xl flex flex-col justify-center items-center p-4 animate-fadeIn">
              <div className="w-full max-w-[280px] bg-[#16161f] border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider text-center">
                  Новый опрос
                </span>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Задайте вопрос..."
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
                      placeholder={`Вариант ${i + 1}`}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none text-center"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTool('none')}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPoll}
                    className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Link Editor Dialog */}
          {activeTool === 'link' && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xl flex flex-col justify-center items-center p-4 animate-fadeIn">
              <div className="w-full max-w-[280px] bg-[#16161f] border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider text-center">
                  Стикер ссылки
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
                  placeholder="Текст стикера (напр. КУПИТЬ 🔥)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTool('none')}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="flex-1 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold shadow-lg"
                  >
                    Прикрепить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mention Editor Dialog */}
          {activeTool === 'mention' && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xl flex flex-col justify-center items-center p-4 animate-fadeIn">
              <div className="w-full max-w-[280px] bg-[#16161f] border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider text-center">
                  Упоминание
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
                    className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMention}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg"
                  >
                    Упомянуть
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Publishing Actions */}
        <div className="w-full max-w-md flex items-center justify-between gap-3 px-2 mt-3 z-30">
          {/* «Ваша история» button */}
          <button
            type="button"
            disabled={createStoryMutation.isPending}
            onClick={() => handlePublish('ALL_FOLLOWERS')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {createStoryMutation.isPending ? (
              <Loader2 size={16} className="animate-spin text-purple-400" />
            ) : (
              <Sparkles size={16} className="text-purple-400" />
            )}
            <span>Ваша история</span>
          </button>

          {/* «Близкие друзья» button */}
          <button
            type="button"
            disabled={createStoryMutation.isPending}
            onClick={() => handlePublish('CLOSE_FRIENDS')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50"
          >
            <Star size={16} className="text-emerald-400 fill-emerald-400" />
            <span>Близкие друзья</span>
          </button>

          {/* Quick Publish Arrow Button */}
          <button
            type="button"
            disabled={createStoryMutation.isPending}
            onClick={() => handlePublish()}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.5)] cursor-pointer disabled:opacity-50 shrink-0"
            title="Опубликовать"
          >
            <Send size={18} className="translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
