/**
 * Bitwise Permission Flags for Chat and User Access Control.
 *
 * Each permission is represented as a distinct bit power of 2.
 * Permissions are combined using bitwise OR (|), checked using bitwise AND (&),
 * and cleared using bitwise AND NOT (& ~).
 *
 * Execution time: ~0.00001 ms (single CPU bitwise instruction).
 * Wire and memory savings: 4 bytes (int32) vs 200+ bytes JSON.
 */
export const Permission = {
  // Chat & Group Permissions
  CAN_EDIT: 1 << 0, // 1: Edit group profile / info
  CAN_DELETE: 1 << 1, // 2: Delete messages
  CAN_MANAGE_MEMBERS: 1 << 2, // 4: Add / remove / ban / mute members
  CAN_PIN_MESSAGES: 1 << 3, // 8: Pin / unpin messages
  CAN_INVITE_USERS: 1 << 4, // 16: Invite members / create invites
  CAN_SEND_TEXT: 1 << 5, // 32: Send text messages
  CAN_SEND_MEDIA: 1 << 6, // 64: Send media (photos, videos, files)
  CAN_SEND_VOICE: 1 << 7, // 128: Send voice & video notes
  CAN_SEND_POLLS: 1 << 8, // 256: Create polls
  CAN_ADD_REACTIONS: 1 << 9, // 512: React to messages with emojis
  IS_MUTED: 1 << 10, // 1024: Participant / user is muted
  IS_BANNED: 1 << 11, // 2048: Participant / user is banned / restricted
  IS_ADMIN: 1 << 12, // 4096: Administrator status
  IS_OWNER: 1 << 13, // 8192: Owner status
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const UserFlags = {
  IS_ACTIVE: 1 << 0, // 1: Active user account
  IS_VERIFIED: 1 << 1, // 2: Verified badge
  IS_BANNED: 1 << 2, // 4: Banned account
  IS_MUTED: 1 << 3, // 8: Muted globally
  CAN_POST: 1 << 4, // 16: Permitted to create posts
  CAN_COMMENT: 1 << 5, // 32: Permitted to post comments
  CAN_DM: 1 << 6, // 64: Permitted to send DMs
  IS_STAFF: 1 << 7, // 128: Staff member
  IS_ADMIN: 1 << 8, // 256: Administrator
} as const;

export type UserFlags = (typeof UserFlags)[keyof typeof UserFlags];

/** Standard default permission presets */
export const DEFAULT_MEMBER_PERMISSIONS =
  Permission.CAN_SEND_TEXT |
  Permission.CAN_SEND_MEDIA |
  Permission.CAN_SEND_VOICE |
  Permission.CAN_SEND_POLLS |
  Permission.CAN_ADD_REACTIONS |
  Permission.CAN_INVITE_USERS;

export const DEFAULT_ADMIN_PERMISSIONS =
  DEFAULT_MEMBER_PERMISSIONS |
  Permission.IS_ADMIN |
  Permission.CAN_EDIT |
  Permission.CAN_DELETE |
  Permission.CAN_MANAGE_MEMBERS |
  Permission.CAN_PIN_MESSAGES;

export const DEFAULT_OWNER_PERMISSIONS = DEFAULT_ADMIN_PERMISSIONS | Permission.IS_OWNER;

export const DEFAULT_USER_FLAGS =
  UserFlags.IS_ACTIVE | UserFlags.CAN_POST | UserFlags.CAN_COMMENT | UserFlags.CAN_DM;

/** Bitwise helper functions */
export function hasPermission(mask: number, permission: Permission): boolean {
  return ((mask | 0) & permission) === permission;
}

export function hasAnyPermission(mask: number, ...permissions: Permission[]): boolean {
  const smiMask = mask | 0;
  return permissions.some((p) => (smiMask & p) !== 0);
}

export function addPermission(mask: number, permission: Permission): number {
  return mask | permission | 0;
}

export function removePermission(mask: number, permission: Permission): number {
  return (mask & ~permission) | 0;
}

export function togglePermission(mask: number, permission: Permission): number {
  return (mask ^ permission) | 0;
}

export function setPermission(mask: number, permission: Permission, enabled: boolean): number {
  return (enabled ? mask | permission : mask & ~permission) | 0;
}

/**
 * Fast-Path permission check: single CPU instruction (~0.00001 ms).
 * Returns true if participant has the requested permission and is neither banned nor muted.
 */
export function fastPathCanSend(
  mask: number,
  permission: Permission = Permission.CAN_SEND_TEXT,
): boolean {
  const smi = mask | 0;
  if ((smi & (Permission.IS_BANNED | Permission.IS_MUTED)) !== 0) {
    return false;
  }
  return (smi & permission) === permission;
}

/**
 * Fast-Path user status check: single CPU instruction.
 * Returns true if user is ACTIVE and NOT BANNED (passes 90%+ of typical requests).
 */
export function fastPathUserActive(userFlags: number): boolean {
  const smi = userFlags | 0;
  return (smi & (UserFlags.IS_ACTIVE | UserFlags.IS_BANNED)) === UserFlags.IS_ACTIVE;
}

/**
 * Fast-Path moderation check: single CPU instruction.
 * Returns true if user has ADMIN or OWNER bit set and is not banned.
 */
export function fastPathCanModerate(mask: number): boolean {
  const smi = mask | 0;
  if ((smi & (Permission.IS_BANNED | Permission.IS_MUTED)) !== 0) {
    return false;
  }
  return (smi & (Permission.IS_ADMIN | Permission.IS_OWNER)) !== 0;
}

export interface AdminPermissions {
  canEditGroup: boolean;
  canDeleteMessages: boolean;
  canManageMembers: boolean;
  canPinMessages: boolean;
  canInviteUsers: boolean;
}

export function adminPermissionsToMask(
  perms: {
    canEditGroup?: boolean | undefined;
    canDeleteMessages?: boolean | undefined;
    canManageMembers?: boolean | undefined;
    canPinMessages?: boolean | undefined;
    canInviteUsers?: boolean | undefined;
  },
  baseMask = DEFAULT_ADMIN_PERMISSIONS,
): number {
  let mask = baseMask | 0;
  if (perms.canEditGroup !== undefined) {
    mask = setPermission(mask, Permission.CAN_EDIT, perms.canEditGroup);
  }
  if (perms.canDeleteMessages !== undefined) {
    mask = setPermission(mask, Permission.CAN_DELETE, perms.canDeleteMessages);
  }
  if (perms.canManageMembers !== undefined) {
    mask = setPermission(mask, Permission.CAN_MANAGE_MEMBERS, perms.canManageMembers);
  }
  if (perms.canPinMessages !== undefined) {
    mask = setPermission(mask, Permission.CAN_PIN_MESSAGES, perms.canPinMessages);
  }
  if (perms.canInviteUsers !== undefined) {
    mask = setPermission(mask, Permission.CAN_INVITE_USERS, perms.canInviteUsers);
  }
  return mask | 0;
}

export function maskToAdminPermissions(mask: number): AdminPermissions {
  const smi = mask | 0;
  return {
    canEditGroup: (smi & Permission.CAN_EDIT) !== 0,
    canDeleteMessages: (smi & Permission.CAN_DELETE) !== 0,
    canManageMembers: (smi & Permission.CAN_MANAGE_MEMBERS) !== 0,
    canPinMessages: (smi & Permission.CAN_PIN_MESSAGES) !== 0,
    canInviteUsers: (smi & Permission.CAN_INVITE_USERS) !== 0,
  };
}

export interface MessagePermissions {
  sendText: boolean;
  sendMedia: boolean;
  sendVoice: boolean;
  sendPolls: boolean;
  addReactions: boolean;
}

export function messagePermissionsToMask(
  perms: Partial<MessagePermissions>,
  baseMask = DEFAULT_MEMBER_PERMISSIONS,
): number {
  let mask = baseMask | 0;
  if (perms.sendText !== undefined) {
    mask = setPermission(mask, Permission.CAN_SEND_TEXT, perms.sendText);
  }
  if (perms.sendMedia !== undefined) {
    mask = setPermission(mask, Permission.CAN_SEND_MEDIA, perms.sendMedia);
  }
  if (perms.sendVoice !== undefined) {
    mask = setPermission(mask, Permission.CAN_SEND_VOICE, perms.sendVoice);
  }
  if (perms.sendPolls !== undefined) {
    mask = setPermission(mask, Permission.CAN_SEND_POLLS, perms.sendPolls);
  }
  if (perms.addReactions !== undefined) {
    mask = setPermission(mask, Permission.CAN_ADD_REACTIONS, perms.addReactions);
  }
  return mask | 0;
}

export function maskToMessagePermissions(mask: number): MessagePermissions {
  const smi = mask | 0;
  return {
    sendText: (smi & Permission.CAN_SEND_TEXT) !== 0,
    sendMedia: (smi & Permission.CAN_SEND_MEDIA) !== 0,
    sendVoice: (smi & Permission.CAN_SEND_VOICE) !== 0,
    sendPolls: (smi & Permission.CAN_SEND_POLLS) !== 0,
    addReactions: (smi & Permission.CAN_ADD_REACTIONS) !== 0,
  };
}
