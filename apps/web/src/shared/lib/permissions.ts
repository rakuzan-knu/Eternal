/**
 * Bitwise Permission Flags & Helpers for Frontend Access Control.
 *
 * Fast bitwise checks:
 * (userFlags & Permission.CAN_EDIT) !== 0
 * (userFlags & Permission.CAN_DELETE) !== 0
 * (userFlags & Permission.IS_BANNED) !== 0
 * (userFlags & Permission.IS_MUTED) !== 0
 */
export {
  Permission,
  UserFlags,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_USER_FLAGS,
  hasPermission,
  hasAnyPermission,
  addPermission,
  removePermission,
  togglePermission,
  setPermission,
  adminPermissionsToMask,
  maskToAdminPermissions,
  messagePermissionsToMask,
  maskToMessagePermissions,
  fastPathCanSend,
  fastPathUserActive,
  fastPathCanModerate,
} from '@backend/common/contracts';

export type { AdminPermissions, MessagePermissions } from '@backend/common/contracts';
