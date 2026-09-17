import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SelectThemeModal from '../SelectThemeModal';
import { chatApi } from '../../api/chatApi';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    setTheme: vi.fn(),
    uploadAttachment: vi.fn(),
  },
}));

vi.mock('../lib/reactionBurstEngine', () => ({
  triggerReactionBurst: vi.fn(),
  triggerFlyingReaction: vi.fn(),
}));

describe('SelectThemeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders theme customizer header and tabs correctly', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    expect(screen.getByText('Chat Theme Customizer')).toBeInTheDocument();
    expect(screen.getByText('Chat Background')).toBeInTheDocument();
    expect(screen.getByText('Message Bubbles')).toBeInTheDocument();
    expect(screen.getByText('Presets')).toBeInTheDocument();
    expect(screen.getByText('My Themes')).toBeInTheDocument();
  });

  it('supports selecting procedural WebGL shader wallpapers', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    // Switch to Shaders submode
    const shadersBtn = screen.getByRole('button', { name: /Shaders/i });
    fireEvent.click(shadersBtn);

    expect(screen.getByText('Liquid Neon Smoke')).toBeInTheDocument();
    expect(screen.getByText('Cosmic Aurora')).toBeInTheDocument();
    expect(screen.getByText('Retro Synthwave')).toBeInTheDocument();

    // Select Liquid Neon Smoke shader
    fireEvent.click(screen.getByText('Liquid Neon Smoke'));
  });

  it('supports toggling between draft, initial, and default theme preview modes', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const draftBtn = screen.getByText('New');
    const initialBtn = screen.getByText('Before changes');
    const defaultBtn = screen.getByText('Default');

    expect(draftBtn).toBeInTheDocument();
    expect(initialBtn).toBeInTheDocument();
    expect(defaultBtn).toBeInTheDocument();

    // Clicking "Before changes" switches to initial
    fireEvent.click(initialBtn);
    expect(initialBtn.closest('button')).toHaveClass('bg-purple-600');

    // Clicking "Default" switches to default dark theme
    fireEvent.click(defaultBtn);
    expect(defaultBtn.closest('button')).toHaveClass('bg-indigo-600');

    // Clicking "New" switches back to draft
    fireEvent.click(draftBtn);
    expect(draftBtn.closest('button')).toHaveClass('bg-purple-600');
  });

  it('selects preset theme and applies via API call', async () => {
    vi.mocked(chatApi.setTheme).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();

    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    // Switch to Presets tab
    fireEvent.click(screen.getByText('Presets'));
    expect(screen.getByText('Midnight Purple')).toBeInTheDocument();

    // Select Midnight Purple preset
    fireEvent.click(screen.getByText('Midnight Purple'));

    const applyBtn = screen.getByRole('button', { name: /Apply Theme/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(chatApi.setTheme).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows sending test messages in the interactive live preview', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const input = screen.getByPlaceholderText('Write a test message...');
    fireEvent.change(input, { target: { value: 'Test interactive message 🌟' } });

    const sendBtn = screen.getByTitle('Send test message to preview');
    fireEvent.click(sendBtn);

    expect(screen.getByText('Test interactive message 🌟')).toBeInTheDocument();
  });

  it('handles copying theme code to clipboard', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const shareBtn = screen.getByTitle(/Copy theme code/i);
    fireEvent.click(shareBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('ETERNAL-THEME:'),
    );
  });

  it('opens Import modal and validates theme code', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const importBtn = screen.getByTitle(/Import theme by code/i);
    fireEvent.click(importBtn);

    expect(screen.getByText('Import Theme by Code')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Paste theme code here...');
    fireEvent.change(textarea, { target: { value: 'invalid-malicious-code' } });

    const loadBtn = screen.getByRole('button', { name: /Load Theme/i });
    fireEvent.click(loadBtn);

    expect(screen.getByText('Invalid or unsafe theme code')).toBeInTheDocument();
  });

  it('handles "Reset Theme" button', async () => {
    vi.mocked(chatApi.setTheme).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();

    render(
      <SelectThemeModal conversationId="c1" currentTheme="midnight-purple" onClose={onClose} />,
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Theme/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(chatApi.setTheme).toHaveBeenCalledWith('c1', 'default', false);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not display redundant WCAG status pill in Message Bubbles tab', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    fireEvent.click(screen.getByText('Message Bubbles'));
    expect(screen.queryByText(/WCAG Smart Text Contrast/i)).not.toBeInTheDocument();
  });

  it('allows renaming a custom theme in My Themes tab', async () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    // Switch to My Themes tab
    fireEvent.click(screen.getByText('My Themes'));

    // Save current theme as a custom preset first
    const input = screen.getByPlaceholderText(/Theme name/i);
    fireEvent.change(input, { target: { value: 'Awesome Custom Theme' } });
    fireEvent.click(screen.getByText(/Save Current Theme/i));

    await waitFor(() => {
      expect(screen.getByText('Awesome Custom Theme')).toBeInTheDocument();
    });

    // Click edit (Pencil) button
    const editBtn = screen.getByTitle(/Edit theme name/i);
    fireEvent.click(editBtn);

    // Edit the input field
    const editInput = screen.getByDisplayValue('Awesome Custom Theme');
    fireEvent.change(editInput, { target: { value: 'Renamed Super Theme' } });

    // Save the new name
    const saveBtn = screen.getByTitle(/Save name/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Renamed Super Theme')).toBeInTheDocument();
      expect(screen.queryByText('Awesome Custom Theme')).not.toBeInTheDocument();
    });
  });

  it('displays bubble shapes presets and allows selecting Cyber Glass and Capybara', async () => {
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={vi.fn()} />);

    // Switch to Bubbles tab
    fireEvent.click(screen.getByText('Message Bubbles'));

    // Check that bubble shapes presets are rendered
    expect(screen.getByText(/Bubble Shapes & Borders/i)).toBeInTheDocument();
    expect(screen.getAllByText('Capybara').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cyber Glass')).toBeInTheDocument();
    expect(screen.getByText('Retro Pixel')).toBeInTheDocument();

    // Select Cyber Glass
    fireEvent.click(screen.getByText('Cyber Glass'));

    // Select Capybara
    fireEvent.click(screen.getAllByText('Capybara')[0]);
  });

  it('displays Text tab and allows selecting fonts, effects, colors, and toggling apply-to-all', async () => {
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={vi.fn()} />);

    // Switch to Text tab
    const textTabBtn = screen.getByText('Text');
    fireEvent.click(textTabBtn);

    // Verify all 3 customizer sections and the toggle exist
    expect(screen.getByText('Font Selection')).toBeInTheDocument();
    expect(screen.getByText('Effect Selection')).toBeInTheDocument();
    expect(screen.getByText('Color Selection')).toBeInTheDocument();
    expect(screen.getByText('Apply to All Messages')).toBeInTheDocument();

    // Verify effects options are displayed
    expect(screen.getByText('Gradient')).toBeInTheDocument();
    expect(screen.getByText('Neon')).toBeInTheDocument();
    expect(screen.getByText('Accent')).toBeInTheDocument();

    // Select an effect
    fireEvent.click(screen.getByText('Neon'));

    // Toggle "Apply to All Messages"
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});
