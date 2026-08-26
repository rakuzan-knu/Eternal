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

  it('supports Hold-to-Compare (До / После) interaction', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const compareBtn = screen.getByTitle(/Зажмите и удерживайте/i);
    expect(compareBtn).toBeInTheDocument();

    // Mouse down starts compare mode
    fireEvent.mouseDown(compareBtn);
    expect(screen.getByText(/Оригинальный вид \(удерживайте\)/i)).toBeInTheDocument();

    // Mouse up ends compare mode
    fireEvent.mouseUp(compareBtn);
    expect(screen.queryByText(/Оригинальный вид \(удерживайте\)/i)).not.toBeInTheDocument();
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

    const input = screen.getByPlaceholderText('Напишите тестовое сообщение...');
    fireEvent.change(input, { target: { value: 'Тестовое интерактивное сообщение 🌟' } });

    const sendBtn = screen.getByTitle('Send test message to preview');
    fireEvent.click(sendBtn);

    expect(screen.getByText('Тестовое интерактивное сообщение 🌟')).toBeInTheDocument();
  });

  it('handles copying theme code to clipboard', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const shareBtn = screen.getByTitle(/Скопировать код темы/i);
    fireEvent.click(shareBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('ETERNAL-THEME:'),
    );
  });

  it('opens Import modal and validates theme code', () => {
    const onClose = vi.fn();
    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    const importBtn = screen.getByTitle(/Импортировать тему по коду/i);
    fireEvent.click(importBtn);

    expect(screen.getByText('Import Theme by Code')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Paste theme code here...');
    fireEvent.change(textarea, { target: { value: 'invalid-malicious-code' } });

    const loadBtn = screen.getByRole('button', { name: /Load Theme/i });
    fireEvent.click(loadBtn);

    expect(screen.getByText('Неверный или небезопасный код темы')).toBeInTheDocument();
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
});
