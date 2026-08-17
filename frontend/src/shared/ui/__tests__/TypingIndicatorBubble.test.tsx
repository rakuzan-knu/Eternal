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

  it('renders typing indicator for group chat', () => {
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
});
