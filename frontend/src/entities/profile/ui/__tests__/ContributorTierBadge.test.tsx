import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContributorTierBadge } from '../ContributorTierBadge';

describe('ContributorTierBadge', () => {
  it('renders all contributor tier levels 1 through 6', () => {
    for (let level = 1; level <= 6; level++) {
      const { container } = render(<ContributorTierBadge level={level} size={40} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '40');
      expect(svg).toHaveAttribute('height', '40');
    }
  });

  it('renders default level 1 when level is omitted', () => {
    const { container } = render(<ContributorTierBadge />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
