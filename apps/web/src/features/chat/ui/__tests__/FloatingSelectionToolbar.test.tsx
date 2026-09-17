import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FloatingSelectionToolbar from '../FloatingSelectionToolbar';

describe('FloatingSelectionToolbar', () => {
  const position = { top: 100, left: 200 };

  it('renders formatting buttons for bold, italic, underline, strikethrough, spoiler, quote, inline code, and link', () => {
    render(<FloatingSelectionToolbar position={position} onFormat={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTitle(/Bold/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Italic/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Underline/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Strikethrough/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Spoiler/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Quote/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Inline code/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Insert Link/i)).toBeInTheDocument();
  });

  it('triggers onFormat with bold when bold button is clicked', () => {
    const handleFormat = vi.fn();
    render(
      <FloatingSelectionToolbar position={position} onFormat={handleFormat} onClose={vi.fn()} />,
    );

    const boldBtn = screen.getByTitle(/Bold/i);
    fireEvent.click(boldBtn);
    expect(handleFormat).toHaveBeenCalledWith('bold');
  });

  it('triggers onFormat with underline when underline button is clicked', () => {
    const handleFormat = vi.fn();
    render(
      <FloatingSelectionToolbar position={position} onFormat={handleFormat} onClose={vi.fn()} />,
    );

    const underlineBtn = screen.getByTitle(/Underline/i);
    fireEvent.click(underlineBtn);
    expect(handleFormat).toHaveBeenCalledWith('underline');
  });

  it('triggers onFormat with quote when quote button is clicked', () => {
    const handleFormat = vi.fn();
    render(
      <FloatingSelectionToolbar position={position} onFormat={handleFormat} onClose={vi.fn()} />,
    );

    const quoteBtn = screen.getByTitle(/Quote/i);
    fireEvent.click(quoteBtn);
    expect(handleFormat).toHaveBeenCalledWith('quote');
  });

  it('triggers onFormat with spoiler when spoiler button is clicked', () => {
    const handleFormat = vi.fn();
    render(
      <FloatingSelectionToolbar position={position} onFormat={handleFormat} onClose={vi.fn()} />,
    );

    const spoilerBtn = screen.getByTitle(/Spoiler/i);
    fireEvent.click(spoilerBtn);
    expect(handleFormat).toHaveBeenCalledWith('spoiler');
  });

  it('opens link input and applies link url on submit', () => {
    const handleFormat = vi.fn();
    render(
      <FloatingSelectionToolbar position={position} onFormat={handleFormat} onClose={vi.fn()} />,
    );

    const linkBtn = screen.getByTitle(/Insert Link/i);
    fireEvent.click(linkBtn);

    const input = screen.getByPlaceholderText('https://example.com');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'https://github.com' } });
    const applyBtn = screen.getByTitle('Apply link');
    fireEvent.click(applyBtn);

    expect(handleFormat).toHaveBeenCalledWith('link', 'https://github.com');
  });

  it('handles link cancellation, remaining format buttons and preventDefault on mousedown', () => {
    const handleFormat = vi.fn();
    const { container } = render(
      <FloatingSelectionToolbar position={position} onFormat={handleFormat} onClose={vi.fn()} />,
    );

    // Italic, strike, code
    fireEvent.click(screen.getByTitle(/Italic/i));
    expect(handleFormat).toHaveBeenCalledWith('italic');

    fireEvent.click(screen.getByTitle(/Strikethrough/i));
    expect(handleFormat).toHaveBeenCalledWith('strike');

    fireEvent.click(screen.getByTitle(/Inline code/i));
    expect(handleFormat).toHaveBeenCalledWith('code');

    // Link cancel
    fireEvent.click(screen.getByTitle(/Insert Link/i));
    expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Cancel'));
    expect(screen.queryByTitle('Cancel')).not.toBeInTheDocument();

    // Toolbar mousedown
    fireEvent.mouseDown(container.firstChild as HTMLElement);
  });
});
