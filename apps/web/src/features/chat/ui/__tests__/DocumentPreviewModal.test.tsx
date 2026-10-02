import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DocumentPreviewModal from '../DocumentPreviewModal';

describe('DocumentPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders modal header with filename, actions, and PDF iframe for PDF files', async () => {
    const onClose = vi.fn();
    const pdfFile = new File(['%PDF-1.4 mock content'], 'report.pdf', {
      type: 'application/pdf',
    });

    render(<DocumentPreviewModal fileOrUrl={pdfFile} onClose={onClose} />);

    expect(screen.getByRole('heading', { level: 1, name: 'report.pdf' })).toBeInTheDocument();
    expect(screen.getByTitle(/Close \(Esc\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Print document/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Download file/i)).toBeInTheDocument();

    await waitFor(() => {
      const obj = document.querySelector('object');
      const iframe = document.querySelector('iframe');
      expect(obj || iframe).toBeInTheDocument();
    });
  });

  it('renders bottom floating pill with page counter and zoom controls', async () => {
    const onClose = vi.fn();
    const pdfFile = new File(['mock content'], 'document.pdf', {
      type: 'application/pdf',
    });

    render(<DocumentPreviewModal fileOrUrl={pdfFile} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText(/Сторінок|Сторінка/i)).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByTitle(/Zoom in \(\+\)/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Zoom out \(−\)/i)).toBeInTheDocument();
    });

    const zoomInBtn = screen.getByTitle(/Zoom in \(\+\)/i);
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('115%')).toBeInTheDocument();

    const zoomResetBtn = screen.getByTitle(/Reset zoom/i);
    fireEvent.click(zoomResetBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('closes on Escape key press with capture phase isolation', async () => {
    const onClose = vi.fn();
    const txtFile = new File(['Hello world\nSecond line'], 'readme.txt', {
      type: 'text/plain',
    });

    render(<DocumentPreviewModal fileOrUrl={txtFile} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders text file content and line numbers', async () => {
    const onClose = vi.fn();
    const txtFile = new File(['First line\nSecond line\nThird line'], 'notes.txt', {
      type: 'text/plain',
    });

    render(<DocumentPreviewModal fileOrUrl={txtFile} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('3 lines')).toBeInTheDocument();
      expect(screen.getByText(/First line/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const pdfFile = new File(['mock'], 'sample.pdf', { type: 'application/pdf' });

    render(<DocumentPreviewModal fileOrUrl={pdfFile} onClose={onClose} />);

    const closeBtn = screen.getByTitle(/Close \(Esc\)/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays accurate total pages for multi-page PDF and allows page navigation', async () => {
    const onClose = vi.fn();
    const pdfContent = '%PDF-1.4\n<< /Type /Pages /Count 13 >>\n%%EOF';
    const pdfFile = new File([pdfContent], 'report_13pages.pdf', { type: 'application/pdf' });

    render(<DocumentPreviewModal fileOrUrl={pdfFile} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Поточна сторінка/i })).toHaveValue('1');
    });

    // Next page button
    const nextBtn = screen.getByTitle(/Наступна сторінка/i);
    fireEvent.click(nextBtn);
    expect(screen.getByRole('textbox', { name: /Поточна сторінка/i })).toHaveValue('2');

    // Prev page button
    const prevBtn = screen.getByTitle(/Попередня сторінка/i);
    fireEvent.click(prevBtn);
    expect(screen.getByRole('textbox', { name: /Поточна сторінка/i })).toHaveValue('1');

    // Direct input jump
    const input = screen.getByRole('textbox', { name: /Поточна сторінка/i });
    fireEvent.change(input, { target: { value: '6' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('textbox', { name: /Поточна сторінка/i })).toHaveValue('6');
  });
});
