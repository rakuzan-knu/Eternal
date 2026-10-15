import { useEffect } from 'react';
import { create } from 'zustand';

export type PiPWidgetId = 'call' | 'player';

interface PiPStackState {
  activeOrder: PiPWidgetId[];
  registerDefault: (id: PiPWidgetId) => void;
  unregisterDefault: (id: PiPWidgetId) => void;
}

export const usePiPStackStore = create<PiPStackState>((set) => ({
  activeOrder: [],
  registerDefault: (id) =>
    set((state) => {
      if (state.activeOrder.includes(id)) return state;
      return { activeOrder: [...state.activeOrder, id] };
    }),
  unregisterDefault: (id) =>
    set((state) => {
      if (!state.activeOrder.includes(id)) return state;
      return { activeOrder: state.activeOrder.filter((w) => w !== id) };
    }),
}));

/**
 * Hook to manage non-overlapping vertical stacking between Call PiP and Spotify Square Dock.
 * Whichever widget is in default bottom-right position first stays at bottom (84px).
 * The second widget smoothly stacks right above the first one without overlapping.
 *
 * @param id 'call' | 'player'
 * @param isAtDefault boolean indicating if the widget is active in its default (un-dragged) position
 * @returns boolean true if this widget should be stacked above the other widget
 */
export function usePiPStackOffset(id: PiPWidgetId, isAtDefault: boolean): boolean {
  const activeOrder = usePiPStackStore((s) => s.activeOrder);
  const registerDefault = usePiPStackStore((s) => s.registerDefault);
  const unregisterDefault = usePiPStackStore((s) => s.unregisterDefault);

  useEffect(() => {
    if (isAtDefault) {
      registerDefault(id);
    } else {
      unregisterDefault(id);
    }
    return () => {
      unregisterDefault(id);
    };
  }, [id, isAtDefault, registerDefault, unregisterDefault]);

  const index = activeOrder.indexOf(id);
  return isAtDefault && index > 0;
}
