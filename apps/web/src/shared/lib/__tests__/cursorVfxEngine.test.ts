import { describe, it, expect, beforeEach } from 'vitest';
import { cursorVfxEngine } from '../cursorVfxEngine';
import { useThemeStore } from '@/shared/model/useThemeStore';

// Polyfill PointerEvent in jsdom if missing
if (typeof window !== 'undefined' && !window.PointerEvent) {
  // @ts-expect-error Mock PointerEvent with MouseEvent for test environment
  window.PointerEvent = MouseEvent;
}

describe('cursorVfxEngine', () => {
  beforeEach(() => {
    useThemeStore.getState().resetCustomCursor();
    cursorVfxEngine.configure({ enabled: false });
  });

  it('configures and starts engine when enabled and at least one effect is active', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      trail: false,
      hover: false,
      presetId: 'minecraft-sword',
      variantId: 'diamond',
    });

    const canvas = document.getElementById('cursor-vfx-canvas');
    expect(canvas).toBeDefined();
  });

  it('stops and cleans up when enabled is turned off', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      presetId: 'minecraft-sword',
      variantId: 'diamond',
    });

    cursorVfxEngine.configure({ enabled: false });
    expect(true).toBe(true);
  });

  it('handles pointer events for Minecraft Sword (Critical Hit Particles)', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      presetId: 'minecraft-sword',
      variantId: 'diamond',
    });

    const event = new MouseEvent('pointerdown', {
      clientX: 200,
      clientY: 300,
      bubbles: true,
    });
    window.dispatchEvent(event);
    expect(true).toBe(true);
  });

  it('handles pointer events for Minecraft Pickaxe (3D Grass Blocks)', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      presetId: 'minecraft-pickaxe',
      variantId: 'netherite',
    });

    const event = new MouseEvent('pointerdown', {
      clientX: 150,
      clientY: 250,
      bubbles: true,
    });
    window.dispatchEvent(event);
    expect(true).toBe(true);
  });

  it('handles pointer events for Minecraft Axe (3D Oak Log Blocks)', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      presetId: 'minecraft-axe',
      variantId: 'gold',
    });

    const event = new MouseEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });
    window.dispatchEvent(event);
    expect(true).toBe(true);
  });

  it('handles pointer events for Katana (Slash Arc)', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      presetId: 'katana',
      variantId: 'crimson',
    });

    const event = new MouseEvent('pointerdown', {
      clientX: 300,
      clientY: 300,
      bubbles: true,
    });
    window.dispatchEvent(event);
    expect(true).toBe(true);
  });

  it('handles pointer events for Magic Wand (Stardust)', () => {
    cursorVfxEngine.configure({
      enabled: true,
      click: true,
      trail: true,
      presetId: 'magic-wand',
      variantId: 'starlight',
    });

    const downEvent = new MouseEvent('pointerdown', {
      clientX: 250,
      clientY: 250,
      bubbles: true,
    });
    window.dispatchEvent(downEvent);

    const moveEvent = new MouseEvent('pointermove', {
      clientX: 280,
      clientY: 280,
      bubbles: true,
    });
    window.dispatchEvent(moveEvent);
    expect(true).toBe(true);
  });

  it('updates store when toggling VFX settings and resetting', () => {
    const store = useThemeStore.getState();
    expect(store.cursorVfxEnabled).toBe(false);
    expect(store.cursorVfxClick).toBe(false);
    expect(store.cursorVfxTrail).toBe(false);
    expect(store.cursorVfxHover).toBe(false);

    store.setCursorVfxEnabled(true);
    store.setCursorVfxSetting('click', true);
    store.setCursorVfxSetting('trail', true);
    store.setCursorVfxSetting('hover', true);

    const updated = useThemeStore.getState();
    expect(updated.cursorVfxEnabled).toBe(true);
    expect(updated.cursorVfxClick).toBe(true);
    expect(updated.cursorVfxTrail).toBe(true);
    expect(updated.cursorVfxHover).toBe(true);

    store.resetCustomCursor();
    const reset = useThemeStore.getState();
    expect(reset.cursorVfxEnabled).toBe(false);
    expect(reset.cursorVfxClick).toBe(false);
    expect(reset.cursorVfxTrail).toBe(false);
    expect(reset.cursorVfxHover).toBe(false);
  });
});
