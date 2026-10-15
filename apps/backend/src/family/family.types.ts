export type FamilyLinkStatus = 'PENDING_CONFIRMATION' | 'ACTIVE' | 'REVOKED';

export interface FamilyLinkRecord {
  id: string;
  parentId: string;
  childId: string;
  status: FamilyLinkStatus;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date | null | undefined;
  parent?:
    | {
        id: string;
        username: string;
        displayName: string | null;
        avatar: string | null;
        birthDate: Date | null;
      }
    | undefined;
  child?:
    | {
        id: string;
        username: string;
        displayName: string | null;
        avatar: string | null;
        birthDate: Date | null;
      }
    | undefined;
}

export interface ChildSafeguards {
  childId: string;
  dailyLimitMinutes: number; // e.g. 120 (2h)
  curfewStart: string | null; // e.g. "22:00"
  curfewEnd: string | null; // e.g. "07:00"
  timezone: string; // IANA timezone e.g. "Europe/Kyiv"
  restrictedDirectMessages: boolean; // only mutual friends
  monthlyBudget: number; // e.g. 2000
  spentThisMonth: number;
  requirePurchaseApproval: boolean; // push prompt to parent for each purchase
  profileSettingsLocked: boolean; // prevent child from changing privacy
  updatedByParentId: string;
  updatedAt: Date;
}

export interface FamilyPairInviteToken {
  token: string;
  code: string; // 6-digit alphanumeric code e.g. "FC-7892"
  childId: string;
  expiresAt: Date;
}

export interface FamilyActivitySummaryDto {
  childId: string;
  periodDays: number;
  newFriendsCount: number;
  serversInteractedCount?: number;
  messagingUsersCount: number;
  voiceVideoMinutes: number;
  purchaseAmount: number;
  giftsReceivedCount: number;
  reportsSharedCount: number;
  lastUpdated: string;
}

export interface FamilySettingsDto {
  weeklyDigest: boolean;
  newFriendAlerts: boolean;
  reportAlerts: boolean;
  notifyLinkRequests: boolean;
  pinEnabled: boolean;
  pinCode?: string;
}

export interface PendingPairRequestDto {
  linkId: string;
  parentId: string;
  parentUsername: string;
  parentDisplayName: string;
  parentAvatar: string | null;
  createdAt: string;
  expiresAt: string;
}
