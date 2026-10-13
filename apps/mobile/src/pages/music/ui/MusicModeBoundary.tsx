import * as React from 'react';
import { useMusic } from '../model/MusicProvider';
import { MusicGameMode } from './MusicGameMode';

export function MusicModeBoundary({ children }: { children: React.ReactNode }) {
  const { gameMode } = useMusic();
  // Unmount observers, media, lists and effects. The provider and audio stay mounted.
  return gameMode ? <MusicGameMode /> : <>{children}</>;
}
