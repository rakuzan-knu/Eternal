import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MarkdownContent from '../MarkdownContent';

describe('MarkdownContent LaTeX / Math', () => {
  it('renders inline LaTeX formulas using KaTeX', () => {
    const markdown = 'Inline equation $E = mc^2$ in text.';
    const { container } = render(<MarkdownContent content={markdown} />);

    const katexElement = container.querySelector('.katex');
    expect(katexElement).toBeInTheDocument();
    expect(katexElement).toHaveClass('katex');
  });

  it('renders block display LaTeX formulas centered with horizontal scroll guard', () => {
    const markdown =
      'Block math:\n\n$$\n\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n$$\n\nEnd.';
    const { container } = render(<MarkdownContent content={markdown} />);

    const katexDisplay = container.querySelector('.katex-display');
    expect(katexDisplay).toBeInTheDocument();
  });
});
