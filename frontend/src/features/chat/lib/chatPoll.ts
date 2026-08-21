export interface ChatPollData {
  type: 'POLL';
  question: string;
  options: { id: string; text: string; votes?: number }[];
}

export function parseChatPoll(body: string | null): ChatPollData | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed.type === 'POLL' && parsed.question && Array.isArray(parsed.options)) {
      return parsed as ChatPollData;
    }
  } catch {
    // Not a JSON poll
  }
  return null;
}
