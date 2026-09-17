import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DeveloperBadge from '../DeveloperBadge';

describe('DeveloperBadge', () => {
  it('renders SVG with default and custom size', () => {
    const { container, rerender } = render(<DeveloperBadge />);
    let svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '20');

    rerender(<DeveloperBadge size={32} />);
    svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
  });
});
