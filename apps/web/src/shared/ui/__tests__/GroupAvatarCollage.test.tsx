import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import GroupAvatarCollage from '../GroupAvatarCollage';

describe('GroupAvatarCollage', () => {
  it('renders single avatar image for 0 or 1 item', () => {
    const { container: emptyContainer } = render(<GroupAvatarCollage avatars={[]} />);
    expect(emptyContainer.querySelectorAll('img')).toHaveLength(0);

    const { container } = render(
      <GroupAvatarCollage avatars={['https://example.com/avatar1.jpg']} />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('renders dual avatar collage for 2 items', () => {
    const { container } = render(
      <GroupAvatarCollage
        avatars={['https://example.com/avatar1.jpg', 'https://example.com/avatar2.jpg']}
      />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('renders multi-avatar collage for 3 items', () => {
    const { container } = render(
      <GroupAvatarCollage
        avatars={[
          'https://example.com/avatar1.jpg',
          'https://example.com/avatar2.jpg',
          'https://example.com/avatar3.jpg',
        ]}
      />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(3);
  });

  it('renders 4-avatar collage for 4+ items', () => {
    const { container } = render(
      <GroupAvatarCollage
        avatars={[
          'https://example.com/avatar1.jpg',
          'https://example.com/avatar2.jpg',
          'https://example.com/avatar3.jpg',
          'https://example.com/avatar4.jpg',
          'https://example.com/avatar5.jpg',
        ]}
      />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(4);
  });
});
