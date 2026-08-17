import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PremiumTierBadge } from '../PremiumTierBadge';

describe('PremiumTierBadge', () => {
  it('renders all premium tier levels 1 through 6', () => {
    for (let level = 1; level <= 6; level++) {
      const { container } = render(<PremiumTierBadge level={level} size={48} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
    }
  });

  it('renders default level 1 when level is omitted', () => {
    const { container } = render(<PremiumTierBadge />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
