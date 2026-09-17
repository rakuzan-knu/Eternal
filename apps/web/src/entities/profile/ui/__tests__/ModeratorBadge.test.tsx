import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ModeratorBadge from '../ModeratorBadge';

describe('ModeratorBadge', () => {
  it('renders SVG moderator badge correctly', () => {
    const { container } = render(<ModeratorBadge size={22} className="mod-badge" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '22');
    expect(svg).toHaveClass('mod-badge');
  });
});
