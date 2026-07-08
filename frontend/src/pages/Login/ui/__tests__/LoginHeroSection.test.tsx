import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroSection } from '../LoginHeroSection';

describe('HeroSection', () => {
  it('renders the headline and supporting copy', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading')).toHaveTextContent('Connect with people who matter.');
    expect(screen.getByText('people')).toBeInTheDocument();
    expect(
      screen.getByText('The place where ideas live and communities thrive.'),
    ).toBeInTheDocument();
  });
});
