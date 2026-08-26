import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryEditorStore } from '../useStoryEditorStore';
import type { TextOverlay, PollOverlay } from '../types';

describe('useStoryEditorStore', () => {
  beforeEach(() => {
    useStoryEditorStore.getState().reset();
  });

  it('initializes with default state and opens editor', () => {
    useStoryEditorStore.getState().openEditor();
    const state = useStoryEditorStore.getState();

    expect(state.isOpen).toBe(true);
    expect(state.mediaFile).toBeNull();
    expect(state.overlays).toEqual([]);
    expect(state.privacy).toBe('ALL_FOLLOWERS');
  });

  it('adds, updates, and removes overlays', () => {
    useStoryEditorStore.getState().openEditor();

    const textOverlay: TextOverlay = {
      id: 'txt-1',
      type: 'text',
      text: 'Hello World',
      xPercent: 50,
      yPercent: 50,
    };

    useStoryEditorStore.getState().addOverlay(textOverlay);
    expect(useStoryEditorStore.getState().overlays.length).toBe(1);

    useStoryEditorStore.getState().updateOverlay('txt-1', { xPercent: 70 });
    expect(useStoryEditorStore.getState().overlays[0].xPercent).toBe(70);

    useStoryEditorStore.getState().removeOverlay('txt-1');
    expect(useStoryEditorStore.getState().overlays.length).toBe(0);
  });

  it('updates privacy and background color', () => {
    useStoryEditorStore.getState().setPrivacy('CLOSE_FRIENDS');
    expect(useStoryEditorStore.getState().privacy).toBe('CLOSE_FRIENDS');

    useStoryEditorStore.getState().setBackgroundColor('#000000');
    expect(useStoryEditorStore.getState().backgroundColor).toBe('#000000');
  });
});
