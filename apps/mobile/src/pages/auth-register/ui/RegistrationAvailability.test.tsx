// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRegistrationPolicy } from '@social-network/shared-contracts';
import { RegisterScreen } from './RegisterScreen';

const state = vi.hoisted(() => ({
  language: 'en',
  query: {
    isSuccess: true,
    isPending: false,
    isError: false,
    isFetching: false,
    data: undefined as ReturnType<typeof getRegistrationPolicy> | undefined,
    refetch: vi.fn(),
  },
  register: vi.fn(),
  clipboard: vi.fn(),
  mail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@social-network/shared-api-client', () => ({
  useRegistrationPolicy: () => state.query,
  useRegister: state.register,
  useCheckUsername: vi.fn(),
}));
vi.mock('@social-network/shared-stores', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/shared/lib', () => ({
  getClipboardEmail: state.clipboard,
  haptics: {},
  useScreenSecurity: vi.fn(),
  useDebounce: vi.fn(),
}));
vi.mock('@/shared/lib/i18n', () => ({
  useLanguage: () => state.language,
  msg: (value: string) => value,
  tr: (value: string) => value,
  trKnown: (value: string) => value,
  formatDate: vi.fn(),
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: vi.fn() }));
vi.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  Check: () => null,
  X: () => null,
}));
vi.mock('react-native', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View: Box,
    Text: Box,
    ScrollView: Box,
    KeyboardAvoidingView: Box,
    TouchableWithoutFeedback: Box,
    Pressable: Box,
    TextInput: () => <input />,
    Platform: { OS: 'web' },
    StyleSheet: { create: (value: unknown) => value },
    Linking: { openURL: state.mail },
    Keyboard: {},
    AccessibilityInfo: {},
    Animated: {},
    ActivityIndicator: () => null,
  };
});
vi.mock('@/shared/ui', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <button onClick={onPress}>{title}</button>
    ),
    Input: () => <input />,
    PasswordInput: () => <input />,
    Select: () => <select />,
    Alert: Box,
    GlassCard: Box,
    AuthFooter: () => null,
  };
});

describe('mobile registration availability', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  beforeEach(() => {
    state.language = 'en';
    state.query = {
      isSuccess: true,
      isPending: false,
      isError: false,
      isFetching: false,
      data: getRegistrationPolicy(),
      refetch: vi.fn(),
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('keeps existing sign-in and support reachable without mounting personal data fields', async () => {
    const signin = vi.fn();
    await act(async () => root.render(<RegisterScreen onNavigateLogin={signin} />));
    expect(container.textContent).toContain('New registrations are temporarily unavailable');
    expect(container.querySelector('input')).toBeNull();
    expect(state.register).not.toHaveBeenCalled();
    expect(state.clipboard).not.toHaveBeenCalled();
    const buttons = Array.from(container.querySelectorAll('button'));
    await act(async () =>
      buttons.find((button) => button.textContent === 'Sign in to an existing account')?.click(),
    );
    expect(signin).toHaveBeenCalledOnce();
    await act(async () =>
      buttons.find((button) => button.textContent === 'eternalnet.support@proton.me')?.click(),
    );
    expect(state.mail).toHaveBeenCalledWith('mailto:eternalnet.support@proton.me');
  });

  it('fails closed during loading and after a policy error, with retry', async () => {
    state.query = { ...state.query, isSuccess: false, isPending: true, data: undefined };
    await act(async () => root.render(<RegisterScreen onNavigateLogin={vi.fn()} />));
    expect(container.textContent).toContain('Checking registration availability');
    expect(container.querySelector('input')).toBeNull();
    state.query = { ...state.query, isPending: false, isError: true };
    await act(async () => root.render(<RegisterScreen onNavigateLogin={vi.fn()} />));
    expect(container.textContent).toContain('Registration remains closed');
    await act(async () =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Try again')
        ?.click(),
    );
    expect(state.query.refetch).toHaveBeenCalledOnce();
    expect(container.querySelector('input')).toBeNull();
  });

  it('provides the closed notice in Ukrainian', async () => {
    state.language = 'uk';
    await act(async () => root.render(<RegisterScreen onNavigateLogin={vi.fn()} />));
    expect(container.textContent).toContain('Нові реєстрації тимчасово недоступні');
    expect(container.textContent).toContain('жоден ринок не відкрито');
  });
});
