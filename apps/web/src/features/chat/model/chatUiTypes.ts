import type { AvatarDecorationDto, NameplateDto } from '@social-network/shared-contracts';
import { MuteLevel } from '../../../entities/chat/model/types';

export interface BlockCandidate {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  activeNameplate?: NameplateDto | null;
  activeDecoration?: AvatarDecorationDto | null;
}

export interface MuteOption {
  value: MuteLevel;
  label: string;
}
