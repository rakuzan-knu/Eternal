import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SmartCodePasteBanner from '../SmartCodePasteBanner';
import { DetectedCodeSnippet } from '../../lib/smartCodeDetection';

describe('SmartCodePasteBanner', () => {
  const sampleSnippet: DetectedCodeSnippet = {
    isCode: true,
    language: 'cpp',
    extension: 'cpp',
    lineCount: 24,
    rawCode: '#include <iostream>\nint main() { return 0; }',
  };

  it('renders snippet language and lines count', () => {
    render(
      <SmartCodePasteBanner
        snippet={sampleSnippet}
        onFormatMarkdown={vi.fn()}
        onAttachAsFile={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText('Code snippet detected')).toBeInTheDocument();
    expect(screen.getByText('CPP')).toBeInTheDocument();
    expect(screen.getByText(/24 lines/)).toBeInTheDocument();
  });

  it('handles Format click', () => {
    const handleFormat = vi.fn();
    render(
      <SmartCodePasteBanner
        snippet={sampleSnippet}
        onFormatMarkdown={handleFormat}
        onAttachAsFile={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    const formatBtn = screen.getByRole('button', { name: /format/i });
    fireEvent.click(formatBtn);
    expect(handleFormat).toHaveBeenCalledTimes(1);
  });

  it('handles As file click', () => {
    const handleAsFile = vi.fn();
    render(
      <SmartCodePasteBanner
        snippet={sampleSnippet}
        onFormatMarkdown={vi.fn()}
        onAttachAsFile={handleAsFile}
        onDismiss={vi.fn()}
      />,
    );

    const fileBtn = screen.getByRole('button', { name: /as file/i });
    fireEvent.click(fileBtn);
    expect(handleAsFile).toHaveBeenCalledTimes(1);
  });

  it('handles Dismiss click', () => {
    const handleDismiss = vi.fn();
    render(
      <SmartCodePasteBanner
        snippet={sampleSnippet}
        onFormatMarkdown={vi.fn()}
        onAttachAsFile={vi.fn()}
        onDismiss={handleDismiss}
      />,
    );

    const dismissBtn = screen.getByTitle('Dismiss');
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
