import { render, screen, fireEvent } from '@testing-library/react';
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

  it('handles image load error and hides image', () => {
    render(<Avatar src="https://example.com/broken.png" name="User" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
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

  it.each(['2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const)('applies the %s size classes', (size) => {
    const { container } = render(<Avatar size={size} />);

    const sizeClassMap: Record<typeof size, string> = {
      '2xs': 'w-3.5',
      xs: 'w-6',
      sm: 'w-8',
      md: 'w-10',
      lg: 'w-16',
      xl: 'w-28',
    };
    expect(container.firstChild).toHaveClass(sizeClassMap[size]);
  });

  it('falls back to default size class for unknown size value', () => {
    const { container } = render(<Avatar size={'unknown' as any} />);
    expect(container.firstChild).toHaveClass('w-10', 'h-10');
  });
});
