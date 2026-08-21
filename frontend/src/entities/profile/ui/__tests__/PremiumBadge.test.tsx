import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PremiumBadge from '../PremiumBadge';

describe('PremiumBadge', () => {
  it('renders SVG premium badge correctly', () => {
    const { container } = render(<PremiumBadge className="prem-badge" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('prem-badge');
  });
});
