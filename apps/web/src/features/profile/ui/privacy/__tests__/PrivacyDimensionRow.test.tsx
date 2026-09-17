import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyDimensionRow from '../PrivacyDimensionRow';

describe('PrivacyDimensionRow', () => {
  it('renders dimension title and current setting label, and triggers onClick', () => {
    const onClick = vi.fn();
    const mockPrivacy = {
      lastSeen: 'CONTACTS' as const,
      avatar: 'EVERYBODY' as const,
      banner: 'EVERYBODY' as const,
      forwardLink: 'EVERYBODY' as const,
      calls: 'EVERYBODY' as const,
      voiceMessages: 'EVERYBODY' as const,
      messages: 'EVERYBODY' as const,
      birthday: 'EVERYBODY' as const,
      bio: 'EVERYBODY' as const,
      groupInvites: 'EVERYBODY' as const,
      themeProposals: 'EVERYBODY' as const,
      isPrivate: false,
      autoDeletePeriod: 'OFF' as const,
    };

    render(
      <PrivacyDimensionRow
        dimension="LAST_SEEN"
        title="Last Seen"
        privacy={mockPrivacy}
        onClick={onClick}
      />,
    );

    expect(screen.getByText('Last Seen')).toBeInTheDocument();
    expect(screen.getByText('Subscribers')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
