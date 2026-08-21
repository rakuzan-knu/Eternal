import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PartnerBadge from '../PartnerBadge';

describe('PartnerBadge', () => {
  it('renders SVG partner badge correctly', () => {
    const { container } = render(<PartnerBadge className="partner-badge" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('partner-badge');
  });
});
