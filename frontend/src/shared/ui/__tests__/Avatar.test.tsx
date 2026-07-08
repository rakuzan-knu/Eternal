import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('renders the default emoji when no props are provided', () => {
    render(<Avatar />);

    expect(screen.getByText('💀')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a custom emoji when src is not provided', () => {
    render(<Avatar emoji="🔥" />);

    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('renders an image and hides the emoji when src is provided', () => {
    render(<Avatar emoji="🔥" src="https://example.com/avatar.png" />);

    const img = screen.getByRole('img', { name: 'Avatar' });
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(screen.queryByText('🔥')).not.toBeInTheDocument();
  });

  it('falls back to the emoji when src is explicitly null', () => {
    render(<Avatar emoji="🌙" src={null} />);

    expect(screen.getByText('🌙')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg', 'xl'] as const)('applies the %s size classes', (size) => {
    const { container } = render(<Avatar size={size} />);

    const sizeClassMap: Record<typeof size, string> = {
      sm: 'w-8',
      md: 'w-10',
      lg: 'w-16',
      xl: 'w-28',
    };
    expect(container.firstChild).toHaveClass(sizeClassMap[size]);
  });
});
