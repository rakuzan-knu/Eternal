export const WS_EVENTS = {
  JOIN_CONVERSATION: 'joinConversation',
  LEAVE_CONVERSATION: 'leaveConversation',
  TYPING_START: 'typingStart',
  TYPING_STOP: 'typingStop',
  TYPING: 'typing',
  MARK_READ: 'markRead',
  MESSAGE_READ: 'messageRead',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  GET_ONLINE_STATUS: 'getOnlineStatus',
  RATE_LIMIT_EXCEEDED: 'rateLimitExceeded',

  SEND_MESSAGE: 'sendMessage',
  NEW_MESSAGE: 'newMessage',

  EDIT_MESSAGE: 'editMessage',
  MESSAGE_EDITED: 'messageEdited',

  DELETE_MESSAGE: 'deleteMessage',
  MESSAGE_DELETED: 'messageDeleted',

  FORWARD_MESSAGE: 'forwardMessage',

  ADD_REACTION: 'addReaction',
  MESSAGE_REACTION_ADDED: 'messageReactionAdded',
  REMOVE_REACTION: 'removeReaction',
  MESSAGE_REACTION_REMOVED: 'messageReactionRemoved',

  PIN_MESSAGE: 'pinMessage',
  MESSAGE_PINNED: 'messagePinned',
  UNPIN_MESSAGE: 'unpinMessage',
  MESSAGE_UNPINNED: 'messageUnpinned',

  CONVERSATION_UPDATED: 'conversationUpdated',
  CONVERSATION_DELETED: 'conversationDeleted',
  MESSAGES_CLEARED: 'messagesCleared',
  PARTICIPANT_ADDED: 'participantAdded',
  PARTICIPANT_LEFT: 'participantLeft',

  NEW_FOLLOWER: 'newFollower',
  SOCIAL_NOTIFICATION: 'socialNotification',

  GATEWAY_READY: 'gatewayReady',
  GATEWAY_RESUME: 'gatewayResume',
  GATEWAY_RESUMED: 'gatewayResumed',
  RESYNC_REQUIRED: 'resyncRequired',
  HEARTBEAT: 'heartbeat',
} as const;

export type WsEventKey = keyof typeof WS_EVENTS;
export type WsEventValue = (typeof WS_EVENTS)[WsEventKey];
export type WsEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
