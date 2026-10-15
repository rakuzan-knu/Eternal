import type { Track } from '../model/music';
export interface MusicAudioProps {
  track: Track;
  uri: string;
  isHls: boolean;
  lowPower?: boolean;
  playing: boolean;
  volume: number;
  seek: { value: number; revision: number };
  onProgress: (position: number, duration: number) => void;
  onPlaying: (playing: boolean) => void;
  onEnded: () => void;
  onError: () => void;
}
