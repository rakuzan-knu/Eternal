import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Banner from '../Banner';

describe('Banner', () => {
  it('renders image when src is provided', () => {
    const { container } = render(<Banner src="https://example.com/banner.jpg" positionY={30} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/banner.jpg');
    expect(img).toHaveStyle({ objectPosition: '50% 30%' });
  });

  it('renders fallback gradient when src is null or undefined', () => {
    const { container } = render(<Banner src={null} />);
    const img = container.querySelector('img');
    expect(img).not.toBeInTheDocument();
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });
});
