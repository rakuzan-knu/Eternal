import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ContributorBadge from '../ContributorBadge';

describe('ContributorBadge', () => {
  it('renders SVG element with proper attributes', () => {
    const { container } = render(<ContributorBadge className="w-8 h-8" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-8 h-8');
  });
});
