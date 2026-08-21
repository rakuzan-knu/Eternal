import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpandableText } from '../ExpandableText';

describe('ExpandableText', () => {
  it('returns null if text is empty', () => {
    const { container } = render(<ExpandableText text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders short text completely without More button', () => {
    render(<ExpandableText text="Short post text" />);
    expect(screen.getByText('Short post text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
  });

  it('truncates long text and toggles expand/collapse', () => {
    const longText = 'A'.repeat(300);
    render(<ExpandableText text={longText} />);

    // Should show More button
    const moreBtn = screen.getByRole('button', { name: /more/i });
    expect(moreBtn).toBeInTheDocument();

    // Click More
    fireEvent.click(moreBtn);
    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument();

    // Click Hide
    fireEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
  });
});
