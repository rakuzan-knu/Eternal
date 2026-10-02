import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import FileIconBadge from '../FileIconBadge';

describe('FileIconBadge', () => {
  it('renders PDF badge with uppercase extension label and description', () => {
    render(<FileIconBadge fileName="report.pdf" mimeType="application/pdf" size="md" />);

    expect(screen.getByTitle(/PDF Document/i)).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders DOCX badge for Word documents', () => {
    render(
      <FileIconBadge
        fileName="notes.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        size="sm"
      />,
    );

    expect(screen.getByTitle(/Word Document/i)).toBeInTheDocument();
    expect(screen.getByText('DOCX')).toBeInTheDocument();
  });

  it('renders XLSX badge for Excel spreadsheets', () => {
    render(<FileIconBadge fileName="budget.xlsx" size="lg" />);

    expect(screen.getByTitle(/Spreadsheet/i)).toBeInTheDocument();
    expect(screen.getByText('XLSX')).toBeInTheDocument();
  });

  it('renders PPTX badge for presentations', () => {
    render(<FileIconBadge fileName="pitch.pptx" />);

    expect(screen.getByTitle(/Presentation/i)).toBeInTheDocument();
    expect(screen.getByText('PPTX')).toBeInTheDocument();
  });

  it('renders TXT badge for text files', () => {
    render(<FileIconBadge fileName="readme.txt" />);

    expect(screen.getByTitle(/Text Document/i)).toBeInTheDocument();
    expect(screen.getByText('TXT')).toBeInTheDocument();
  });

  it('handles click event', () => {
    const handleClick = vi.fn();
    render(<FileIconBadge fileName="report.pdf" onClick={handleClick} />);

    fireEvent.click(screen.getByTitle(/PDF Document/i));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
