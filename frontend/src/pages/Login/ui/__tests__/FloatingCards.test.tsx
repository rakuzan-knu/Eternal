import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FloatingCards } from '../FloatingCards';
import { MOCK_NOTIFS } from '../../model/data';

describe('FloatingCards', () => {
  it('renders one card per mock notification', () => {
    render(<FloatingCards />);

    MOCK_NOTIFS.forEach((notif) => {
      expect(screen.getByText(notif.initials)).toBeInTheDocument();
      expect(screen.getByText(notif.name)).toBeInTheDocument();
    });
  });

  it('renders the exact number of mock notifications', () => {
    render(<FloatingCards />);

    expect(screen.getAllByText(/ago|Just now/)).toHaveLength(MOCK_NOTIFS.length);
  });
});
