import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerifiedCheckmark } from '../VerifiedCheckmark';

describe('VerifiedCheckmark', () => {
  it('renders verified svg badge with proper title', () => {
    const { container } = render(<VerifiedCheckmark size="md" />);
    const badge = screen.getByTitle('Verified Profile');
    expect(badge).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
