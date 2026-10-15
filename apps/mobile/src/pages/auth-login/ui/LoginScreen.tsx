import * as React from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  AccessibilityInfo,
  StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginDto } from '@social-network/shared-contracts';
import { useLogin, type LoginPayload, authApi } from '@social-network/shared-api-client';
import { useAuthStore } from '@social-network/shared-stores';
import { Button, Input, PasswordInput, Alert, GlassCard, AuthFooter } from '@/shared/ui';
import {
  haptics,
  checkBiometricCapability,
  authenticateWithBiometrics,
  type BiometricCapability,
  useScreenSecurity,
  getClipboardEmail,
} from '@/shared/lib';
import { ScanFace, Fingerprint } from 'lucide-react-native';
import axios from 'axios';

export interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateForgotPassword: () => void;
  onSuccess?: () => void;
}

export function LoginScreen({
  onNavigateRegister,
  onNavigateForgotPassword,
  onSuccess,
}: LoginScreenProps) {
  // 1. Enterprise Screen Security: prevent screenshots / recordings
  useScreenSecurity(true);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [biometric, setBiometric] = React.useState<BiometricCapability | null>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [clipboardEmail, setClipboardEmail] = React.useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [lockoutSeconds, setLockoutSeconds] = React.useState(0);

  const loginMutation = useLogin();
  const setSession = useAuthStore((state) => state.setSession);

  const identityRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    checkBiometricCapability().then(setBiometric);
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    getClipboardEmail().then((email) => {
      if (email) setClipboardEmail(email);
    });
  }, []);

  // Rate Limiting: Lockout countdown timer
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      identity: '',
      password: '',
    },
  });

  const isPending = isSubmitting || loginMutation.isPending;

  const handleBiometricLogin = async () => {
    haptics.light();
    const currentRefreshToken = useAuthStore.getState().refreshToken;
    const currentUser = useAuthStore.getState().user;

    if (!currentRefreshToken || !currentUser) {
      setErrorMessage('Please sign in with your password first to enable biometric login.');
      haptics.warning();
      return;
    }

    const success = await authenticateWithBiometrics(
      `Sign in to Eternal with ${biometric?.biometryName || 'Biometrics'}`,
    );

    if (success) {
      try {
        const tokens = await authApi.refreshToken(currentRefreshToken);
        setSession({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? currentRefreshToken,
          user: currentUser,
        });
        haptics.success();
        onSuccess?.();
      } catch {
        setErrorMessage('Biometric session expired. Please sign in with your password.');
        haptics.error();
      }
    } else {
      haptics.warning();
    }
  };

  const onSubmit = async (data: LoginDto) => {
    try {
      setErrorMessage(null);
      const rawIdentity = (data.identity || data.email || '').trim();
      const payload: LoginPayload = {
        identity: rawIdentity,
        email: rawIdentity.toLowerCase(),
        password: data.password,
      };

      const response = await loginMutation.mutateAsync(payload);

      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken ?? null,
        user: {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          displayName: response.user.displayName,
          avatarUrl: response.user.avatarUrl,
          role: response.user.role,
        },
      });

      setFailedAttempts(0);
      setLockoutSeconds(0);
      haptics.success();
      onSuccess?.();
    } catch (err: unknown) {
      haptics.error();
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        // Exponential backoff: 30s for 3 attempts, 60s for 4, 120s for 5+
        const backoff = 30 * Math.pow(2, Math.min(newAttempts - 3, 2));
        setLockoutSeconds(backoff);
      }

      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.message;
        if (serverMessage === 'USER_NOT_FOUND') {
          setErrorMessage(
            'The email address or mobile phone number provided is not associated with any account.',
          );
        } else if (serverMessage === 'INVALID_PASSWORD') {
          setErrorMessage('You entered an incorrect password. Please try again.');
        } else if (typeof serverMessage === 'string') {
          setErrorMessage(serverMessage);
        } else {
          setErrorMessage('Failed to sign in. Please verify your credentials.');
        }
      } else {
        setErrorMessage(
          'A network connection error occurred. Please check your internet connection.',
        );
      }
    }
  };

  const onValidationError = () => {
    haptics.error();
    AccessibilityInfo.announceForAccessibility('Please fix errors in the form.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback
          onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}
          accessible={false}
        >
          <View style={styles.contentWrapper}>
            {/* Brand Logo Badge matching Web mobile */}
            <View style={styles.brandHeader}>
              <View
                style={[styles.logoBadge, reduceMotion && styles.noGlow]}
                accessibilityRole="image"
                accessibilityLabel="Eternal Logo"
              >
                <Text style={styles.logoText}>E</Text>
              </View>
            </View>

            {/* GlassCard matching Web mobile */}
            <GlassCard style={styles.card} accessibilityRole={'form' as any}>
              <View style={styles.header} accessibilityRole="header">
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
              </View>

              {lockoutSeconds > 0 && (
                <Alert variant="error">
                  Too many failed attempts. Login locked for {lockoutSeconds} seconds.
                </Alert>
              )}

              {errorMessage && (
                <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
                  {errorMessage}
                </Alert>
              )}

              {/* Input 1 - No label, placeholder matching Web */}
              <Controller
                control={control}
                name="identity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={identityRef}
                    placeholder="Email address or phone number"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="username"
                    autoComplete="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    editable={!isPending && lockoutSeconds === 0}
                    showClearButton={Boolean(value)}
                    onClear={() => setValue('identity', '', { shouldValidate: true })}
                    pasteSuggestion={clipboardEmail}
                    onPasteSuggestion={() => {
                      if (clipboardEmail) {
                        setValue('identity', clipboardEmail, { shouldValidate: true });
                        haptics.selection();
                        setClipboardEmail(null);
                      }
                    }}
                    error={errors.identity?.message || errors.email?.message}
                  />
                )}
              />

              {/* Input 2 - No label, placeholder matching Web */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <PasswordInput
                    ref={passwordRef}
                    placeholder="Password"
                    textContentType="password"
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit(onSubmit, onValidationError)}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    editable={!isPending && lockoutSeconds === 0}
                    error={errors.password?.message}
                  />
                )}
              />

              {/* Forgot password link */}
              <View style={styles.forgotContainer}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Forgot password?"
                  accessibilityHint="Navigates to the password recovery screen"
                  onPress={onNavigateForgotPassword}
                  disabled={isPending}
                  style={styles.forgotBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Log in Button */}
              <Button
                title={lockoutSeconds > 0 ? `Locked out (${lockoutSeconds}s)` : 'Log in'}
                variant="primary"
                size="lg"
                loading={isPending}
                disabled={lockoutSeconds > 0}
                accessibilityLabel={
                  lockoutSeconds > 0 ? `Locked out for ${lockoutSeconds} seconds` : 'Log in'
                }
                accessibilityHint="Submits your credentials to sign in"
                onPress={handleSubmit(onSubmit, onValidationError)}
                style={styles.submitBtn}
              />

              {/* Biometric Quick Login (Face ID / Fingerprint) */}
              {biometric?.isAvailable && (
                <Button
                  title={`Sign in with ${biometric.biometryName}`}
                  variant="outline"
                  size="lg"
                  leftIcon={
                    biometric.biometryType === 'face' ? (
                      <ScanFace size={18} color="#c084fc" />
                    ) : (
                      <Fingerprint size={18} color="#c084fc" />
                    )
                  }
                  disabled={isPending}
                  accessibilityLabel={`Sign in with ${biometric.biometryName}`}
                  accessibilityHint="Authenticates using your biometric credentials"
                  onPress={handleBiometricLogin}
                  style={styles.biometricBtn}
                />
              )}

              {/* OR Divider */}
              <View style={styles.dividerRow} accessible={false}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Secondary Button */}
              <Button
                title="Create new account"
                variant="secondary"
                size="lg"
                disabled={isPending}
                accessibilityLabel="Create new account"
                accessibilityHint="Navigates to the account registration screen"
                onPress={onNavigateRegister}
              />
            </GlassCard>
          </View>
        </TouchableWithoutFeedback>

        {/* Enterprise Footer matching Web */}
        <AuthFooter />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#050505',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  noGlow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  card: {
    width: '100%',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 4,
  },
  forgotContainer: {
    alignItems: 'flex-start',
    marginTop: 2,
    marginBottom: 16,
  },
  forgotBtn: {
    minHeight: 32,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c084fc',
  },
  submitBtn: {
    marginTop: 2,
  },
  biometricBtn: {
    marginTop: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#525252',
    letterSpacing: 1.5,
  },
});
