import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import EarlySupporterBadge from '../EarlySupporterBadge';

describe('EarlySupporterBadge', () => {
  it('renders SVG early supporter badge correctly', () => {
    const { container } = render(<EarlySupporterBadge size={28} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '28');
  });
});
