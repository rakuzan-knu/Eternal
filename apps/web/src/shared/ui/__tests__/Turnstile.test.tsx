import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Turnstile } from '../Turnstile';

describe('Turnstile registration challenge', () => {
  afterEach(() => {
    delete window.turnstile;
    vi.useRealTimers();
  });

  it('renders a supported size without hiding an interactive challenge', () => {
    vi.useFakeTimers();
    const onVerify = vi.fn();
    const renderWidget = vi.fn<NonNullable<Window['turnstile']>['render']>((container, options) => {
      if (!['normal', 'compact', 'flexible'].includes(options.size ?? 'normal')) {
        throw new Error('Unsupported Cloudflare widget size');
      }
      expect(container).toBeVisible();
      options.callback('challenge-response');
      return 'widget-1';
    });
    window.turnstile = { render: renderWidget, reset: vi.fn(), remove: vi.fn() };
    const view = render(<Turnstile onVerify={onVerify} />);
    act(() => vi.advanceTimersByTime(100));
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith('challenge-response');
    view.rerender(<Turnstile onVerify={onVerify} />);
    act(() => vi.advanceTimersByTime(100));
    expect(renderWidget).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
