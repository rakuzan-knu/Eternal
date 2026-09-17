import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatDatePicker from '../ChatDatePicker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../model/useChatActivityMap', () => ({
  useChatActivityMap: vi.fn(() => ({
    activityMap: {
      '2026-08-15': {
        messageCount: 3,
        firstMessageSnippet: 'Test message',
      },
      '2026-08-20': {
        messageCount: 8,
        previewMediaUrl: 'https://cdn.example.com/photo.jpg',
        firstMessageSnippet: 'Photo attached',
        mediaCount: 2,
      },
    },
    isLoading: false,
  })),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('ChatDatePicker', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectDate = vi.fn();
  const testDate = new Date(2026, 7, 21); // August 21, 2026

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Jump to Today')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders media preview thumbnail for days with images', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    const img = document.querySelector('img[src="https://cdn.example.com/photo.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('navigates to next and previous month', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    const nextBtn = screen.getByTitle('Next month');
    fireEvent.click(nextBtn);
    expect(screen.getByText(/September 2026/i)).toBeInTheDocument();

    const prevBtn = screen.getByTitle('Previous month');
    fireEvent.click(prevBtn);
    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
  });

  it('switches to month and year roller view and back to calendar', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    const monthHeader = screen.getByTitle('Click to select month and year');
    fireEvent.click(monthHeader);

    expect(screen.getByText('Select Month & Year')).toBeInTheDocument();
    expect(screen.getByText('Show')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show'));
    expect(screen.queryByText('Select Month & Year')).not.toBeInTheDocument();
  });

  it('selects date and closes on clicking a day', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    const day15 = screen.getByText('15');
    fireEvent.click(day15);

    expect(mockOnSelectDate).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles Jump to Today button', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByText('Jump to Today'));
    expect(mockOnSelectDate).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles Escape key to close', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    const container = document.querySelector('.animate-modalPop');
    if (container) {
      fireEvent.keyDown(container, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('handles arrow keys, Enter key, hover preview tooltip, roller Cancel, and outside click', () => {
    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    const container = document.querySelector('.animate-modalPop')!;

    // Arrow keys
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(mockOnSelectDate).toHaveBeenCalled();

    // Hover tooltip for text activity
    const day15 = screen.getByText('15');
    fireEvent.mouseEnter(day15);
    expect(screen.getByText(/Test message/i)).toBeInTheDocument();
    fireEvent.mouseLeave(day15);

    // Hover tooltip for media activity (covers lines 454-461, 463-464)
    const day20 = screen.getByText('20');
    fireEvent.mouseEnter(day20);
    expect(screen.getByText(/Photo attached/i)).toBeInTheDocument();
    fireEvent.mouseLeave(day20);

    // Roller view Cancel
    const monthHeader = screen.getByTitle('Click to select month and year');
    fireEvent.click(monthHeader);
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Select Month & Year')).not.toBeInTheDocument();

    // Outside click
    fireEvent.mouseDown(document.body);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders mobile layout when innerWidth is small', () => {
    const origInnerWidth = window.innerWidth;
    window.innerWidth = 400;

    render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={true}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
        initialDate={testDate}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
    window.innerWidth = origInnerWidth;
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <ChatDatePicker
        conversationId="conv-1"
        isOpen={false}
        onClose={mockOnClose}
        onSelectDate={mockOnSelectDate}
      />,
      { wrapper: createWrapper() },
    );
    expect(container.firstChild).toBeNull();
  });
});
