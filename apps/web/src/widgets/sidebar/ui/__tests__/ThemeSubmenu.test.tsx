import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeMenuItem } from '../ThemeSubmenu';
import { useThemeStore } from '@/shared/model/useThemeStore';
import React from 'react';

describe('ThemeMenuItem', () => {
  beforeEach(() => {
    useThemeStore.setState({
      themeMode: 'solid',
      solidTheme: 'dark',
      syncWithSystem: false,
      previousThemeSnapshot: null,
    });
  });

  it('renders theme selector flyout and switches themes', () => {
    render(<ThemeMenuItem />);

    const trigger = screen.getByRole('button', { name: /change appearance/i });
    fireEvent.click(trigger);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();

    const lightBtn = screen.getByRole('button', { name: /light/i });
    fireEvent.click(lightBtn);

    expect(useThemeStore.getState().solidTheme).toBe('light');
  });

  it('clicking Light turns off syncWithSystem so active state does not remain stuck on System', () => {
    useThemeStore.setState({
      themeMode: 'solid',
      solidTheme: 'dark',
      syncWithSystem: true,
    });

    render(<ThemeMenuItem />);

    const trigger = screen.getByRole('button', { name: /change appearance/i });
    fireEvent.click(trigger);

    const lightBtn = screen.getByRole('button', { name: /light/i });
    fireEvent.click(lightBtn);

    expect(useThemeStore.getState().solidTheme).toBe('light');
    expect(useThemeStore.getState().syncWithSystem).toBe(false);
  });

  it('renders previous theme option and restores it when clicked', () => {
    useThemeStore.setState({
      themeMode: 'solid',
      solidTheme: 'dark',
      syncWithSystem: false,
      previousThemeSnapshot: {
        themeMode: 'gradient',
        solidTheme: 'dark',
        customSolidColor: null,
        gradientPresetId: 'cyber-neon',
        customGradient: { from: '#000', to: '#fff', angle: 45 },
        wallpaper: null,
        label: 'Cyber Neon',
      },
    });

    render(<ThemeMenuItem />);

    const trigger = screen.getByRole('button', { name: /change appearance/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Previous theme')).toBeInTheDocument();
    expect(screen.getByText('Cyber Neon')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Previous theme'));
    expect(useThemeStore.getState().themeMode).toBe('gradient');
    expect(useThemeStore.getState().gradientPresetId).toBe('cyber-neon');
  });
});
