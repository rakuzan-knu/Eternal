import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerifiedCheckmark } from '../VerifiedCheckmark';

describe('VerifiedCheckmark', () => {
  it('renders verified svg badge with proper title when isVerified is true', () => {
    const { container } = render(<VerifiedCheckmark isVerified size="md" />);
    const badge = screen.getByTitle('Verified Profile');
    expect(badge).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders null when isVerified is false and no primaryBadge', () => {
    const { container } = render(<VerifiedCheckmark isVerified={false} size="md" />);
    expect(container.firstChild).toBeNull();
  });
});
