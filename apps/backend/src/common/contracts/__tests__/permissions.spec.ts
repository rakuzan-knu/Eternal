import {
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
} from '../permissions';

describe('Bitwise Permissions & Flags', () => {
  describe('Permission enum bit flags', () => {
    it('each permission flag is a distinct power of 2', () => {
      const values = Object.values(Permission);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);

      for (const val of values) {
        // Must be a power of 2: (val & (val - 1)) === 0 and val > 0
        expect(val > 0).toBe(true);
        expect((val & (val - 1)) === 0).toBe(true);
      }
    });

    it('each user flag is a distinct power of 2', () => {
      const values = Object.values(UserFlags);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);

      for (const val of values) {
        expect(val > 0).toBe(true);
        expect((val & (val - 1)) === 0).toBe(true);
      }
    });
  });

  describe('Core bitwise operations', () => {
    it('evaluates (userFlags & Permission.CAN_EDIT) !== 0 correctly', () => {
      let userFlags = Permission.CAN_EDIT | Permission.CAN_DELETE;

      expect((userFlags & Permission.CAN_EDIT) !== 0).toBe(true);
      expect((userFlags & Permission.CAN_DELETE) !== 0).toBe(true);
      expect((userFlags & Permission.IS_BANNED) !== 0).toBe(false);
      expect((userFlags & Permission.IS_MUTED) !== 0).toBe(false);

      // Mutate flags using bitwise OR (|)
      userFlags |= Permission.IS_MUTED;
      expect((userFlags & Permission.IS_MUTED) !== 0).toBe(true);

      // Clear flag using bitwise AND NOT (& ~)
      userFlags &= ~Permission.CAN_EDIT;
      expect((userFlags & Permission.CAN_EDIT) !== 0).toBe(false);
      expect((userFlags & Permission.CAN_DELETE) !== 0).toBe(true);
      expect((userFlags & Permission.IS_MUTED) !== 0).toBe(true);
    });

    it('hasPermission evaluates exact mask match', () => {
      const mask = Permission.CAN_EDIT | Permission.CAN_PIN_MESSAGES;
      expect(hasPermission(mask, Permission.CAN_EDIT)).toBe(true);
      expect(hasPermission(mask, Permission.CAN_PIN_MESSAGES)).toBe(true);
      expect(hasPermission(mask, Permission.CAN_DELETE)).toBe(false);
    });

    it('hasAnyPermission evaluates disjunction', () => {
      const mask = Permission.CAN_SEND_TEXT;
      expect(hasAnyPermission(mask, Permission.CAN_SEND_TEXT, Permission.CAN_SEND_MEDIA)).toBe(
        true,
      );
      expect(hasAnyPermission(mask, Permission.CAN_SEND_MEDIA, Permission.CAN_SEND_VOICE)).toBe(
        false,
      );
    });

    it('addPermission adds flag without duplicates', () => {
      let mask = 0;
      mask = addPermission(mask, Permission.CAN_SEND_TEXT);
      mask = addPermission(mask, Permission.CAN_SEND_TEXT);
      expect(mask).toBe(Permission.CAN_SEND_TEXT);
      mask = addPermission(mask, Permission.CAN_SEND_MEDIA);
      expect(mask).toBe(Permission.CAN_SEND_TEXT | Permission.CAN_SEND_MEDIA);
    });

    it('removePermission removes flag safely', () => {
      let mask = Permission.CAN_SEND_TEXT | Permission.CAN_SEND_MEDIA;
      mask = removePermission(mask, Permission.CAN_SEND_TEXT);
      expect(hasPermission(mask, Permission.CAN_SEND_TEXT)).toBe(false);
      expect(hasPermission(mask, Permission.CAN_SEND_MEDIA)).toBe(true);
      // Removing non-existent flag does not alter mask
      mask = removePermission(mask, Permission.CAN_SEND_TEXT);
      expect(mask).toBe(Permission.CAN_SEND_MEDIA);
    });

    it('togglePermission toggles bit', () => {
      let mask = 0;
      mask = togglePermission(mask, Permission.CAN_PIN_MESSAGES);
      expect(hasPermission(mask, Permission.CAN_PIN_MESSAGES)).toBe(true);
      mask = togglePermission(mask, Permission.CAN_PIN_MESSAGES);
      expect(hasPermission(mask, Permission.CAN_PIN_MESSAGES)).toBe(false);
    });

    it('setPermission sets bit according to boolean condition', () => {
      let mask = 0;
      mask = setPermission(mask, Permission.CAN_EDIT, true);
      expect(hasPermission(mask, Permission.CAN_EDIT)).toBe(true);
      mask = setPermission(mask, Permission.CAN_EDIT, false);
      expect(hasPermission(mask, Permission.CAN_EDIT)).toBe(false);
    });
  });

  describe('Presets', () => {
    it('DEFAULT_MEMBER_PERMISSIONS contains normal chat privileges', () => {
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_SEND_TEXT)).toBe(true);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_SEND_MEDIA)).toBe(true);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_SEND_VOICE)).toBe(true);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_SEND_POLLS)).toBe(true);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_ADD_REACTIONS)).toBe(true);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_INVITE_USERS)).toBe(true);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.IS_ADMIN)).toBe(false);
      expect(hasPermission(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_DELETE)).toBe(false);
    });

    it('DEFAULT_ADMIN_PERMISSIONS includes admin management rights', () => {
      expect(hasPermission(DEFAULT_ADMIN_PERMISSIONS, Permission.IS_ADMIN)).toBe(true);
      expect(hasPermission(DEFAULT_ADMIN_PERMISSIONS, Permission.CAN_EDIT)).toBe(true);
      expect(hasPermission(DEFAULT_ADMIN_PERMISSIONS, Permission.CAN_DELETE)).toBe(true);
      expect(hasPermission(DEFAULT_ADMIN_PERMISSIONS, Permission.CAN_MANAGE_MEMBERS)).toBe(true);
      expect(hasPermission(DEFAULT_ADMIN_PERMISSIONS, Permission.CAN_PIN_MESSAGES)).toBe(true);
      expect(hasPermission(DEFAULT_ADMIN_PERMISSIONS, Permission.IS_OWNER)).toBe(false);
    });

    it('DEFAULT_OWNER_PERMISSIONS includes IS_OWNER', () => {
      expect(hasPermission(DEFAULT_OWNER_PERMISSIONS, Permission.IS_OWNER)).toBe(true);
      expect(hasPermission(DEFAULT_OWNER_PERMISSIONS, Permission.IS_ADMIN)).toBe(true);
    });

    it('DEFAULT_USER_FLAGS includes default social flags', () => {
      expect(hasPermission(DEFAULT_USER_FLAGS, UserFlags.IS_ACTIVE)).toBe(true);
      expect(hasPermission(DEFAULT_USER_FLAGS, UserFlags.CAN_POST)).toBe(true);
      expect(hasPermission(DEFAULT_USER_FLAGS, UserFlags.CAN_COMMENT)).toBe(true);
      expect(hasPermission(DEFAULT_USER_FLAGS, UserFlags.CAN_DM)).toBe(true);
      expect(hasPermission(DEFAULT_USER_FLAGS, UserFlags.IS_BANNED)).toBe(false);
      expect(hasPermission(DEFAULT_USER_FLAGS, UserFlags.IS_MUTED)).toBe(false);
    });
  });

  describe('Bidirectional converters', () => {
    it('converts admin permissions object to mask and back', () => {
      const customPerms = {
        canEditGroup: true,
        canDeleteMessages: false,
        canManageMembers: true,
        canPinMessages: false,
        canInviteUsers: true,
      };

      const mask = adminPermissionsToMask(customPerms);
      expect(hasPermission(mask, Permission.CAN_EDIT)).toBe(true);
      expect(hasPermission(mask, Permission.CAN_DELETE)).toBe(false);
      expect(hasPermission(mask, Permission.CAN_MANAGE_MEMBERS)).toBe(true);
      expect(hasPermission(mask, Permission.CAN_PIN_MESSAGES)).toBe(false);
      expect(hasPermission(mask, Permission.CAN_INVITE_USERS)).toBe(true);

      const restored = maskToAdminPermissions(mask);
      expect(restored).toEqual(customPerms);
    });

    it('converts message permissions object to mask and back', () => {
      const messagePerms = {
        sendText: true,
        sendMedia: false,
        sendVoice: true,
        sendPolls: false,
        addReactions: true,
      };

      const mask = messagePermissionsToMask(messagePerms);
      expect(hasPermission(mask, Permission.CAN_SEND_TEXT)).toBe(true);
      expect(hasPermission(mask, Permission.CAN_SEND_MEDIA)).toBe(false);
      expect(hasPermission(mask, Permission.CAN_SEND_VOICE)).toBe(true);
      expect(hasPermission(mask, Permission.CAN_SEND_POLLS)).toBe(false);
      expect(hasPermission(mask, Permission.CAN_ADD_REACTIONS)).toBe(true);

      const restored = maskToMessagePermissions(mask);
      expect(restored).toEqual(messagePerms);
    });
  });
});
