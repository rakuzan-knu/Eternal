export type SoundScope = 'my' | 'chat';

export interface SoundboardItemDto {
  id: string;
  name: string;
  emoji: string;
  scope: SoundScope;
  userId?: string | undefined;
  conversationId?: string | undefined;
  durationMs: number;
  audioData?: string | undefined;
  audioUrl?: string | undefined;
  authorName?: string | undefined;
  createdAt?: number | undefined;
}

export interface CreateSoundboardDto {
  name: string;
  emoji: string;
  durationMs?: number | undefined;
  audioData?: string | undefined;
  audioUrl?: string | undefined;
}
