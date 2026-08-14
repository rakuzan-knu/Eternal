import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { CommentItem } from '../CommentItem';
import { CommentType } from '../../../../shared/model/useUIStore';

const baseComment: CommentType = {
  id: 1,
  author: 'Ayate',
  handle: 'ayate',
  text: 'Hello world',
  time: '2h',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CommentItem', () => {
  it('renders author, handle, time and text', () => {
    renderWithClient(<CommentItem comment={baseComment} />);

    expect(screen.getByText('Ayate')).toBeInTheDocument();
    expect(screen.getByText('@ayate • 2h')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders custom avatar image when src is provided', () => {
    const comment: CommentType = { ...baseComment, avatar: 'https://example.com/avatar.png' };

    renderWithClient(<CommentItem comment={comment} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('falls back to default svg placeholder avatar when none is provided', () => {
    const { container } = renderWithClient(<CommentItem comment={baseComment} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders an empty comment text without crashing', () => {
    const comment: CommentType = { ...baseComment, text: '' };

    renderWithClient(<CommentItem comment={comment} />);

    expect(screen.getByText('Ayate')).toBeInTheDocument();
  });
});
