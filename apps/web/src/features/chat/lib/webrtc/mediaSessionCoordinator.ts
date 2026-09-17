/**
 * OS System Overlay & Media Session Coordinator
 *
 * Integrates WebRTC call state with the host operating system (iOS, Android, macOS, Windows)
 * via the Media Session API and App Badging API:
 * 1. Exposes active call metadata (caller, title, duration) to the OS lock screen / control center.
 * 2. Intercepts physical headphone/keyboard media keys (Play/Pause, Next, Previous, Stop)
 *    and maps them directly to Mute/Unmute, speaker cycling, and End Call.
 * 3. Drives desktop/dock PWA badge counters (navigator.setAppBadge) for missed calls or active participants.
 */

export interface MediaSessionCallMetadata {
  title: string;
  callerName: string;
  avatarUrl?: string;
  isGroupCall?: boolean;
}

export interface MediaSessionActionHandlers {
  onMute?: (muted: boolean) => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onNextSpeaker?: () => void;
  onPreviousSpeaker?: () => void;
  onEndCall?: () => void;
}

export class MediaSessionCoordinator {
  private isBound = false;

  public static isMediaSessionSupported(): boolean {
    return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  }

  public static isAppBadgeSupported(): boolean {
    return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
  }

  /**
   * Binds active call metadata and media action key handlers to OS Media Session
   */
  public bindCallSession(
    metadata: MediaSessionCallMetadata,
    handlers: MediaSessionActionHandlers,
    isMuted = false,
  ): boolean {
    if (!MediaSessionCoordinator.isMediaSessionSupported()) {
      return false;
    }

    try {
      const artwork = metadata.avatarUrl
        ? [
            { src: metadata.avatarUrl, sizes: '96x96', type: 'image/png' },
            { src: metadata.avatarUrl, sizes: '192x192', type: 'image/png' },
            { src: metadata.avatarUrl, sizes: '512x512', type: 'image/png' },
          ]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.callerName,
        album: metadata.isGroupCall ? 'Групповой звонок' : 'Личный звонок',
        artwork,
      });

      navigator.mediaSession.playbackState = isMuted ? 'paused' : 'playing';

      // Standard Media Keys
      this.setActionHandler('play', () => handlers.onMute?.(false));
      this.setActionHandler('pause', () => handlers.onMute?.(true));
      this.setActionHandler('stop', () => handlers.onEndCall?.());
      this.setActionHandler('nexttrack', () => handlers.onNextSpeaker?.());
      this.setActionHandler('previoustrack', () => handlers.onPreviousSpeaker?.());

      // WebRTC Specific Keys (supported by modern Chromium / Safari)
      this.setActionHandler('togglemicrophone' as MediaSessionAction, () =>
        handlers.onToggleMute?.(),
      );
      this.setActionHandler('togglecamera' as MediaSessionAction, () => handlers.onToggleVideo?.());
      this.setActionHandler('hangup' as MediaSessionAction, () => handlers.onEndCall?.());

      this.isBound = true;
      return true;
    } catch (err) {
      console.warn('[MediaSessionCoordinator] Failed to bind media session:', err);
      return false;
    }
  }

  /**
   * Safely registers an action handler on navigator.mediaSession
   */
  private setActionHandler(
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null,
  ): void {
    if (!MediaSessionCoordinator.isMediaSessionSupported()) return;
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Some browsers throw on unsupported actions
    }
  }

  /**
   * Updates playback / mute state in OS media control overlay
   */
  public updateMuteState(isMuted: boolean): void {
    if (!MediaSessionCoordinator.isMediaSessionSupported() || !this.isBound) return;
    try {
      navigator.mediaSession.playbackState = isMuted ? 'paused' : 'playing';
    } catch {
      // Ignore
    }
  }

  /**
   * Sets OS app badge count on desktop dock or taskbar icon
   */
  public async setBadgeCount(count: number): Promise<boolean> {
    if (!MediaSessionCoordinator.isAppBadgeSupported()) {
      return false;
    }

    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears app badge
   */
  public async clearBadge(): Promise<boolean> {
    return this.setBadgeCount(0);
  }

  /**
   * Tears down OS media session overlay and removes handlers
   */
  public clear(): void {
    if (!MediaSessionCoordinator.isMediaSessionSupported()) return;

    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;

      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'stop',
        'nexttrack',
        'previoustrack',
        'togglemicrophone' as MediaSessionAction,
        'togglecamera' as MediaSessionAction,
        'hangup' as MediaSessionAction,
      ];

      actions.forEach((a) => this.setActionHandler(a, null));
    } catch {
      // Ignore
    }
    this.isBound = false;
  }
}

export const globalMediaSessionCoordinator = new MediaSessionCoordinator();
