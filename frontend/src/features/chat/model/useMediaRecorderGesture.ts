import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderMode = 'voice' | 'video';
export type RecordState = 'idle' | 'holding' | 'recording' | 'locked' | 'preview';

export interface RecordedPayload {
  file: File;
  mode: RecorderMode;
  duration: number; // in seconds
  waveform?: number[];
  previewUrl: string;
}

export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

interface UseMediaRecorderGestureProps {
  onSend: (payload: RecordedPayload) => void;
  onError?: (errorMessage: string) => void;
}

export function useMediaRecorderGesture({ onSend, onError }: UseMediaRecorderGestureProps) {
  const [mode, setMode] = useState<RecorderMode>('voice');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [duration, setDuration] = useState(0);
  const [liveAmplitudes, setLiveAmplitudes] = useState<number[]>(new Array(16).fill(0.1));
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [previewPayload, setPreviewPayload] = useState<RecordedPayload | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1-second dissolving center toast for mode switch
  const [modeToast, setModeToast] = useState<{ text: string; isFading: boolean } | null>(null);
  const modeToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modeToastFadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-camera support
  const [availableCameras, setAvailableCameras] = useState<{ deviceId: string; label: string }[]>(
    [],
  );
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [cameraToast, setCameraToast] = useState<{ text: string; isFading: boolean } | null>(null);
  const cameraToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);
  const durationCountRef = useRef<number>(0);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const stopAndSendRef = useRef<() => void>(() => {});

  // 1-second dissolving center toast for mode switch
  const showModeToast = useCallback((message: string) => {
    if (modeToastTimerRef.current) clearTimeout(modeToastTimerRef.current);
    if (modeToastFadeTimerRef.current) clearTimeout(modeToastFadeTimerRef.current);

    setModeToast({ text: message, isFading: false });

    // 1000ms (1 second) display, then 300ms dissolve transition
    modeToastTimerRef.current = setTimeout(() => {
      setModeToast((prev) => (prev ? { ...prev, isFading: true } : null));
      modeToastFadeTimerRef.current = setTimeout(() => {
        setModeToast(null);
      }, 300);
    }, 1000);
  }, []);

  const refreshCameras = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const formatted = videoInputs.map((d, idx) => ({
        deviceId: d.deviceId,
        label:
          d.label || (idx === 0 ? 'Front Camera' : idx === 1 ? 'Back Camera' : `Camera ${idx + 1}`),
      }));
      setAvailableCameras(formatted);
      if (formatted.length > 0 && !activeCameraId) {
        setActiveCameraId(formatted[0].deviceId);
      }
    } catch {
      // Ignore enumeration errors
    }
  }, [activeCameraId]);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  const showCameraToast = useCallback((label: string) => {
    if (cameraToastTimerRef.current) clearTimeout(cameraToastTimerRef.current);
    setCameraToast({ text: label, isFading: false });
    cameraToastTimerRef.current = setTimeout(() => {
      setCameraToast((prev) => (prev ? { ...prev, isFading: true } : null));
      setTimeout(() => setCameraToast(null), 300);
    }, 1200);
  }, []);

  // Stop all media tracks and audio contexts (Hardware Privacy Leak Protection)
  const cleanupMedia = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          void e;
        }
      });
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        void e;
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Full reset
  const discardRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        void e;
      }
    }
    cleanupMedia();
    if (previewPayload?.previewUrl) {
      URL.revokeObjectURL(previewPayload.previewUrl);
    }
    setRecordState('idle');
    setDuration(0);
    setPreviewPayload(null);
    setDragOffset({ x: 0, y: 0 });
    pointerStartRef.current = null;
    recordedChunksRef.current = [];
    waveformSamplesRef.current = [];
    durationCountRef.current = 0;
  }, [cleanupMedia, previewPayload]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  // Connect live audio analyser
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAmplitudes = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample normalized values 0..1
        const sampled: number[] = [];
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * 2] || 0;
          sampled.push(Math.max(0.1, val / 255));
        }
        setLiveAmplitudes(sampled);

        // Track overall amplitude for waveform snapshot
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / (dataArray.length || 1);
        waveformSamplesRef.current.push(Math.max(0.08, Math.min(1.0, avg / 180)));

        animationFrameRef.current = requestAnimationFrame(updateAmplitudes);
      };
      updateAmplitudes();
    } catch {
      // AudioContext not supported or permission issue
    }
  }, []);

  // Compute final 32-bar waveform
  const computeFinalWaveform = useCallback(() => {
    const raw = waveformSamplesRef.current;
    if (raw.length === 0) return new Array(32).fill(0.3);
    const bars = 32;
    const result: number[] = [];
    const step = raw.length / bars;
    for (let i = 0; i < bars; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(raw.length, Math.floor((i + 1) * step));
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sum += raw[j];
        count++;
      }
      const val = count > 0 ? sum / count : raw[startIdx] || 0.3;
      result.push(Number(Math.max(0.08, Math.min(1.0, val)).toFixed(2)));
    }
    return result;
  }, []);

  // Start recording actual media
  const startRecording = useCallback(
    async (
      currentMode: RecorderMode,
      currentFacing: 'user' | 'environment',
      targetDeviceId?: string | null,
    ) => {
      try {
        cleanupMedia();
        recordedChunksRef.current = [];
        waveformSamplesRef.current = [];
        durationCountRef.current = 0;
        setDuration(0);

        let stream: MediaStream;
        if (currentMode === 'voice') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          const selectedId = targetDeviceId ?? activeCameraId;
          const videoConstraints: MediaTrackConstraints = {
            aspectRatio: 1,
            width: { ideal: 480 },
            height: { ideal: 480 },
          };
          if (selectedId) {
            videoConstraints.deviceId = { exact: selectedId };
          } else {
            videoConstraints.facingMode = currentFacing;
          }

          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: true,
          });

          refreshCameras();
        }

        streamRef.current = stream;
        setupAudioAnalyser(stream);

        // Bind video element if preview element exists
        if (previewVideoRef.current && currentMode === 'video') {
          previewVideoRef.current.srcObject = stream;
        }

        const mimeType =
          currentMode === 'voice' ? getSupportedAudioMimeType() : getSupportedVideoMimeType();

        const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(stream, recorderOptions);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.start(100);
        mediaRecorderRef.current = recorder;
        setRecordState('recording');

        // Start elapsed timer (max 60 seconds)
        durationTimerRef.current = setInterval(() => {
          durationCountRef.current += 1;
          setDuration(durationCountRef.current);
          if (durationCountRef.current >= 60) {
            // Auto stop and send on 60s limit
            stopAndSendRef.current();
          }
        }, 1000);
      } catch {
        discardRecording();
        onError?.('Camera or microphone access is required to record notes.');
      }
    },
    [activeCameraId, cleanupMedia, discardRecording, onError, refreshCameras, setupAudioAnalyser],
  );

  // Stop recording and send
  const stopAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      if (previewPayload) {
        onSend(previewPayload);
        discardRecording();
      }
      return;
    }

    const currentDuration = Math.max(1, durationCountRef.current);
    const finalWaveform = mode === 'voice' ? computeFinalWaveform() : undefined;
    const activeMode = mode;

    recorder.onstop = () => {
      const mime =
        activeMode === 'voice'
          ? getSupportedAudioMimeType() || 'audio/webm'
          : getSupportedVideoMimeType() || 'video/webm';

      const extension = mime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: mime });
      const file = new File([blob], `${activeMode}_note_${Date.now()}.${extension}`, {
        type: mime,
      });
      const previewUrl = URL.createObjectURL(blob);

      onSend({
        file,
        mode: activeMode,
        duration: currentDuration,
        waveform: finalWaveform,
        previewUrl,
      });

      discardRecording();
    };

    recorder.stop();
    cleanupMedia();
  }, [cleanupMedia, computeFinalWaveform, discardRecording, mode, onSend, previewPayload]);

  stopAndSendRef.current = stopAndSend;

  // Pause / Stop into Preview mode (Locked mode feature)
  const stopToPreview = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const currentDuration = Math.max(1, durationCountRef.current);
    const finalWaveform = mode === 'voice' ? computeFinalWaveform() : undefined;
    const activeMode = mode;

    recorder.onstop = () => {
      const mime =
        activeMode === 'voice'
          ? getSupportedAudioMimeType() || 'audio/webm'
          : getSupportedVideoMimeType() || 'video/webm';

      const extension = mime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: mime });
      const file = new File([blob], `${activeMode}_note_${Date.now()}.${extension}`, {
        type: mime,
      });
      const previewUrl = URL.createObjectURL(blob);

      setPreviewPayload({
        file,
        mode: activeMode,
        duration: currentDuration,
        waveform: finalWaveform,
        previewUrl,
      });
      setRecordState('preview');
    };

    recorder.stop();
    cleanupMedia();
  }, [cleanupMedia, computeFinalWaveform, mode]);

  // Switch or Flip Camera
  const switchCamera = useCallback(
    (targetDeviceId?: string) => {
      if (availableCameras.length > 1) {
        let nextId: string;
        if (targetDeviceId) {
          nextId = targetDeviceId;
        } else {
          const currentIndex = availableCameras.findIndex((c) => c.deviceId === activeCameraId);
          const nextIndex = (currentIndex + 1) % availableCameras.length;
          nextId = availableCameras[nextIndex].deviceId;
        }
        setActiveCameraId(nextId);
        const cam = availableCameras.find((c) => c.deviceId === nextId);
        const label = cam?.label || 'Camera Switched';
        showCameraToast(label);

        if (recordState === 'recording' || recordState === 'locked') {
          startRecording('video', facingMode, nextId);
        }
      } else {
        const nextFacing = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextFacing);
        showCameraToast(nextFacing === 'user' ? 'Front Camera' : 'Back Camera');
        if (recordState === 'recording' || recordState === 'locked') {
          startRecording('video', nextFacing);
        }
      }
    },
    [activeCameraId, availableCameras, facingMode, recordState, showCameraToast, startRecording],
  );

  const toggleFacingMode = useCallback(() => {
    switchCamera();
  }, [switchCamera]);

  // Pointer Down on Trigger Button
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (recordState !== 'idle') return;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset({ x: 0, y: 0 });

      // Start 300ms hold timer
      holdTimerRef.current = setTimeout(() => {
        startRecording(mode, facingMode, activeCameraId);
      }, 300);
    },
    [activeCameraId, facingMode, mode, recordState, startRecording],
  );

  // Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStartRef.current || recordState === 'idle' || recordState === 'locked') return;

      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaY = e.clientY - pointerStartRef.current.y;
      setDragOffset({ x: deltaX, y: deltaY });

      // Slide Left (Cancel) > 80px
      if (deltaX < -80) {
        discardRecording();
        return;
      }

      // Slide Up (Lock) > 60px
      if (deltaY < -60) {
        setRecordState('locked');
      }
    },
    [discardRecording, recordState],
  );

  // Pointer Up
  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      // Released before 300ms -> Quick Click Toggle Mode with 1-second dissolving toast
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      if (recordState === 'idle') {
        const nextMode: RecorderMode = mode === 'voice' ? 'video' : 'voice';
        setMode(nextMode);
        showModeToast(
          nextMode === 'video'
            ? 'Hold to record video. Click to switch to audio.'
            : 'Hold to record audio. Click to switch to video.',
        );
      }
      return;
    }

    if (recordState === 'recording') {
      // Releasing while actively holding -> Send
      stopAndSend();
    }
  }, [mode, recordState, showModeToast, stopAndSend]);

  return {
    mode,
    setMode,
    recordState,
    duration,
    liveAmplitudes,
    facingMode,
    previewPayload,
    previewVideoRef,
    dragOffset,
    stream: streamRef.current,
    modeToast,
    showModeToast,
    availableCameras,
    activeCameraId,
    cameraToast,
    switchCamera,
    toggleFacingMode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    discardRecording,
    stopToPreview,
    stopAndSend,
  };
}
