export interface StoryAudioProps {
  uri: string;
  active: boolean;
  volume?: number;
  startTimeMs?: number;
  clipDurationSeconds?: number;
  label?: string;
}
