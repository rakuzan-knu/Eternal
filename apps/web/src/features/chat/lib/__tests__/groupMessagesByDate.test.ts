import { describe, it, expect } from 'vitest';
import { groupMessagesByDate, formatMessageTime } from '../groupMessagesByDate';
import type { MessageView } from '@/entities/chat/model/types';

describe('groupMessagesByDate', () => {
  it('groups messages by Today, Yesterday, and older calendar dates', () => {
    const now = new Date();
    const today = now.toISOString();

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString();

    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 10);
    const past = pastDate.toISOString();

    const messages: Partial<MessageView>[] = [
      { id: 'm1', body: 'Msg 1', createdAt: today },
      { id: 'm2', body: 'Msg 2', createdAt: today },
      { id: 'm3', body: 'Msg 3', createdAt: yesterday },
      { id: 'm4', body: 'Msg 4', createdAt: past },
    ];

    const groups = groupMessagesByDate(messages as MessageView[]);
    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].messages).toHaveLength(2);
    expect(groups[1].label).toBe('Yesterday');
    expect(groups[1].messages).toHaveLength(1);
    expect(groups[2].label).not.toBe('Today');
    expect(groups[2].label).not.toBe('Yesterday');
  });

  it('formats message time as HH:MM', () => {
    const iso = '2026-08-16T15:30:00.000Z';
    const formatted = formatMessageTime(iso);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
