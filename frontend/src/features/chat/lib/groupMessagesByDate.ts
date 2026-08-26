import { MessageView } from '../../../entities/chat/model/types';

export interface MessageGroup {
  label: string;
  date: Date;
  messages: MessageView[];
}

function dayLabel(date: Date): string {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

export function groupMessagesByDate(messages: MessageView[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const msgDate = new Date(message.createdAt);
    const label = dayLabel(msgDate);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.label === label) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ label, date: msgDate, messages: [message] });
    }
  }

  return groups;
}

export function formatMessageTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
