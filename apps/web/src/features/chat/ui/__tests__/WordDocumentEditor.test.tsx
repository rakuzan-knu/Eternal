import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WordDocumentEditor from '../documentEditors/WordDocumentEditor';

describe('WordDocumentEditor', () => {
  it('renders sheets with fixed dimensions and margins configured from document settings', () => {
    const { container } = render(
      <WordDocumentEditor
        initialPages={['<p>First page content</p>']}
        fileName="report.docx"
        pageSettings={{
          width: 800,
          height: 1100,
          marginTop: 60,
          marginBottom: 60,
          marginLeft: 70,
          marginRight: 70,
          orientation: 'portrait',
        }}
      />,
    );

    const sheet = container.querySelector('[data-page-index="0"]') as HTMLElement;
    expect(sheet).toBeInTheDocument();
    expect(sheet.style.width).toBe('800px');
    expect(sheet.style.height).toBe('1100px');
    expect(sheet.style.maxHeight).toBe('1100px');
    expect(sheet.style.paddingTop).toBe('60px');
    expect(sheet.style.paddingBottom).toBe('60px');
    expect(sheet.style.paddingLeft).toBe('70px');
    expect(sheet.style.paddingRight).toBe('70px');
  });

  it('does NOT render the blue "+ Нова сторінка" button in the ribbon toolbar', () => {
    render(<WordDocumentEditor initialPages={['<p>Testing toolbar</p>']} fileName="test.docx" />);

    // The button was removed as requested
    expect(screen.queryByText('Нова сторінка')).not.toBeInTheDocument();
  });

  it('renders footer page number and header indicator', () => {
    render(
      <WordDocumentEditor initialPages={['<p>Page 1</p>', '<p>Page 2</p>']} fileName="test.docx" />,
    );

    expect(screen.getByText('Сторінка 1 з 2')).toBeInTheDocument();
    expect(screen.getByText('Сторінка 2 з 2')).toBeInTheDocument();
    expect(screen.getByText('- 1 -')).toBeInTheDocument();
    expect(screen.getByText('- 2 -')).toBeInTheDocument();
  });
});
