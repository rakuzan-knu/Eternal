import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileFieldPreview from '../ProfileFieldPreview';

describe('ProfileFieldPreview', () => {
  it('renders profile field preview for banner, avatar, and bio', () => {
    const mockUser = {
      displayName: 'Alice',
      username: 'alice',
      avatar: 'https://example.com/avatar.png',
      banner: 'https://example.com/banner.png',
      bio: 'Software engineer',
    };

    const { rerender } = render(
      <ProfileFieldPreview
        dimension="BANNER"
        hidden={false}
        value="EVERYBODY"
        currentUser={mockUser}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();

    rerender(
      <ProfileFieldPreview dimension="BIO" hidden={true} value="NOBODY" currentUser={mockUser} />,
    );
    expect(screen.getByText('Hidden profile description')).toBeInTheDocument();

    rerender(
      <ProfileFieldPreview
        dimension="AVATAR"
        hidden={true}
        value="CONTACTS"
        currentUser={mockUser}
      />,
    );
    expect(screen.getByText('How subscribers see it')).toBeInTheDocument();

    rerender(
      <ProfileFieldPreview
        dimension="BANNER"
        hidden={true}
        value="NOBODY"
        currentUser={mockUser}
      />,
    );
    expect(screen.getByText('How others see it')).toBeInTheDocument();
  });
});
