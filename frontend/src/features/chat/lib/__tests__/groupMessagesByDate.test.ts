import { describe, it, expect } from 'vitest';
import { groupMessagesByDate, formatMessageTime } from '../groupMessagesByDate';
import type { MessageView } from '@/entities/chat/model/types';

describe('groupMessagesByDate', () => {
  it('groups messages by same calendar date', () => {
    const today = new Date().toISOString();
    const messages: Partial<MessageView>[] = [
      { id: 'm1', body: 'Msg 1', createdAt: today },
      { id: 'm2', body: 'Msg 2', createdAt: today },
    ];

    const groups = groupMessagesByDate(messages as MessageView[]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].messages).toHaveLength(2);
  });

  it('formats message time as HH:MM', () => {
    const iso = '2026-08-16T15:30:00.000Z';
    const formatted = formatMessageTime(iso);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
