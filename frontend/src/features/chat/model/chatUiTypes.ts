import { MuteLevel } from '../../../entities/chat/model/types';

export interface BlockCandidate {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface MuteOption {
  value: MuteLevel;
  label: string;
}
