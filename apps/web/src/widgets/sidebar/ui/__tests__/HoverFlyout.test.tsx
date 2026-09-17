import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HoverFlyout } from '../HoverFlyout';
import React from 'react';

describe('HoverFlyout', () => {
  it('opens flyout on trigger hover/click and displays children', () => {
    render(
      <HoverFlyout
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle}>
            Open Menu
          </button>
        )}
      >
        <div data-testid="flyout-content">Flyout Submenu Content</div>
      </HoverFlyout>,
    );

    expect(screen.queryByTestId('flyout-content')).not.toBeInTheDocument();

    const trigger = screen.getByText('Open Menu');
    fireEvent.mouseEnter(trigger);

    expect(screen.getByTestId('flyout-content')).toBeInTheDocument();
  });
});
