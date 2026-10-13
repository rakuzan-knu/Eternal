import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Banner from '../Banner';

describe('Banner', () => {
  it('renders image when src is provided', () => {
    const { container } = render(<Banner src="https://example.com/banner.jpg" positionY={30} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/banner.jpg');
    expect(img).toHaveStyle({ objectPosition: '50% 30%' });
  });

  it('shows a fallback after an image error and accepts a new source', () => {
    const { container, rerender } = render(<Banner src="https://example.com/broken.jpg" />);
    const img = container.querySelector('img')!;
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
    rerender(<Banner src="https://example.com/valid.jpg" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/valid.jpg');
  });

  it('renders fallback gradient when src is null or undefined', () => {
    const { container } = render(<Banner src={null} />);
    const img = container.querySelector('img');
    expect(img).not.toBeInTheDocument();
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });
});
