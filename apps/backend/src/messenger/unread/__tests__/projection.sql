-- Hand-derived counts exercise the actual migration triggers and reconciliation.
SELECT unread_projection_reconcile('p');
SELECT unread_projection_reconcile('p-sender');
INSERT INTO "Message" (id, "conversationId", "senderId", "createdAt", "messageType") VALUES
 ('one', 'c', 'sender', '2026-01-01 00:00:01', 'TEXT'),
 ('system', 'c', 'sender', '2026-01-01 00:00:02', 'SYSTEM'),
 ('forward', 'c', 'other', '2026-01-01 00:00:03', 'TEXT'),
 ('self', 'c', 'reader', '2026-01-01 00:00:04', 'TEXT'),
 ('old', 'c', 'sender', '2025-12-31 23:59:59', 'TEXT');
SELECT test_assert(test_bucket(), 3, 'all message insert paths increment; self/history excluded');
INSERT INTO outbox_events VALUES ('e1', 'message.sent', 'PENDING', '{}'), ('e2', 'message.sent', 'PUBLISHED', '{}');
UPDATE outbox_events SET status = 'PUBLISHED';
UPDATE outbox_events SET status = 'PUBLISHED';
SELECT test_assert(test_bucket(), 3, 'lost/duplicate outbox publication never increments twice');
INSERT INTO "UserBlock" VALUES ('reader', 'sender');
SELECT test_assert(test_badge(), 1, 'outgoing block');
DELETE FROM "UserBlock";
INSERT INTO "UserBlock" VALUES ('sender', 'reader');
SELECT test_assert(test_badge(), 1, 'incoming block');
DELETE FROM "UserBlock";
SELECT test_assert(test_badge(), 3, 'unblock restores existing unread');
INSERT INTO "MessageDeletion" ("messageId", "userId") VALUES ('one', 'reader') ON CONFLICT DO NOTHING;
INSERT INTO "MessageDeletion" ("messageId", "userId") VALUES ('one', 'reader') ON CONFLICT DO NOTHING;
SELECT test_assert(test_bucket(), 2, 'idempotent personal deletion');
DELETE FROM "Message" WHERE id = 'one';
SELECT test_assert(test_bucket(), 2, 'hard deletion cascade does not double decrement a personal deletion');
UPDATE "Message" SET "deletedForAll" = true WHERE id = 'system';
UPDATE "Message" SET "deletedForAll" = true WHERE id = 'system';
SELECT test_assert(test_bucket(), 1, 'duplicate global deletion');
UPDATE "Message" SET "deletedForAll" = false WHERE id = 'system';
SELECT test_assert(test_bucket(), 2, 'restored global deletion');
UPDATE "Message" SET "deletedAt" = '2026-01-02' WHERE id = 'system';
SELECT test_assert(test_bucket(), 1, 'deletedAt alone suppresses unread');
UPDATE "Message" SET "deletedAt" = NULL WHERE id = 'system';
UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:02' WHERE id = 'p';
SELECT test_assert(test_bucket(), 1, 'partial read clears only messages through watermark');
UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:01' WHERE id = 'p';
SELECT test_assert(test_bucket(), 1, 'late read cannot regress watermark');
UPDATE "ConversationParticipant" SET "archivedAt" = '2026-01-02' WHERE id = 'p';
SELECT test_assert(test_badge(), 0, 'archive suppresses badge');
INSERT INTO "Message" (id, "conversationId", "senderId", "createdAt") VALUES ('archived-send', 'c', 'sender', '2026-01-01 00:00:05');
UPDATE "ConversationParticipant" SET "archivedAt" = NULL WHERE id = 'p';
SELECT test_assert(test_badge(), 2, 'unarchive retains unread including archived sends');
UPDATE "ConversationParticipant" SET "leftAt" = '2026-01-02' WHERE id = 'p';
SELECT test_assert(test_badge(), 0, 'left membership suppressed');
UPDATE "ConversationParticipant" SET "leftAt" = NULL, "joinedAt" = '2026-01-01 00:00:05' WHERE id = 'p';
SELECT test_assert(test_bucket(), 1, 'rejoin excludes pre-join history and includes exact join time');
UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:06' WHERE id = 'p';
SELECT test_assert(test_bucket(), 0, 'caught up read clears every sender bucket');
INSERT INTO "Message" (id, "conversationId", "senderId", "createdAt") VALUES ('equal-read', 'c', 'sender', '2026-01-01 00:00:06'), ('later', 'c', 'sender', '2026-01-01 00:00:07');
SELECT test_assert(test_bucket(), 1, 'exact read timestamp excluded; later message retained');
INSERT INTO "MessageDeletion" ("messageId", "userId") VALUES ('later', 'reader');
SELECT test_assert(test_bucket(), 0, 'personal delete after partial read');
DELETE FROM "MessageDeletion" WHERE "messageId" = 'later';
SELECT test_assert(test_bucket(), 1, 'personal deletion restoration');
UPDATE "UnreadSenderCount" SET count = 42 WHERE "participantId" = 'p';
SELECT unread_projection_reconcile('p');
SELECT test_assert(test_bucket(), 1, 'reconciliation repairs drift');
SELECT test_assert(test_badge(), test_oracle(), 'projection equals authoritative oracle');
UPDATE "ConversationParticipant" SET "unreadProjectionReady" = false WHERE id = 'p';
INSERT INTO "Message" (id, "conversationId", "senderId", "createdAt", "messageType") VALUES ('theme', 'c', 'other', '2026-01-01 00:00:08', 'THEME_PROPOSAL');
SELECT unread_projection_reconcile('p');
SELECT test_assert(test_bucket(), 2, 'bounded backfill includes messages inserted before readiness');
SELECT unread_projection_reset_read('p');
SELECT test_assert(test_bucket(), 4, 'explicit mark unread rewinds and rebuilds since join');
UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:07' WHERE id = 'p';
SELECT test_assert(test_bucket(), 1, 'ordinary read after explicit rewind remains monotonic');
UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:06' WHERE id = 'p';
SELECT test_assert(test_bucket(), 1, 'reset permission cannot leak into later reads');
