import { describe, it, expect, vi } from 'vitest';

const { resets } = vi.hoisted(() => ({ resets: [] as (() => void)[] }));
vi.mock('@/shared/model/resetSession', () => ({
  registerSessionResetHandler: (handler: () => void) => resets.push(handler),
}));
import {
  getChatScrollGeneration,
  getChatScrollPosition,
  saveChatScrollPosition,
} from '../chatScrollPositions';

describe('chat history position memory', () => {
  it('evicts older conversations and prevents outgoing account cleanup from restoring private state', () => {
    const epoch = getChatScrollGeneration();
    const position = { offset: 320, atBottom: false, measurements: [] };
    for (let index = 0; index < 21; index++)
      saveChatScrollPosition(`chat-${index}`, position, epoch);
    expect(getChatScrollPosition('chat-0')).toBeUndefined();
    expect(getChatScrollPosition('chat-20')).toEqual(position);
    resets.forEach((reset) => reset());
    expect(getChatScrollPosition('chat-20')).toBeUndefined();
    saveChatScrollPosition('outgoing-account', position, epoch);
    expect(getChatScrollPosition('outgoing-account')).toBeUndefined();
    saveChatScrollPosition('new-account', position, getChatScrollGeneration());
    expect(getChatScrollPosition('new-account')).toEqual(position);
  });
});
