import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TypingIndicatorBubble from '../TypingIndicatorBubble';

describe('TypingIndicatorBubble', () => {
  it('renders null when typists list is empty', () => {
    const { container } = render(<TypingIndicatorBubble typists={[]} isGroup={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders typing indicator for direct chat', () => {
    render(
      <TypingIndicatorBubble
        typists={[{ id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null }]}
        isGroup={false}
      />,
    );

    expect(screen.getByText('Alice is typing…')).toBeInTheDocument();
  });

  it('renders typing indicator for 2 group chat members', () => {
    render(
      <TypingIndicatorBubble
        typists={[
          { id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null },
          { id: 'usr-2', username: 'bob', displayName: 'Bob', avatar: null },
        ]}
        isGroup={true}
      />,
    );

    expect(screen.getByText('Alice and Bob are typing…')).toBeInTheDocument();
  });

  it('renders typing indicator for 3+ group chat members', () => {
    render(
      <TypingIndicatorBubble
        typists={[
          { id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null },
          { id: 'usr-2', username: 'bob', displayName: 'Bob', avatar: null },
          { id: 'usr-3', username: 'charlie', displayName: 'Charlie', avatar: null },
          { id: 'usr-4', username: 'david', displayName: 'David', avatar: null },
        ]}
        isGroup={true}
      />,
    );

    expect(screen.getByText('4 people are typing…')).toBeInTheDocument();
  });

  it('falls back to username when displayName is null and handles missing id', () => {
    const { rerender } = render(
      <TypingIndicatorBubble
        typists={[{ id: '', username: 'alex', displayName: null as any, avatar: null }]}
        isGroup={false}
      />,
    );
    expect(screen.getByText('alex is typing…')).toBeInTheDocument();

    rerender(
      <TypingIndicatorBubble
        typists={[
          { id: '', username: 'alex', displayName: null as any, avatar: null },
          { id: '', username: 'bob', displayName: null as any, avatar: null },
        ]}
        isGroup={true}
      />,
    );
    expect(screen.getByText('alex and bob are typing…')).toBeInTheDocument();
  });
});
