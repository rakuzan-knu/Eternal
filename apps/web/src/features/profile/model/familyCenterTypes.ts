export type FamilyLinkStatus = 'PENDING_CONFIRMATION' | 'ACTIVE' | 'REVOKED';

export interface ChildSafeguards {
  childId: string;
  dailyLimitMinutes: number;
  curfewStart: string | null; // e.g. "22:00"
  curfewEnd: string | null; // e.g. "07:00"
  timezone: string;
  curfewTimezone?: string;
  restrictedDirectMessages: boolean;
  monthlyBudget: number;
  spentThisMonth: number;
  requirePurchaseApproval: boolean;
  profileSettingsLocked: boolean;
  profileLockedByParent?: boolean;
  updatedByParentId: string;
  updatedAt: string;
}

export type FamilySafeguardsDto = ChildSafeguards;

export interface FamilyMember {
  id: string;
  linkId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  birthDate: string | null;
  age: number;
  status: 'online' | 'idle' | 'offline';
  connectedAt: string;
  safeguards?: ChildSafeguards;
}

export interface FamilyMembersResponse {
  role: 'parent' | 'child';
  connectedChildren: FamilyMember[];
  connectedParents: FamilyMember[];
  maxChildren: number;
  maxParents: number;
}

export interface FamilyActivitySummary {
  childId: string;
  periodDays: number;
  newFriendsCount: number;
  serversInteractedCount?: number;
  messagingUsersCount: number;
  voiceVideoMinutes: number;
  purchaseAmount: number; // in USD ($)
  giftsReceivedCount: number;
  reportsSharedCount: number;
  lastUpdated: string;
}

export type FamilyActivitySummaryResponse = FamilyActivitySummary;

export interface PendingPairRequest {
  linkId: string;
  parentId: string;
  parentUsername: string;
  parentDisplayName: string;
  parentAvatar: string | null;
  createdAt: string;
  expiresAt: string;
}

export type PendingPairRequestDto = PendingPairRequest;

export interface FamilyCenterSettings {
  weeklyDigest: boolean;
  newFriendAlerts: boolean;
  reportAlerts: boolean;
  notifyLinkRequests: boolean;
  pinEnabled: boolean;
  pinCode?: string;
}
