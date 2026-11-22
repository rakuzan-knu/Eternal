// @vitest-environment jsdom
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { AuthFooter } from './AuthFooter';

const openURL = vi.hoisted(() => vi.fn());

vi.mock('@/shared/api/client', () => ({ webOrigin: 'https://eternal.example' }));
vi.mock('@/shared/lib/i18n', () => ({ tr: (value: string) => value, useLanguage: () => 'en' }));
vi.mock('react-native', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View: Box,
    Text: Box,
    Pressable: ({ children, onPress }: { children?: React.ReactNode; onPress: () => void }) => (
      <button onClick={onPress}>{children}</button>
    ),
    Linking: { openURL },
    StyleSheet: { create: (styles: unknown) => styles },
  };
});

it('opens the public policy pages and exposes the URL if the browser cannot open', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(<AuthFooter />));
    const buttons = Array.from(container.querySelectorAll('button'));
    for (const [label, path] of [
      ['Privacy Policy', '/privacy'],
      ['Terms of Service', '/terms'],
      ['Cookies', '/terms/cookie-policy'],
      ['About', '/company'],
      ['Help', '/safety'],
    ]) {
      const button = buttons.find((item) => item.textContent === label);
      if (!button) throw new Error(`Missing footer link: ${label}`);
      await React.act(async () => button.click());
      expect(openURL).toHaveBeenLastCalledWith(`https://eternal.example${path}`);
    }
    openURL.mockRejectedValueOnce(new Error('No browser'));
    await React.act(async () => buttons[0]?.click());
    expect(container.textContent).toContain(
      'Could not open the page. https://eternal.example/privacy',
    );
  } finally {
    await React.act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
