import { render, screen } from '@testing-library/react';
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

describe('CommentItem', () => {
  it('renders author, handle, time and text', () => {
    render(<CommentItem comment={baseComment} />);

    expect(screen.getByText('Ayate')).toBeInTheDocument();
    expect(screen.getByText('@ayate • 2h')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders the custom avatar emoji when provided', () => {
    const comment: CommentType = { ...baseComment, avatar: '🐱' };

    render(<CommentItem comment={comment} />);

    expect(screen.getByText('🐱')).toBeInTheDocument();
  });

  it('falls back to the default 💬 avatar when none is provided', () => {
    render(<CommentItem comment={baseComment} />);

    expect(screen.getByText('💬')).toBeInTheDocument();
  });

  it('renders an empty comment text without crashing', () => {
    const comment: CommentType = { ...baseComment, text: '' };

    render(<CommentItem comment={comment} />);

    expect(screen.getByText('Ayate')).toBeInTheDocument();
  });
});
