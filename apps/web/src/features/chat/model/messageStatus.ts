/**
 * Enterprise message delivery status machine.
 *
 * Canonical lifecycle (client view):
 *   pending → sent → delivered → read
 *                    ↘ failed (terminal, retryable)
 *
 * Backend/frontend legacy literals (`SENDING`/`SENT`/`DELIVERED`/`READ`/
 * `ERROR`) are normalized to this machine. `pending` ≡ `SENDING`,
 * `failed` ≡ `ERROR`. Both spellings are accepted on input; canonical
 * lowercase is used for new logic, uppercase is preserved when writing
 * back to `MessageView.status` for backwards compatibility with UI.
 */

export const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export type MessageDeliveryStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

/** Legacy literals stored on `MessageView.status`. */
export type LegacyMessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'ERROR';

const LEGACY_TO_CANONICAL: Record<string, MessageDeliveryStatus> = {
  SENDING: 'pending',
  PENDING: 'pending',
  pending: 'pending',
  SENT: 'sent',
  sent: 'sent',
  DELIVERED: 'delivered',
  delivered: 'delivered',
  READ: 'read',
  read: 'read',
  ERROR: 'failed',
  FAILED: 'failed',
  failed: 'failed',
};

const CANONICAL_TO_LEGACY: Record<MessageDeliveryStatus, LegacyMessageStatus> = {
  pending: 'SENDING',
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'ERROR',
};

/** Rank for forward-only comparison (failed is terminal, handled separately). */
const STATUS_RANK: Record<MessageDeliveryStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: -1,
};

export function normalizeMessageStatus(
  status: string | null | undefined,
): MessageDeliveryStatus | undefined {
  if (!status) return undefined;
  return LEGACY_TO_CANONICAL[status] ?? undefined;
}

export function toLegacyStatus(status: MessageDeliveryStatus): LegacyMessageStatus {
  return CANONICAL_TO_LEGACY[status];
}

/**
 * Forward-only transition guard. Returns true when `to` is a legal move
 * from `from`. Rules:
 * - `failed` can be entered from `pending`/`sent`, and can leave ONLY via
 *   explicit retry (handled by caller re-entering `pending`).
 * - otherwise status must strictly advance (never regress sent→pending etc.).
 * - same-state writes are no-ops (allowed, return false = "no change").
 */
export function canTransitionMessageStatus(
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  const f = normalizeMessageStatus(from);
  const t = normalizeMessageStatus(to);
  if (!f || !t) return false;
  if (f === t) return false;
  // Retry path: failed → pending is the only legal exit from failed.
  if (f === 'failed') return t === 'pending';
  if (t === 'failed') return f === 'pending' || f === 'sent';
  return STATUS_RANK[t] > STATUS_RANK[f];
}

/**
 * Resolve the next status, enforcing forward-only semantics.
 * Returns the current status (normalized to legacy literal) when the
 * transition is illegal — callers can blindly assign the result.
 */
export function nextMessageStatus(
  current: string | null | undefined,
  desired: MessageDeliveryStatus | LegacyMessageStatus,
): LegacyMessageStatus {
  const currentCanonical = normalizeMessageStatus(current);
  const desiredCanonical = normalizeMessageStatus(desired);
  if (!desiredCanonical) {
    return (current as LegacyMessageStatus) ?? 'SENDING';
  }
  if (!currentCanonical) return toLegacyStatus(desiredCanonical);
  if (!canTransitionMessageStatus(currentCanonical, desiredCanonical)) {
    return toLegacyStatus(currentCanonical);
  }
  return toLegacyStatus(desiredCanonical);
}

/** True when the message is in a terminal state (read or failed). */
export function isTerminalMessageStatus(status: string | null | undefined): boolean {
  const s = normalizeMessageStatus(status);
  return s === 'read' || s === 'failed';
}
