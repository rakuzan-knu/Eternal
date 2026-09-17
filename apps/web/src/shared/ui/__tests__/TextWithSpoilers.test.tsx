import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextWithSpoilers from '../TextWithSpoilers';

describe('TextWithSpoilers', () => {
  it('returns null when text is empty', () => {
    const { container } = render(<TextWithSpoilers text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders normal text without spoilers', () => {
    render(<TextWithSpoilers text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders spoiler text hidden by default with blur and reveals on click', () => {
    render(<TextWithSpoilers text="Check out this ||secret spoiler|| here" />);

    expect(screen.getByText('Check out this')).toBeInTheDocument();
    expect(screen.getByText('here')).toBeInTheDocument();

    const spoilerWrapper = screen.getByTitle('Click to reveal spoiler');
    expect(spoilerWrapper).toBeInTheDocument();
    expect(screen.getByText('secret spoiler')).toBeInTheDocument();

    // Click to reveal
    fireEvent.click(spoilerWrapper);

    // Title attribute should no longer exist since it is now revealed
    expect(screen.queryByTitle('Click to reveal spoiler')).toBeNull();
    expect(screen.getByText('secret spoiler')).toBeInTheDocument();
  });
});
