import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AppearanceTab from '../AppearanceTab';
import {
  useThemeStore,
  safeRevokeMediaUrl,
  rehydrateWallpaperBlob,
} from '@/shared/model/useThemeStore';
import * as indexedDbStorage from '@/shared/lib/indexedDbStorage';

describe('AppearanceTab (Theme Settings)', () => {
  beforeEach(() => {
    useThemeStore.getState().resetToDefaults();
  });

  it('renders fixed 6-slot base theme grid (Light, Ash, Dark, Midnight, Custom, RGB Picker)', () => {
    render(<AppearanceTab />);

    expect(screen.getByText('Default Canvas Themes')).toBeInTheDocument();
    expect(screen.getByTitle('Light')).toBeInTheDocument();
    expect(screen.getByTitle('Ash')).toBeInTheDocument();
    expect(screen.getByTitle('Dark')).toBeInTheDocument();
    expect(screen.getByTitle('Midnight')).toBeInTheDocument();
    expect(screen.getByTitle('Choose custom shade')).toBeInTheDocument();
    expect(screen.getByTitle('Open RGB palette')).toBeInTheDocument();
  });

  it('switches between base themes correctly on swatch clicks', () => {
    render(<AppearanceTab />);

    const lightBtn = screen.getByTitle('Light');
    fireEvent.click(lightBtn);
    expect(useThemeStore.getState().solidTheme).toBe('light');
    expect(useThemeStore.getState().theme).toBe('light');

    const midnightBtn = screen.getByTitle('Midnight');
    fireEvent.click(midnightBtn);
    expect(useThemeStore.getState().solidTheme).toBe('midnight');
  });

  it('sets custom solid color in slot 5 without expanding layout grid', () => {
    render(<AppearanceTab />);

    useThemeStore.getState().setCustomSolidColor('#a855f7');
    expect(useThemeStore.getState().solidTheme).toBe('custom');
    expect(useThemeStore.getState().customSolidColor).toBe('#a855f7');
    expect(useThemeStore.getState().recentColors).toContain('#a855f7');

    // Updating again modifies slot 5 and adds to recent colors
    useThemeStore.getState().setCustomSolidColor('#06b6d4');
    expect(useThemeStore.getState().customSolidColor).toBe('#06b6d4');
    expect(useThemeStore.getState().recentColors[0]).toBe('#06b6d4');
  });

  it('switches accent color and updates textOnAccent token', () => {
    render(<AppearanceTab />);

    // Click Spotify green preset
    const spotifyPreset = screen.getByTitle(/Spotify Green/i);
    fireEvent.click(spotifyPreset);

    expect(useThemeStore.getState().accentColor).toBe('#1ED760');
    // On Spotify green, textOnAccent must be black (#000000) for contrast
    expect(useThemeStore.getState().textOnAccent).toBe('#000000');

    // Click Blurple preset
    const blurplePreset = screen.getByTitle(/Blurple/i);
    fireEvent.click(blurplePreset);
    expect(useThemeStore.getState().accentColor).toBe('#5865F2');
    expect(useThemeStore.getState().textOnAccent).toBe('#ffffff');
  });

  it('toggles Sync with System theme switch', () => {
    render(<AppearanceTab />);

    const switchBtn = screen.getByRole('switch', { name: /Sync with device/i });
    expect(useThemeStore.getState().syncWithSystem).toBe(false);

    fireEvent.click(switchBtn);
    expect(useThemeStore.getState().syncWithSystem).toBe(true);
  });

  it('resets all theme settings back to defaults when clicking reset button', () => {
    useThemeStore.getState().setSolidTheme('light');
    useThemeStore.getState().setAccentColor('#EAB308');
    useThemeStore.getState().setGlassmorphismOpacity(0.9);

    render(<AppearanceTab />);

    const resetBtn = screen.getByText('Reset appearance to default');
    fireEvent.click(resetBtn);

    const state = useThemeStore.getState();
    expect(state.solidTheme).toBe('dark');
    expect(state.accentColor).toBe('#8B5CF6');
    expect(state.textOnAccent).toBe('#ffffff');
    expect(state.glassmorphismOpacity).toBe(0.0);
  });

  it('safely revokes object URL to prevent memory leaks', () => {
    const revokeMock = vi.fn();
    window.URL.revokeObjectURL = revokeMock;

    safeRevokeMediaUrl('blob:http://localhost:5173/mock-uuid-1');
    expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost:5173/mock-uuid-1');

    // Non-blob URLs must not trigger revokeObjectURL
    revokeMock.mockClear();
    safeRevokeMediaUrl('https://images.unsplash.com/photo');
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it('rehydrates custom wallpaper from IndexedDB correctly', async () => {
    const mockBlob = new Blob(['mock-image-data'], { type: 'image/png' });
    vi.spyOn(indexedDbStorage, 'idbGet').mockResolvedValue(mockBlob);
    window.URL.createObjectURL = vi
      .fn()
      .mockReturnValue('blob:http://localhost:5173/fresh-blob-123');

    useThemeStore.setState({
      wallpaper: {
        id: 'wall-1',
        name: 'my-wallpaper.png',
        url: '',
        dimming: 0.5,
        blur: 0,
        isAnimated: false,
        mediaType: 'image',
        themeMode: 'dark',
      },
    });

    const freshUrl = await rehydrateWallpaperBlob();
    expect(freshUrl).toBe('blob:http://localhost:5173/fresh-blob-123');
    expect(useThemeStore.getState().wallpaper?.url).toBe(
      'blob:http://localhost:5173/fresh-blob-123',
    );
  });

  it('renders quick wallpaper switcher card and activates wallpaper', async () => {
    useThemeStore.setState({
      themeMode: 'solid',
      solidTheme: 'dark',
      wallpaper: {
        id: 'wall-1',
        name: 'background-ulqiora.gif',
        url: 'blob:http://localhost:5173/valid-ulqiora',
        dimming: 0.2,
        blur: 0,
        isAnimated: true,
        mediaType: 'gif',
        themeMode: 'dark',
      },
    });

    render(<AppearanceTab />);

    expect(screen.getByText('My Custom Wallpaper')).toBeInTheDocument();
    expect(screen.getAllByText('background-ulqiora.gif').length).toBeGreaterThanOrEqual(1);

    const activateBtn = screen.getByRole('button', { name: /Enable wallpaper/i });
    fireEvent.click(activateBtn);

    expect(useThemeStore.getState().themeMode).toBe('wallpaper');
  });

  it('renders Typography section with 3 scope toggles, Minecraft font, effects, and swatches', () => {
    render(<AppearanceTab />);

    expect(screen.getByText('Typography & Text Styling')).toBeInTheDocument();
    expect(screen.getByText('Headings & Titles only')).toBeInTheDocument();
    expect(screen.getByText('Apply to everything')).toBeInTheDocument();
    expect(screen.getByText('Do not apply')).toBeInTheDocument();
    expect(screen.getByTitle('Minecraft')).toBeInTheDocument();
    expect(screen.getByText('Text Effects')).toBeInTheDocument();
    expect(screen.getByText('Text Color Selection')).toBeInTheDocument();
  });

  it('switches font scope correctly between headings, all, and none', () => {
    render(<AppearanceTab />);

    const headingsScopeBtn = screen.getByText('Headings & Titles only');
    fireEvent.click(headingsScopeBtn);
    expect(useThemeStore.getState().appFontScope).toBe('headings');

    const allScopeBtn = screen.getByText('Apply to everything');
    fireEvent.click(allScopeBtn);
    expect(useThemeStore.getState().appFontScope).toBe('all');

    const noneScopeBtn = screen.getByText('Do not apply');
    fireEvent.click(noneScopeBtn);
    expect(useThemeStore.getState().appFontScope).toBe('none');
  });

  it('selects Minecraft font and updates store state', () => {
    render(<AppearanceTab />);

    const minecraftBtn = screen.getByTitle('Minecraft');
    fireEvent.click(minecraftBtn);

    expect(useThemeStore.getState().appFontId).toBe('minecraft');
    expect(useThemeStore.getState().appFontFamily).toContain('Minecraft');
    // Selecting font when scope was 'none' auto-enables 'headings' scope
    expect(useThemeStore.getState().appFontScope).toBe('headings');
  });

  it('selects text effect and text color swatch correctly', () => {
    render(<AppearanceTab />);

    const neonBtn = screen.getByTitle('Neon');
    fireEvent.click(neonBtn);
    expect(useThemeStore.getState().appTextEffect).toBe('neon');

    const mintSwatch = screen.getByTitle('Mint');
    fireEvent.click(mintSwatch);
    expect(useThemeStore.getState().appTextColor).toBe('#34d399');
  });

  it('resets typography back to defaults', () => {
    useThemeStore.getState().setAppFontId('minecraft');
    useThemeStore.getState().setAppFontScope('all');
    useThemeStore.getState().setAppTextEffect('gradient');
    useThemeStore.getState().setAppTextColor('#f43f5e');

    render(<AppearanceTab />);

    const resetFontBtn = screen.getByText('Reset font');
    fireEvent.click(resetFontBtn);

    const state = useThemeStore.getState();
    expect(state.appFontId).toBe('default');
    expect(state.appFontScope).toBe('none');
    expect(state.appTextEffect).toBe('minimal');
    expect(state.appTextColor).toBe('auto');
  });

  it('renders and selects newly added fonts (Dela Gothic One, Orbitron, VT323, Michroma)', () => {
    render(<AppearanceTab />);

    expect(screen.getByTitle('Dela Gothic One')).toBeInTheDocument();
    expect(screen.getByTitle('Cinzel Decorative')).toBeInTheDocument();
    expect(screen.getByTitle('Gothic A1 / Unifraktur')).toBeInTheDocument();
    expect(screen.getByTitle('Orbitron')).toBeInTheDocument();
    expect(screen.getByTitle('Michroma')).toBeInTheDocument();
    expect(screen.getByTitle('VT323 Terminal')).toBeInTheDocument();

    const orbitronBtn = screen.getByTitle('Orbitron');
    fireEvent.click(orbitronBtn);
    expect(useThemeStore.getState().appFontId).toBe('orbitron');
    expect(useThemeStore.getState().appFontFamily).toContain('Orbitron');
  });

  describe('Custom Cursors Section', () => {
    it('renders master switch, size buttons, and all cursor presets', () => {
      render(<AppearanceTab />);

      expect(screen.getByRole('switch', { name: /Enable custom cursor/i })).toBeInTheDocument();
      expect(screen.getByText('Normal (32px)')).toBeInTheDocument();
      expect(screen.getByText('Large (44px)')).toBeInTheDocument();

      expect(screen.getByTitle('Minecraft Sword')).toBeInTheDocument();
      expect(screen.getByTitle('Minecraft Pickaxe')).toBeInTheDocument();
      expect(screen.getByTitle('Minecraft Axe')).toBeInTheDocument();
      expect(screen.getByTitle('Dota 2 Classic')).toBeInTheDocument();
      expect(screen.getByTitle('3D Pixel Cursor')).toBeInTheDocument();
      expect(screen.getByTitle('Realistic Katana')).toBeInTheDocument();
      expect(screen.getByTitle('Cyberpunk Crosshair')).toBeInTheDocument();
      expect(screen.getByTitle('Magic Wand')).toBeInTheDocument();
    });

    it('toggles master custom cursor switch', () => {
      render(<AppearanceTab />);

      const masterSwitch = screen.getByRole('switch', { name: /Enable custom cursor/i });
      expect(useThemeStore.getState().customCursorEnabled).toBe(false);

      fireEvent.click(masterSwitch);
      expect(useThemeStore.getState().customCursorEnabled).toBe(true);

      fireEvent.click(masterSwitch);
      expect(useThemeStore.getState().customCursorEnabled).toBe(false);
    });

    it('selects Minecraft sword and switches blade materials', () => {
      render(<AppearanceTab />);

      const swordCard = screen.getByTitle('Minecraft Sword');
      fireEvent.click(swordCard);

      expect(useThemeStore.getState().customCursorId).toBe('minecraft-sword');
      expect(useThemeStore.getState().customCursorEnabled).toBe(true);

      // Click Netherite material pill
      const netheriteBtn = screen.getAllByTitle('Netherite')[0];
      fireEvent.click(netheriteBtn);
      expect(useThemeStore.getState().customCursorVariant).toBe('netherite');

      // Click Ruby material pill
      const rubyBtn = screen.getAllByTitle('Ruby')[0];
      fireEvent.click(rubyBtn);
      expect(useThemeStore.getState().customCursorVariant).toBe('ruby');
    });

    it('selects Dota 2 cursor and switches styles (Wrath of Ka, Crimson)', () => {
      render(<AppearanceTab />);

      const dotaCard = screen.getByTitle('Dota 2 Classic');
      fireEvent.click(dotaCard);

      expect(useThemeStore.getState().customCursorId).toBe('dota2');
      expect(useThemeStore.getState().customCursorEnabled).toBe(true);

      const wrathBtn = screen.getByTitle('Wrath of Ka (Spectral)');
      fireEvent.click(wrathBtn);
      expect(useThemeStore.getState().customCursorVariant).toBe('wrath-of-ka');
    });

    it('selects Realistic Katana and switches tsukamaki handle wrap', () => {
      render(<AppearanceTab />);

      const katanaCard = screen.getByTitle('Realistic Katana');
      fireEvent.click(katanaCard);

      expect(useThemeStore.getState().customCursorId).toBe('katana');
      expect(useThemeStore.getState().customCursorEnabled).toBe(true);

      const thunderBtn = screen.getByTitle('Thunder Steel');
      fireEvent.click(thunderBtn);
      expect(useThemeStore.getState().customCursorVariant).toBe('thunder');
    });

    it('selects 3D Pixel Cursor preset', () => {
      render(<AppearanceTab />);

      const p3dCard = screen.getByTitle('3D Pixel Cursor');
      fireEvent.click(p3dCard);

      expect(useThemeStore.getState().customCursorId).toBe('pixel-3d');
      expect(useThemeStore.getState().customCursorEnabled).toBe(true);
    });

    it('switches cursor size between normal and large', () => {
      render(<AppearanceTab />);

      const largeBtn = screen.getByText('Large (44px)');
      fireEvent.click(largeBtn);
      expect(useThemeStore.getState().customCursorSize).toBe('large');

      const normalBtn = screen.getByText('Normal (32px)');
      fireEvent.click(normalBtn);
      expect(useThemeStore.getState().customCursorSize).toBe('normal');
    });

    it('resets custom cursor to defaults via reset button', () => {
      useThemeStore.getState().setCustomCursorId('dota2');
      useThemeStore.getState().setCustomCursorVariant('crimson');
      useThemeStore.getState().setCustomCursorSize('large');
      useThemeStore.getState().setCustomCursorEnabled(true);

      render(<AppearanceTab />);

      const resetBtn = screen.getByText('Reset to system cursor');
      fireEvent.click(resetBtn);

      const state = useThemeStore.getState();
      expect(state.customCursorEnabled).toBe(false);
      expect(state.customCursorId).toBe('minecraft-sword');
      expect(state.customCursorVariant).toBe('diamond');
      expect(state.customCursorSize).toBe('normal');
    });
  });
});
