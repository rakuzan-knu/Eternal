import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('renders the default SVG placeholder when no src is provided', () => {
    const { container } = render(<Avatar />);

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders an image and hides the placeholder when src is provided', () => {
    const { container } = render(<Avatar src="https://example.com/avatar.png" />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('uses the default "User avatar" alt text when none is given', () => {
    render(<Avatar src="https://example.com/avatar.png" />);

    expect(screen.getByAltText('User avatar')).toBeInTheDocument();
  });

  it('uses a custom alt when one is provided', () => {
    render(<Avatar src="https://example.com/avatar.png" alt="Ayate's profile picture" />);

    expect(screen.getByAltText("Ayate's profile picture")).toBeInTheDocument();
  });

  it('falls back to the SVG placeholder when src is explicitly null', () => {
    const { container } = render(<Avatar src={null} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)('applies the %s size classes', (size) => {
    const { container } = render(<Avatar size={size} />);

    const sizeClassMap: Record<typeof size, string> = {
      xs: 'w-6',
      sm: 'w-8',
      md: 'w-10',
      lg: 'w-16',
      xl: 'w-28',
    };
    expect(container.firstChild).toHaveClass(sizeClassMap[size]);
  });
});
