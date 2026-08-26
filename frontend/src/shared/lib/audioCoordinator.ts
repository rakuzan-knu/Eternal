/**
 * Global Audio Conflict Coordinator
 * Ensures only ONE audio preview plays at any time across the entire application
 * (e.g. Profile Anthem, Live Spotify status preview, Quick-Editor track search).
 */

class AudioCoordinator {
  private activeAudio: HTMLAudioElement | null = null;
  private activeId: string | null = null;

  public play(audio: HTMLAudioElement, id: string): void {
    if (this.activeAudio && this.activeAudio !== audio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // Ignore aborts on already paused audio
      }
    }

    this.activeAudio = audio;
    this.activeId = id;

    // Dispatch global event for React component state synchronization
    window.dispatchEvent(new CustomEvent('app:audio-play', { detail: { id } }));
  }

  public stop(id?: string): void {
    if (!id || this.activeId === id) {
      if (this.activeAudio) {
        try {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
        } catch {
          // Ignore
        }
      }
      this.activeAudio = null;
      this.activeId = null;

      window.dispatchEvent(new CustomEvent('app:audio-stop', { detail: { id } }));
    }
  }

  public getActiveId(): string | null {
    return this.activeId;
  }
}

export const audioCoordinator = new AudioCoordinator();
