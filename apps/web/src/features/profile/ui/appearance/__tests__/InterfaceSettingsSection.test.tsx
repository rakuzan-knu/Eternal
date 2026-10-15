import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InterfaceSettingsSection } from '../InterfaceSettingsSection';
import { useThemeStore } from '@/shared/model/useThemeStore';

describe('InterfaceSettingsSection (Appearance Subsection)', () => {
  beforeEach(() => {
    useThemeStore.setState({
      spotifyDockStyle: 'bar',
      soundFxEnabled: false,
    });
  });

  it('renders section title and player style options', () => {
    render(<InterfaceSettingsSection />);

    expect(screen.getByText('Interface Settings')).toBeInTheDocument();
    expect(screen.getByText('Floating Dock Bar')).toBeInTheDocument();
    expect(screen.getByText('Compact Square (Call Style)')).toBeInTheDocument();
  });

  it('selects Compact Square style on click and updates useThemeStore', () => {
    render(<InterfaceSettingsSection />);

    const squareOption = screen.getByText('Compact Square (Call Style)').closest('[role="button"]');
    expect(squareOption).toBeInTheDocument();

    fireEvent.click(squareOption!);
    expect(useThemeStore.getState().spotifyDockStyle).toBe('square');
  });

  it('switches back to Floating Dock Bar on click', () => {
    useThemeStore.setState({ spotifyDockStyle: 'square' });
    render(<InterfaceSettingsSection />);

    const barOption = screen.getByText('Floating Dock Bar').closest('[role="button"]');
    expect(barOption).toBeInTheDocument();

    fireEvent.click(barOption!);
    expect(useThemeStore.getState().spotifyDockStyle).toBe('bar');
  });
});
