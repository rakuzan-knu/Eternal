/**
 * Voice-to-UI Hands-Free Command Engine
 *
 * Provides hands-free call control for users with limited upper-body mobility.
 * Listens for key spoken phrases via Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * and triggers call state actions (Mute, Video, Hand Raise, Chat, End Call).
 */

import { useEffect, useState } from 'react';

export type VoiceCommandAction =
  | 'MUTE'
  | 'UNMUTE'
  | 'VIDEO_ON'
  | 'VIDEO_OFF'
  | 'RAISE_HAND'
  | 'LOWER_HAND'
  | 'OPEN_CHAT'
  | 'END_CALL';

export interface VoiceCommandMatch {
  action: VoiceCommandAction;
  rawPhrase: string;
  confidence: number;
}

export interface VoiceCommandHandlers {
  onMute?: (muted: boolean) => void;
  onVideo?: (videoOff: boolean) => void;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onOpenChat?: () => void;
  onEndCall?: () => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
    length: number;
  };
}

/**
 * Pure pattern-matching function mapping voice transcripts to recognized actions
 */
export function parseVoiceCommand(text: string): VoiceCommandAction | null {
  const norm = text.toLowerCase().trim();

  // Unmute microphone (checked before mute to avoid matching substrings)
  if (
    norm.includes('включить микрофон') ||
    norm.includes('разглушить микрофон') ||
    norm.includes('unmute microphone') ||
    norm === 'unmute' ||
    norm.startsWith('unmute')
  ) {
    return 'UNMUTE';
  }

  // Mute microphone
  if (
    !norm.includes('unmute') &&
    !norm.includes('разглушить') &&
    !norm.includes('включить') &&
    (norm.includes('заглушить микрофон') ||
      norm.includes('выключить микрофон') ||
      norm.includes('отключить микрофон') ||
      norm.includes('mute microphone') ||
      norm === 'mute' ||
      norm.startsWith('mute '))
  ) {
    return 'MUTE';
  }

  // Video on
  if (
    norm.includes('включить камеру') ||
    norm.includes('запустить камеру') ||
    norm.includes('start video') ||
    norm.includes('turn on camera')
  ) {
    return 'VIDEO_ON';
  }

  // Video off
  if (
    norm.includes('выключить камеру') ||
    norm.includes('остановить камеру') ||
    norm.includes('stop video') ||
    norm.includes('turn off camera')
  ) {
    return 'VIDEO_OFF';
  }

  // Hand raise / lower
  if (norm.includes('поднять руку') || norm.includes('raise hand')) {
    return 'RAISE_HAND';
  }
  if (norm.includes('опустить руку') || norm.includes('lower hand')) {
    return 'LOWER_HAND';
  }

  // Chat
  if (
    norm.includes('показать чат') ||
    norm.includes('открыть чат') ||
    norm.includes('open chat') ||
    norm.includes('show chat')
  ) {
    return 'OPEN_CHAT';
  }

  // End Call
  if (
    norm.includes('завершить звонок') ||
    norm.includes('положить трубку') ||
    norm.includes('закончить звонок') ||
    norm.includes('end call') ||
    norm.includes('hang up')
  ) {
    return 'END_CALL';
  }

  return null;
}

export class VoiceCommandEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListeningActive = false;
  private listeners = new Set<(match: VoiceCommandMatch) => void>();

  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }

  public start(): boolean {
    if (!VoiceCommandEngine.isSupported() || this.isListeningActive) {
      return false;
    }

    try {
      const SpeechRecognitionCtor =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
          .webkitSpeechRecognition;

      if (!SpeechRecognitionCtor) return false;

      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'ru-RU';

      this.recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult) return;
        const transcript = lastResult[0]?.transcript || '';
        const confidence = lastResult[0]?.confidence || 0.8;

        const action = parseVoiceCommand(transcript);
        if (action) {
          const match: VoiceCommandMatch = {
            action,
            rawPhrase: transcript,
            confidence,
          };
          this.listeners.forEach((listener) => listener(match));
        }
      };

      this.recognition.onend = () => {
        // Auto re-arm if still active
        if (this.isListeningActive && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            // Ignore restart errors
          }
        }
      };

      this.recognition.onerror = () => {
        // Handled silently
      };

      this.recognition.start();
      this.isListeningActive = true;
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
  }

  public onCommand(callback: (match: VoiceCommandMatch) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const globalVoiceCommandEngine = new VoiceCommandEngine();

/**
 * React hook connecting voice command engine to call controls
 */
export function useVoiceCommandEngine(handlers: VoiceCommandHandlers, enabled = false) {
  const [lastCommand, setLastCommand] = useState<VoiceCommandMatch | null>(null);

  useEffect(() => {
    if (!enabled) {
      globalVoiceCommandEngine.stop();
      return;
    }

    globalVoiceCommandEngine.start();

    const unsubscribe = globalVoiceCommandEngine.onCommand((match) => {
      setLastCommand(match);

      switch (match.action) {
        case 'MUTE':
          handlers.onMute?.(true);
          break;
        case 'UNMUTE':
          handlers.onMute?.(false);
          break;
        case 'VIDEO_ON':
          handlers.onVideo?.(false); // isVideoOff = false
          break;
        case 'VIDEO_OFF':
          handlers.onVideo?.(true); // isVideoOff = true
          break;
        case 'RAISE_HAND':
          handlers.onRaiseHand?.();
          break;
        case 'LOWER_HAND':
          handlers.onLowerHand?.();
          break;
        case 'OPEN_CHAT':
          handlers.onOpenChat?.();
          break;
        case 'END_CALL':
          handlers.onEndCall?.();
          break;
      }
    });

    return () => {
      unsubscribe();
      globalVoiceCommandEngine.stop();
    };
  }, [enabled, handlers]);

  return { lastCommand };
}
