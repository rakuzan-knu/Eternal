import { describe, it, expect } from 'vitest';
import { parseChatPoll } from '../chatPoll';

describe('chatPoll', () => {
  it('returns null for null, empty, non-json, or invalid poll bodies', () => {
    expect(parseChatPoll(null)).toBeNull();
    expect(parseChatPoll('')).toBeNull();
    expect(parseChatPoll('hello world')).toBeNull();
    expect(parseChatPoll(JSON.stringify({ type: 'NOT_A_POLL' }))).toBeNull();
    expect(parseChatPoll(JSON.stringify({ type: 'POLL', question: 'Only question' }))).toBeNull();
  });

  it('parses valid poll json string correctly', () => {
    const validPoll = {
      type: 'POLL' as const,
      question: 'What is your favorite color?',
      options: [
        { id: '1', text: 'Blue', votes: 2 },
        { id: '2', text: 'Red', votes: 1 },
      ],
    };

    const parsed = parseChatPoll(JSON.stringify(validPoll));
    expect(parsed).toEqual(validPoll);
  });
});
