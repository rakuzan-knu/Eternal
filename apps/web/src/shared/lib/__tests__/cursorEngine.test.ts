import { describe, it, expect, beforeEach } from 'vitest';
import {
  CURSOR_PRESETS,
  generateCursorSvg,
  getCursorCssValue,
  applyCursorToDOM,
  MINECRAFT_TOOL_VARIANTS,
  DOTA2_VARIANTS,
  PIXEL_3D_VARIANTS,
  KATANA_VARIANTS,
  type CursorStateType,
} from '../cursorEngine';

describe('cursorEngine', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-custom-cursor');
    document.documentElement.removeAttribute('data-cursor-id');
    document.documentElement.style.removeProperty('--custom-cursor-default');
    document.documentElement.style.removeProperty('--custom-cursor-pointer');
    document.documentElement.style.removeProperty('--custom-cursor-text');
    document.documentElement.style.removeProperty('--custom-cursor-grab');
    document.documentElement.style.removeProperty('--custom-cursor-grabbing');
    document.documentElement.style.removeProperty('--custom-cursor-not-allowed');
  });

  it('defines all requested presets (Minecraft Sword, Pickaxe, Axe, Dota 2, 3D Pixel, Katana)', () => {
    const ids = CURSOR_PRESETS.map((p) => p.id);
    expect(ids).toContain('minecraft-sword');
    expect(ids).toContain('minecraft-pickaxe');
    expect(ids).toContain('minecraft-axe');
    expect(ids).toContain('dota2');
    expect(ids).toContain('pixel-3d');
    expect(ids).toContain('katana');
    expect(ids).toContain('cyberpunk-crosshair');
    expect(ids).toContain('magic-wand');
  });

  it('defines all Minecraft tool materials (Diamond, Netherite, Iron, Gold, Emerald, Ruby)', () => {
    const variantIds = MINECRAFT_TOOL_VARIANTS.map((v) => v.id);
    expect(variantIds).toEqual(['diamond', 'netherite', 'iron', 'gold', 'emerald', 'ruby']);
  });

  it('defines Dota 2 variants (Classic, Wrath of Ka, Crimson, Gold)', () => {
    const dotaIds = DOTA2_VARIANTS.map((v) => v.id);
    expect(dotaIds).toEqual(['classic', 'wrath-of-ka', 'crimson', 'gold']);
  });

  it('defines 3D Pixel variants from Image 4', () => {
    const p3dIds = PIXEL_3D_VARIANTS.map((v) => v.id);
    expect(p3dIds).toEqual(['cyber', 'cyan', 'lime', 'amber']);
  });

  it('generates valid SVG for all presets across all system states (default, pointer, text, grab, grabbing)', () => {
    const states: CursorStateType[] = [
      'default',
      'pointer',
      'text',
      'grab',
      'grabbing',
      'not-allowed',
    ];
    for (const preset of CURSOR_PRESETS) {
      for (const state of states) {
        const svg = generateCursorSvg(preset.id, preset.defaultVariant, state, 32);
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
      }
    }
  });

  it('dynamically changes Katana tsukamaki wrap and aura colors based on selected variant', () => {
    const crimsonSvg = generateCursorSvg('katana', 'crimson', 'default', 32);
    expect(crimsonSvg).toContain('#dc2626'); // Red wrap from Image 5

    const thunderSvg = generateCursorSvg('katana', 'thunder', 'default', 32);
    expect(thunderSvg).toContain('#2563eb'); // Blue wrap

    const jadeSvg = generateCursorSvg('katana', 'jade', 'default', 32);
    expect(jadeSvg).toContain('#059669'); // Green wrap
  });

  it('generates correct CSS cursor values with accurate hotspots', () => {
    const swordCss = getCursorCssValue('minecraft-sword', 'diamond', 'default', 32);
    expect(swordCss).toMatch(/^url\("data:image\/png;base64,.+"\)\s+0\s+0,\s+auto$/);

    const dotaCss = getCursorCssValue('dota2', 'classic', 'default', 32);
    expect(dotaCss).toMatch(/^url\("data:image\/png;base64,.+"\)\s+4\s+4,\s+auto$/);

    const textCss = getCursorCssValue('dota2', 'classic', 'text', 32);
    expect(textCss).toMatch(/^url\("data:image\/png;base64,.+"\)\s+24\s+24,\s+text$/);

    const pixelCss = getCursorCssValue('pixel-3d', 'cyber', 'default', 32);
    expect(pixelCss).toContain('data:image/svg+xml');
  });

  it('applies and clears all system cursor CSS variables on documentElement', () => {
    applyCursorToDOM(true, 'dota2', 'classic', 32);
    const root = document.documentElement;

    expect(root.getAttribute('data-custom-cursor')).toBe('true');
    expect(root.getAttribute('data-cursor-id')).toBe('dota2');
    expect(root.style.getPropertyValue('--custom-cursor-default')).toContain(
      'data:image/png;base64',
    );
    expect(root.style.getPropertyValue('--custom-cursor-pointer')).toContain(
      'data:image/png;base64',
    );
    expect(root.style.getPropertyValue('--custom-cursor-text')).toContain('data:image/png;base64');
    expect(root.style.getPropertyValue('--custom-cursor-grab')).toContain('data:image/png;base64');
    expect(root.style.getPropertyValue('--custom-cursor-grabbing')).toContain(
      'data:image/png;base64',
    );
    expect(root.style.getPropertyValue('--custom-cursor-not-allowed')).toContain(
      'data:image/png;base64',
    );

    // Vector preset DOM application
    applyCursorToDOM(true, 'pixel-3d', 'cyber', 32);
    expect(root.style.getPropertyValue('--custom-cursor-default')).toContain('data:image/svg+xml');

    // Disable cursor
    applyCursorToDOM(false, 'dota2', 'classic', 32);
    expect(root.hasAttribute('data-custom-cursor')).toBe(false);
    expect(root.hasAttribute('data-cursor-id')).toBe(false);
    expect(root.style.getPropertyValue('--custom-cursor-default')).toBe('');
    expect(root.style.getPropertyValue('--custom-cursor-text')).toBe('');
  });
});
