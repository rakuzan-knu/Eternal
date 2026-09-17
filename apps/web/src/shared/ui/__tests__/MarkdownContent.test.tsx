import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarkdownContent from '../MarkdownContent';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MarkdownContent', () => {
  it('returns null when content is empty', () => {
    const { container } = renderWithProviders(<MarkdownContent content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders standard typography elements (bold, italic, strikethrough, blockquote)', () => {
    const markdown = '**Bold text** and *italic text* and ~~strike text~~\n\n> This is a quote';
    renderWithProviders(<MarkdownContent content={markdown} />);

    expect(screen.getByText('Bold text')).toHaveClass('font-bold');
    expect(screen.getByText('italic text')).toHaveClass('italic');
    expect(screen.getByText('strike text')).toHaveClass('line-through');
    expect(screen.getByText('This is a quote')).toBeInTheDocument();
  });

  it('renders inline code with custom styling', () => {
    const markdown = 'Use `const variable = 42;` in your script';
    renderWithProviders(<MarkdownContent content={markdown} />);

    const inlineCode = screen.getByText('const variable = 42;');
    expect(inlineCode).toHaveClass('font-mono');
    expect(inlineCode).toHaveClass('text-purple-300');
  });

  it('renders code block with interactive CodeBlock component', () => {
    const markdown = '```tsx\nexport const App = () => <div>Hello</div>;\n```';
    renderWithProviders(<MarkdownContent content={markdown} />);

    expect(screen.getByText('TSX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('renders spoiler tags and reveals them on click', () => {
    const markdown = 'Here is a ||secret spoiler message|| for you.';
    renderWithProviders(<MarkdownContent content={markdown} />);

    const spoilerBtn = screen.getByTitle('Click to reveal spoiler');
    expect(spoilerBtn).toBeInTheDocument();

    fireEvent.click(spoilerBtn);
    expect(screen.getByText('secret spoiler message')).toBeInTheDocument();
  });

  it('renders mentions and hashtags', () => {
    const markdown = 'Hello @alexmercer and #nature vibes';
    renderWithProviders(<MarkdownContent content={markdown} />);

    const mentionLink = screen.getByText('@alexmercer');
    expect(mentionLink.closest('a')).toHaveAttribute('href', '/profile/alexmercer');

    const hashLink = screen.getByText('#nature');
    expect(hashLink.closest('a')).toHaveAttribute('href', '/search?q=%23nature');
  });

  it('sanitizes malicious script tags and inline XSS handlers', () => {
    const malicious =
      'Safe text <script>alert("hacked")</script> <img src="x" onerror="alert(1)" />';
    const { container } = renderWithProviders(<MarkdownContent content={malicious} />);

    expect(container.querySelector('script')).toBeNull();
    const img = container.querySelector('img');
    if (img) {
      expect(img.getAttribute('onerror')).toBeNull();
    }
  });

  it('renders Discord-style underline and compound formatting', () => {
    const markdown =
      '__underlined text__ and __*underline italic*__ and __**underline bold**__ and ***bold italics***';
    renderWithProviders(<MarkdownContent content={markdown} />);

    const underlineEl = screen.getByText('underlined text');
    expect(underlineEl).toHaveClass('underline');

    const underlineItalicEl = screen.getByText('underline italic');
    expect(underlineItalicEl).toHaveClass('underline');
    expect(underlineItalicEl.closest('em')).toBeInTheDocument();

    const underlineBoldEl = screen.getByText('underline bold');
    expect(underlineBoldEl).toHaveClass('underline');
    expect(underlineBoldEl.closest('strong')).toBeInTheDocument();

    const boldItalicEl = screen.getByText('bold italics');
    expect(boldItalicEl.closest('strong')).toBeInTheDocument();
    expect(boldItalicEl.closest('em')).toBeInTheDocument();
  });

  it('renders Discord subtext starting with -#', () => {
    const markdown = '-# This is a small muted subtext message';
    renderWithProviders(<MarkdownContent content={markdown} />);

    const subtextEl = screen.getByText('This is a small muted subtext message');
    expect(subtextEl).toHaveClass('text-xs');
    expect(subtextEl).toHaveClass('text-white/50');
  });

  it('renders headers (#, ##, ###) and masked links [title](url)', () => {
    const markdown =
      '# Big Header\n## Smaller Header\n### Even Smaller Header\n\n[Google](https://google.com)';
    renderWithProviders(<MarkdownContent content={markdown} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Big Header');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Smaller Header');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Even Smaller Header');

    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toHaveAttribute('href', 'https://google.com');
  });

  it('renders lists, tables, and horizontal rules', () => {
    const markdown = `
- Bullet item 1
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |

---
`;
    const { container } = renderWithProviders(<MarkdownContent content={markdown} />);

    expect(screen.getByText('Bullet item 1')).toBeInTheDocument();
    expect(screen.getByText('Numbered item 1')).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('handles trailing punctuation and disabled mentions/hashtags props', () => {
    const textWithPunct = 'Contact @sam! or visit #travel.';
    renderWithProviders(<MarkdownContent content={textWithPunct} />);

    expect(screen.getByText('@sam')).toBeInTheDocument();
    expect(screen.getByText('#travel')).toBeInTheDocument();

    const disabledProps = 'Plain @alex and #tag without links';
    const { container } = renderWithProviders(
      <MarkdownContent content={disabledProps} enableMentions={false} enableHashtags={false} />,
    );
    expect(container.querySelector('a')).toBeNull();
  });
});
