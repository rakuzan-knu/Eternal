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
import { forgotPasswordSchema, type ForgotPasswordDto } from '@social-network/shared-contracts';
import { useForgotPassword, useResetPassword } from '@social-network/shared-api-client';
import { Button, Input, PasswordInput, Alert, GlassCard, AuthFooter } from '@/shared/ui';
import { haptics, useScreenSecurity, getClipboardEmail } from '@/shared/lib';
import { ChevronLeft, MailCheck, KeyRound } from 'lucide-react-native';
import axios from 'axios';

export interface ForgotPasswordScreenProps {
  onNavigateLogin: () => void;
  resetToken?: string | null;
  onResetSuccess?: () => void;
}

export function ForgotPasswordScreen({
  onNavigateLogin,
  resetToken,
  onResetSuccess,
}: ForgotPasswordScreenProps) {
  // 1. Enterprise Screen Security: prevent screenshots / recordings
  useScreenSecurity(true);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [resetCompleted, setResetCompleted] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(60);
  const [submittedEmail, setSubmittedEmail] = React.useState('');
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [clipboardEmail, setClipboardEmail] = React.useState<string | null>(null);

  // Reset password states (Deep link flow)
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [resetFormError, setResetFormError] = React.useState<string | null>(null);

  const emailRef = React.useRef<TextInput>(null);
  const newPasswordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

  const forgotMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    getClipboardEmail().then((email) => {
      if (email) setClipboardEmail(email);
    });
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
    },
  });

  const onValidationError = () => {
    haptics.error();
    AccessibilityInfo.announceForAccessibility('Please fix errors in the form.');
  };

  const isPending = isSubmitting || forgotMutation.isPending || resetPasswordMutation.isPending;

  const handleResetPassword = async () => {
    if (!resetToken) return;
    if (!newPassword || newPassword.length < 8) {
      setResetFormError('Password must be at least 8 characters long');
      haptics.error();
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetFormError('Passwords do not match');
      haptics.error();
      return;
    }

    try {
      setResetFormError(null);
      await resetPasswordMutation.mutateAsync({
        token: resetToken,
        password: newPassword,
      });
      haptics.success();
      setResetCompleted(true);
      setTimeout(() => {
        onResetSuccess?.();
        onNavigateLogin();
      }, 1500);
    } catch (err: unknown) {
      haptics.error();
      if (axios.isAxiosError(err)) {
        setResetFormError(
          err.response?.data?.message || 'Failed to reset password. The link may have expired.',
        );
      } else {
        setResetFormError('A connection error occurred. Please try again.');
      }
    }
  };

  // Cooldown countdown timer
  React.useEffect(() => {
    if (!isSuccess || cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, cooldown]);

  const onSubmit = async (data: ForgotPasswordDto) => {
    try {
      setErrorMessage(null);
      await forgotMutation.mutateAsync({ email: data.email });
      setSubmittedEmail(data.email);
      haptics.success();
      setIsSuccess(true);
      setCooldown(60);
    } catch (err: unknown) {
      haptics.error();
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setErrorMessage(
          typeof msg === 'string'
            ? msg
            : 'Could not send reset instructions. Please check the email entered.',
        );
      } else {
        setErrorMessage('Failed to connect to the server. Please check your internet connection.');
      }
    }
  };

  const handleResend = () => {
    if (cooldown > 0 || isPending) return;
    const currentEmail = submittedEmail || getValues('email');
    if (currentEmail) {
      onSubmit({ email: currentEmail });
    }
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
            {/* Top Bar with circular back button and logo badge matching Web */}
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back to Login screen"
                accessibilityHint="Returns to sign in page"
                onPress={onNavigateLogin}
                disabled={isPending}
                style={styles.backCircleBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ChevronLeft size={16} color="#a3a3a3" />
              </Pressable>

              <View
                style={[styles.logoBadge, reduceMotion && styles.noGlow]}
                accessibilityRole="image"
                accessibilityLabel="Eternal Logo"
              >
                <Text style={styles.logoText}>E</Text>
              </View>
            </View>

            {/* GlassCard matching web design */}
            <GlassCard style={styles.card} accessibilityRole={'form' as any}>
              {resetToken ? (
                /* Deep Link Reset Password Flow */
                <View>
                  <View style={styles.header} accessibilityRole="header">
                    <Text style={styles.title}>Set new password</Text>
                    <Text style={styles.subtitle}>
                      Enter a new secure password for your account.
                    </Text>
                  </View>

                  {resetFormError && (
                    <Alert variant="error" onDismiss={() => setResetFormError(null)}>
                      {resetFormError}
                    </Alert>
                  )}

                  {resetCompleted && (
                    <Alert variant="success">
                      Password updated successfully! Redirecting to login...
                    </Alert>
                  )}

                  {!resetCompleted && (
                    <>
                      <PasswordInput
                        ref={newPasswordRef}
                        label="New Password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        editable={!isPending}
                      />

                      <PasswordInput
                        ref={confirmPasswordRef}
                        label="Confirm New Password"
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!isPending}
                      />

                      <Button
                        title="Update Password"
                        variant="primary"
                        size="lg"
                        loading={isPending}
                        accessibilityLabel="Update Password"
                        accessibilityHint="Saves your new password"
                        onPress={handleResetPassword}
                        style={styles.submitBtn}
                      />

                      <Button
                        title="Back to Sign In"
                        variant="secondary"
                        size="lg"
                        disabled={isPending}
                        accessibilityLabel="Back to Sign In"
                        accessibilityHint="Returns to the login page"
                        onPress={onNavigateLogin}
                        style={styles.secondaryBtn}
                      />
                    </>
                  )}
                </View>
              ) : isSuccess ? (
                /* Success State */
                <View
                  style={styles.successContainer}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  <View style={styles.successIconCircle} accessible={false}>
                    <MailCheck size={32} color="#c084fc" />
                  </View>

                  <Text style={styles.successTitle}>Check Your Email</Text>
                  <Text style={styles.successMessage}>
                    We have sent password recovery instructions to{' '}
                    <Text style={styles.highlightedEmail}>{submittedEmail}</Text>.
                  </Text>

                  <View style={styles.successActions}>
                    <Button
                      title={cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend Email'}
                      variant="secondary"
                      size="lg"
                      disabled={cooldown > 0 || isPending}
                      loading={isPending}
                      accessibilityLabel={
                        cooldown > 0 ? `Resend email in ${cooldown} seconds` : 'Resend Email'
                      }
                      accessibilityHint="Sends another password reset link to your email"
                      onPress={handleResend}
                      style={styles.actionBtn}
                    />

                    <Button
                      title="Return to Login"
                      variant="primary"
                      size="lg"
                      accessibilityLabel="Return to Login"
                      accessibilityHint="Returns to the sign in screen"
                      onPress={onNavigateLogin}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              ) : (
                /* Form State */
                <View>
                  <View style={styles.header} accessibilityRole="header">
                    <Text style={styles.title}>Find your account</Text>
                    <Text style={styles.subtitle}>Enter your mobile number or email address.</Text>
                  </View>

                  {errorMessage && (
                    <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
                      {errorMessage}
                    </Alert>
                  )}

                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        ref={emailRef}
                        placeholder="Email address or phone number"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        returnKeyType="send"
                        onSubmitEditing={handleSubmit(onSubmit, onValidationError)}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        editable={!isPending}
                        error={errors.email?.message}
                        hint="We will send a one-time reset code to this address"
                        showClearButton={Boolean(value)}
                        onClear={() => setValue('email', '', { shouldValidate: true })}
                        pasteSuggestion={clipboardEmail}
                        onPasteSuggestion={() => {
                          if (clipboardEmail) {
                            setValue('email', clipboardEmail, { shouldValidate: true });
                            haptics.selection();
                            setClipboardEmail(null);
                          }
                        }}
                      />
                    )}
                  />

                  <Button
                    title="Send Recovery Instructions"
                    variant="primary"
                    size="lg"
                    loading={isPending}
                    accessibilityLabel="Send Recovery Instructions"
                    accessibilityHint="Submits email to receive password reset instructions"
                    onPress={handleSubmit(onSubmit, onValidationError)}
                    style={styles.submitBtn}
                  />

                  <Button
                    title="Back to Sign In"
                    variant="secondary"
                    size="lg"
                    disabled={isPending}
                    accessibilityLabel="Back to Sign In"
                    accessibilityHint="Returns to the login page"
                    onPress={onNavigateLogin}
                    style={styles.secondaryBtn}
                  />
                </View>
              )}
            </GlassCard>
          </View>
        </TouchableWithoutFeedback>

        {/* Enterprise Footer matching web */}
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
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  backCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111112',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#9333ea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  noGlow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  logoText: {
    fontSize: 14,
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
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: 6,
    marginBottom: 10,
  },
  secondaryBtn: {
    marginTop: 2,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  highlightedEmail: {
    color: '#ffffff',
    fontWeight: '600',
  },
  successActions: {
    width: '100%',
    gap: 10,
  },
  actionBtn: {
    marginBottom: 2,
  },
});
