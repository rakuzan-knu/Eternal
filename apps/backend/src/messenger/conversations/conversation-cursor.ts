import { BadRequestException, GoneException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ConversationCursor {
  before: string;
  id: string;
  cutoff: string;
}
export function encodeConversationCursor(
  value: ConversationCursor,
  scope: string,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify({ ...value, scope, v: 1 })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function decodeConversationCursor(
  cursor: string,
  scope: string,
  secret: string,
): ConversationCursor {
  try {
    const [body, signature, extra] = cursor.split('.');
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error();
    const value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      value.v !== 1 ||
      value.scope !== scope ||
      typeof value.id !== 'string' ||
      !value.id ||
      typeof value.before !== 'string' ||
      typeof value.cutoff !== 'string' ||
      !Number.isFinite(Date.parse(value.before)) ||
      !Number.isFinite(Date.parse(value.cutoff))
    )
      throw new Error();
    if (Date.now() - Date.parse(value.cutoff) > 15 * 60_000)
      throw new GoneException('Conversation cursor expired; start a new page');
    return { before: value.before, id: value.id, cutoff: value.cutoff };
  } catch (error) {
    if (error instanceof GoneException) throw error;
    throw new BadRequestException('Invalid conversation cursor');
  }
}
