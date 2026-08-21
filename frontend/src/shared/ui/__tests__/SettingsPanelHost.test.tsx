import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPanelHost, useSettingsPanelHost } from '../SettingsPanelHost';

function ConsumerComponent() {
  const host = useSettingsPanelHost();
  return <div data-testid="host-status">{host ? 'Host available' : 'Host null'}</div>;
}

describe('SettingsPanelHost', () => {
  it('provides host container ref context to children', () => {
    render(
      <SettingsPanelHost>
        <div>Content Inside Host</div>
        <ConsumerComponent />
      </SettingsPanelHost>,
    );

    expect(screen.getByText('Content Inside Host')).toBeInTheDocument();
    // After mounting, the ref is set
    expect(screen.getByTestId('host-status')).toHaveTextContent('Host available');
  });
});
