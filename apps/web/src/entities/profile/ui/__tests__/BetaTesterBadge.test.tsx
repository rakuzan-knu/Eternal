import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BetaTesterBadge from '../BetaTesterBadge';

describe('BetaTesterBadge', () => {
  it('renders SVG element with custom size and className', () => {
    const { container } = render(<BetaTesterBadge size={24} className="test-badge" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveClass('test-badge');
  });
});
