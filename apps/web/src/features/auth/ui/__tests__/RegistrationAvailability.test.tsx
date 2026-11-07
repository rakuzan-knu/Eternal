import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { getRegistrationPolicy, type RegistrationPolicy } from '@social-network/shared-contracts';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { useLanguageStore } from '@/shared/lib/language/languageStore';
import { useAuthMutations } from '../../api/useAuth';
import { RegisterForm } from '../RegisterForm';

interface PolicyState {
  isSuccess: boolean;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  data: RegistrationPolicy | undefined;
  refetch: () => void;
}

const state = vi.hoisted(() => ({ current: undefined as PolicyState | undefined }));
vi.mock('../../api/useRegistrationPolicy', () => ({ useRegistrationPolicy: () => state.current }));
vi.mock('../../api/useAuth', () => ({ useAuthMutations: vi.fn() }));

describe('registration publication gate', () => {
  const refetch = vi.fn();
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
    state.current = {
      isSuccess: true,
      isPending: false,
      isError: false,
      isFetching: false,
      data: getRegistrationPolicy(),
      refetch,
    };
  });
  afterEach(() => vi.clearAllMocks());

  it('shows the closed policy and existing account / private support routes without collecting registration details', () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByText('New registrations are temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to an existing account' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: 'eternalnet.support@proton.me' })).toHaveAttribute(
      'href',
      'mailto:eternalnet.support@proton.me',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Account' })).not.toBeInTheDocument();
    expect(useAuthMutations).not.toHaveBeenCalled();
  });

  it('keeps inputs absent while policy is loading', () => {
    state.current = {
      isSuccess: false,
      isPending: true,
      isError: false,
      isFetching: true,
      data: undefined,
      refetch,
    };
    renderWithProviders(<RegisterForm />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking registration availability');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('fails closed on policy errors and provides an explicit retry', () => {
    state.current = {
      isSuccess: false,
      isPending: false,
      isError: true,
      isFetching: false,
      data: undefined,
      refetch,
    };
    renderWithProviders(<RegisterForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('Registration remains closed');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('explains unavailability in Ukrainian', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    renderWithProviders(<RegisterForm />);
    expect(screen.getByText('Нові реєстрації тимчасово недоступні')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('жоден ринок не відкрито');
  });
});
