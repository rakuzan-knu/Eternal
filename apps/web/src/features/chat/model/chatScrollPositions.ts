import type { VirtualItem } from '@tanstack/react-virtual';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

export interface ChatScrollPosition {
  offset: number;
  atBottom: boolean;
  measurements: VirtualItem[];
}

// Session memory only; never persist conversation identifiers or measurements.
const positions = new Map<string, ChatScrollPosition>();
let generation = 0;
export const getChatScrollGeneration = () => generation;
export const getChatScrollPosition = (id: string) => positions.get(id);

export function saveChatScrollPosition(id: string, position: ChatScrollPosition, epoch: number) {
  // An outgoing component must not repopulate a reset account's cache on unmount.
  if (epoch !== generation) return;
  positions.delete(id);
  positions.set(id, position);
  if (positions.size > 20) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
}

registerSessionResetHandler(() => {
  positions.clear();
  generation += 1;
});
