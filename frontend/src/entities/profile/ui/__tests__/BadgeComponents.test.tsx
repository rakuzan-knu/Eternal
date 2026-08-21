import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PremiumBadge from '../PremiumBadge';
import PartnerBadge from '../PartnerBadge';
import ModeratorBadge from '../ModeratorBadge';
import DeveloperBadge from '../DeveloperBadge';
import EarlySupporterBadge from '../EarlySupporterBadge';
import BetaTesterBadge from '../BetaTesterBadge';
import ContributorBadge from '../ContributorBadge';

describe('Badge SVG Components', () => {
  it('renders all badge SVG icons properly', () => {
    const { container: c1 } = render(<PremiumBadge />);
    expect(c1.querySelector('svg')).toBeInTheDocument();

    const { container: c2 } = render(<PartnerBadge />);
    expect(c2.querySelector('svg')).toBeInTheDocument();

    const { container: c3 } = render(<ModeratorBadge />);
    expect(c3.querySelector('svg')).toBeInTheDocument();

    const { container: c4 } = render(<DeveloperBadge />);
    expect(c4.querySelector('svg')).toBeInTheDocument();

    const { container: c5 } = render(<EarlySupporterBadge />);
    expect(c5.querySelector('svg')).toBeInTheDocument();

    const { container: c6 } = render(<BetaTesterBadge />);
    expect(c6.querySelector('svg')).toBeInTheDocument();

    const { container: c7 } = render(<ContributorBadge />);
    expect(c7.querySelector('svg')).toBeInTheDocument();
  });
});
