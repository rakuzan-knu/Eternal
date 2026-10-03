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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerFormSchema,
  type RegisterFormDto,
  calculatePasswordStrength,
} from '@social-network/shared-contracts';
import {
  useRegister,
  useCheckUsername,
  type RegisterPayload,
} from '@social-network/shared-api-client';
import { useAuthStore } from '@social-network/shared-stores';
import { Button, Input, PasswordInput, Select, Alert, GlassCard, AuthFooter } from '@/shared/ui';
import { haptics, useScreenSecurity, getClipboardEmail, useDebounce } from '@/shared/lib';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import axios from 'axios';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => String(CURRENT_YEAR - i));

export interface RegisterScreenProps {
  onNavigateLogin: () => void;
  onSuccess?: () => void;
}

export function RegisterScreen({ onNavigateLogin, onSuccess }: RegisterScreenProps) {
  // 1. Enterprise Screen Security: prevent screenshots / recordings
  useScreenSecurity(true);

  const insets = useSafeAreaInsets();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [clipboardEmail, setClipboardEmail] = React.useState<string | null>(null);
  const registerMutation = useRegister();
  const setSession = useAuthStore((state) => state.setSession);

  // Apple Error Shake Animation
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const triggerShake = React.useCallback(() => {
    if (reduceMotion) return;
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: -5,
        duration: 45,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: 5,
        duration: 45,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: -3,
        duration: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: 3,
        duration: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 30,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [reduceMotion, shakeAnim]);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const fieldOffsets = React.useRef<Record<string, number>>({});

  const firstNameRef = React.useRef<TextInput>(null);
  const lastNameRef = React.useRef<TextInput>(null);
  const usernameRef = React.useRef<TextInput>(null);
  const identityRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

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
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormDto>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      birthMonth: 'January',
      birthDay: '1',
      birthYear: '2000',
      gender: 'Male',
      identity: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedMonth = useWatch({ control, name: 'birthMonth' });
  const selectedYear = useWatch({ control, name: 'birthYear' });
  const passwordValue = useWatch({ control, name: 'password' }) || '';
  const strengthInfo = calculatePasswordStrength(passwordValue);

  // Live Debounced Username Check
  const usernameValue = useWatch({ control, name: 'username' }) || '';
  const cleanUsername = usernameValue.replace(/^@+/, '').trim();
  const debouncedUsername = useDebounce(cleanUsername, 500);

  const isTypingUsername =
    cleanUsername.length >= 2 && cleanUsername.toLowerCase() !== debouncedUsername.toLowerCase();

  const { data: usernameStatus, isFetching: isCheckingUsername } = useCheckUsername(
    debouncedUsername,
    { enabled: debouncedUsername.length >= 2 },
  );

  const isChecking = isTypingUsername || isCheckingUsername;
  const isAvailable =
    !isChecking && debouncedUsername.length >= 2 && usernameStatus?.isAvailable === true;
  const isTaken =
    !isChecking && debouncedUsername.length >= 2 && usernameStatus?.isAvailable === false;

  // Calculate days in selected month & year (Optimized by React Compiler - zero legacy useMemo)
  const monthIndex = MONTHS.indexOf(selectedMonth);
  const parsedYear = parseInt(selectedYear, 10) || 2000;
  const daysInMonth = monthIndex === -1 ? 31 : new Date(parsedYear, monthIndex + 1, 0).getDate();
  const daysOptions = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  const isPending = isSubmitting || registerMutation.isPending;

  const onSubmit = async (data: RegisterFormDto) => {
    try {
      if (isTaken) {
        haptics.error();
        triggerShake();
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, (fieldOffsets.current['username'] || 0) - 20),
          animated: true,
        });
        return;
      }
      if (isChecking) {
        return;
      }

      setErrorMessage(null);

      const monthIndex = MONTHS.indexOf(data.birthMonth);
      const birthDate = new Date(
        parseInt(data.birthYear, 10),
        monthIndex >= 0 ? monthIndex : 0,
        parseInt(data.birthDay, 10),
        12,
      ).toISOString();

      const cleanUsername = data.username.trim().replace(/^@+/, '');
      const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

      const payload: RegisterPayload = {
        email: data.identity.trim().toLowerCase(),
        username: cleanUsername,
        displayName,
        password: data.password,
        birthDate,
        turnstileToken: data.turnstileToken,
      };

      const response = await registerMutation.mutateAsync(payload);

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

      haptics.success();
      onSuccess?.();
    } catch (err: unknown) {
      haptics.error();
      triggerShake();
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const serverMessage = err.response?.data?.message;

        if (status === 409) {
          setErrorMessage(
            typeof serverMessage === 'string'
              ? serverMessage
              : 'This email address, phone number or username is already registered.',
          );
        } else if (Array.isArray(serverMessage)) {
          setErrorMessage(serverMessage.join(', '));
        } else if (typeof serverMessage === 'string') {
          setErrorMessage(serverMessage);
        } else {
          setErrorMessage('Validation failed. Please verify your data.');
        }
      } else {
        setErrorMessage('Failed to connect to the server. Please check your internet connection.');
      }
    }
  };

  const onValidationError = (formErrors: typeof errors) => {
    haptics.error();
    triggerShake();
    AccessibilityInfo.announceForAccessibility('Please fix errors in the form.');

    const errorKeys: (keyof RegisterFormDto)[] = [
      'firstName',
      'lastName',
      'username',
      'birthMonth',
      'birthDay',
      'birthYear',
      'gender',
      'identity',
      'password',
      'confirmPassword',
    ];

    const firstError = errorKeys.find((key) => formErrors[key]);
    if (firstError && typeof fieldOffsets.current[firstError] === 'number') {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, fieldOffsets.current[firstError] - 20),
        animated: true,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(64, insets.bottom + 48) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback
          onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}
          accessible={false}
        >
          <View style={styles.contentWrapper}>
            {/* Top Bar matching Web design */}
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

            {/* GlassCard with Apple Micro-Shake Animation */}
            <Animated.View style={[styles.cardWrapper, { transform: [{ translateX: shakeAnim }] }]}>
              <GlassCard style={styles.card} accessibilityRole={'form' as any}>
                <View style={styles.header} accessibilityRole="header">
                  <Text style={styles.title}>Get started on Eternal</Text>
                  <Text style={styles.subtitle}>
                    Create an account to connect with friends and communities.
                  </Text>
                </View>

                {errorMessage && (
                  <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
                    {errorMessage}
                  </Alert>
                )}

                {/* Name Fields: First Name & Last Name */}
                <View
                  style={styles.twoColumnRow}
                  onLayout={(e) => {
                    fieldOffsets.current['firstName'] = e.nativeEvent.layout.y;
                    fieldOffsets.current['lastName'] = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.flexOne}>
                    <Controller
                      control={control}
                      name="firstName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          ref={firstNameRef}
                          label="Name"
                          placeholder="First name"
                          autoCapitalize="words"
                          autoCorrect={false}
                          autoComplete="name-given"
                          textContentType="givenName"
                          returnKeyType="next"
                          onSubmitEditing={() => lastNameRef.current?.focus()}
                          blurOnSubmit={false}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          editable={!isPending}
                          showClearButton={Boolean(value)}
                          onClear={() => setValue('firstName', '', { shouldValidate: true })}
                          error={errors.firstName?.message}
                        />
                      )}
                    />
                  </View>

                  <View style={styles.flexOne}>
                    <Controller
                      control={control}
                      name="lastName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          ref={lastNameRef}
                          label=" "
                          placeholder="Last name"
                          autoCapitalize="words"
                          autoCorrect={false}
                          autoComplete="name-family"
                          textContentType="familyName"
                          returnKeyType="next"
                          onSubmitEditing={() => usernameRef.current?.focus()}
                          blurOnSubmit={false}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          editable={!isPending}
                          showClearButton={Boolean(value)}
                          onClear={() => setValue('lastName', '', { shouldValidate: true })}
                          error={errors.lastName?.message}
                        />
                      )}
                    />
                  </View>
                </View>

                {/* Username Field with Live Debounced Availability Check */}
                <View
                  onLayout={(e) => {
                    fieldOffsets.current['username'] = e.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="username"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        ref={usernameRef}
                        label="Username"
                        placeholder="@username"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => identityRef.current?.focus()}
                        blurOnSubmit={false}
                        value={value}
                        onChangeText={(text) => {
                          let sanitized = text;
                          if (sanitized.length > 0 && !sanitized.startsWith('@')) {
                            sanitized = '@' + sanitized.replace(/@/g, '');
                          }
                          onChange(sanitized);
                        }}
                        onBlur={onBlur}
                        editable={!isPending}
                        showClearButton={Boolean(value) && !isChecking && !isAvailable && !isTaken}
                        onClear={() => setValue('username', '', { shouldValidate: true })}
                        rightElement={
                          isChecking ? (
                            <View style={styles.usernameStatusRow}>
                              <ActivityIndicator size="small" color="#c084fc" />
                            </View>
                          ) : isAvailable ? (
                            <View
                              style={styles.usernameStatusRow}
                              accessibilityRole="text"
                              accessibilityLabel="Username is available"
                            >
                              <Check size={14} color="#10b981" strokeWidth={2.5} />
                              <Text style={styles.usernameAvailableText}>Available</Text>
                            </View>
                          ) : isTaken ? (
                            <View
                              style={styles.usernameStatusRow}
                              accessibilityRole="alert"
                              accessibilityLabel="Username is taken"
                            >
                              <X size={14} color="#ef4444" strokeWidth={2.5} />
                              <Text style={styles.usernameTakenText}>Taken</Text>
                            </View>
                          ) : null
                        }
                        error={
                          errors.username?.message || (isTaken ? 'Username is taken' : undefined)
                        }
                      />
                    )}
                  />
                </View>

                {/* Birthday Section matching Web */}
                <View
                  style={styles.sectionBlock}
                  onLayout={(e) => {
                    fieldOffsets.current['birthMonth'] = e.nativeEvent.layout.y;
                    fieldOffsets.current['birthDay'] = e.nativeEvent.layout.y;
                    fieldOffsets.current['birthYear'] = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>Birthday</Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    Providing your birthday helps make sure you get the right experience for your
                    age.
                  </Text>
                  <View style={styles.birthdayRow}>
                    <View style={styles.monthCol}>
                      <Controller
                        control={control}
                        name="birthMonth"
                        render={({ field: { onChange, value } }) => (
                          <Select
                            value={value}
                            options={MONTHS}
                            onChange={(val) => {
                              onChange(val);
                              // Ensure day doesn't exceed new month's max
                              const monthIdx = MONTHS.indexOf(val);
                              const maxDays = new Date(
                                parseInt(selectedYear, 10),
                                monthIdx + 1,
                                0,
                              ).getDate();
                              if (parseInt(control._formValues.birthDay, 10) > maxDays) {
                                setValue('birthDay', String(maxDays));
                              }
                            }}
                            disabled={isPending}
                          />
                        )}
                      />
                    </View>

                    <View style={styles.dayCol}>
                      <Controller
                        control={control}
                        name="birthDay"
                        render={({ field: { onChange, value } }) => (
                          <Select
                            value={value}
                            options={daysOptions}
                            onChange={onChange}
                            disabled={isPending}
                          />
                        )}
                      />
                    </View>

                    <View style={styles.yearCol}>
                      <Controller
                        control={control}
                        name="birthYear"
                        render={({ field: { onChange, value } }) => (
                          <Select
                            value={value}
                            options={YEARS}
                            onChange={(val) => {
                              onChange(val);
                              const monthIdx = MONTHS.indexOf(selectedMonth);
                              const maxDays = new Date(
                                parseInt(val, 10),
                                monthIdx + 1,
                                0,
                              ).getDate();
                              if (parseInt(control._formValues.birthDay, 10) > maxDays) {
                                setValue('birthDay', String(maxDays));
                              }
                            }}
                            disabled={isPending}
                          />
                        )}
                      />
                    </View>
                  </View>
                </View>

                {/* Gender Section matching Web */}
                <View
                  style={styles.sectionBlock}
                  onLayout={(e) => {
                    fieldOffsets.current['gender'] = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>Gender</Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    You can change who sees your gender on your profile later.
                  </Text>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field: { onChange, value } }) => (
                      <Select
                        value={value}
                        options={['Male', 'Female', 'Custom']}
                        onChange={onChange}
                        disabled={isPending}
                        error={errors.gender?.message}
                      />
                    )}
                  />
                </View>

                {/* Mobile number or email Field */}
                <View
                  onLayout={(e) => {
                    fieldOffsets.current['identity'] = e.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="identity"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        ref={identityRef}
                        label="Mobile number or email"
                        placeholder="Mobile number or email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        blurOnSubmit={false}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        editable={!isPending}
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
                        error={errors.identity?.message}
                      />
                    )}
                  />
                </View>

                {/* Password Field */}
                <View
                  onLayout={(e) => {
                    fieldOffsets.current['password'] = e.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <PasswordInput
                        ref={passwordRef}
                        label="Password"
                        placeholder="New password"
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                        blurOnSubmit={false}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        editable={!isPending}
                        showRequirementsChecklist={true}
                        passwordValue={passwordValue}
                        error={errors.password?.message}
                      />
                    )}
                  />
                </View>

                {/* Confirm Password Field with auto-scroll to reveal submit button */}
                <View
                  onLayout={(e) => {
                    fieldOffsets.current['confirmPassword'] = e.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <PasswordInput
                        ref={confirmPasswordRef}
                        label="Confirm Password"
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit(onSubmit, onValidationError)}
                        value={value}
                        onChangeText={onChange}
                        onFocus={() => {
                          // Bottom safe scroll: ensure submit button is in view
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                          }, 150);
                        }}
                        onBlur={onBlur}
                        editable={!isPending}
                        error={errors.confirmPassword?.message}
                      />
                    )}
                  />
                </View>

                <Text style={styles.disclaimerText}>
                  By tapping Create Account, you agree to our{' '}
                  <Text
                    style={styles.purpleLink}
                    accessibilityRole="link"
                    accessibilityLabel="Terms"
                    {...({ hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } } as any)}
                  >
                    Terms
                  </Text>
                  ,{' '}
                  <Text
                    style={styles.purpleLink}
                    accessibilityRole="link"
                    accessibilityLabel="Privacy Policy"
                    {...({ hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } } as any)}
                  >
                    Privacy Policy
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.purpleLink}
                    accessibilityRole="link"
                    accessibilityLabel="Cookies Policy"
                    {...({ hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } } as any)}
                  >
                    Cookies Policy
                  </Text>
                  .
                </Text>

                <Button
                  title="Create Account"
                  variant="primary"
                  size="lg"
                  loading={isPending}
                  accessibilityLabel="Create Account"
                  accessibilityHint="Submits registration form to create an account"
                  onPress={handleSubmit(onSubmit, onValidationError)}
                  style={styles.submitBtn}
                />

                {/* Secondary Button matching web design */}
                <Button
                  title="I already have an account"
                  variant="secondary"
                  size="lg"
                  disabled={isPending}
                  accessibilityLabel="I already have an account"
                  accessibilityHint="Navigates back to the login screen"
                  onPress={onNavigateLogin}
                  style={styles.secondaryBtn}
                />
              </GlassCard>
            </Animated.View>
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
    paddingTop: 24,
    paddingBottom: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
  },
  usernameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  usernameAvailableText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  usernameTakenText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  flexOne: {
    flex: 1,
  },
  sectionBlock: {
    width: '100%',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 8,
    marginLeft: 2,
    lineHeight: 16,
  },
  birthdayRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  monthCol: {
    flex: 1.3,
  },
  dayCol: {
    flex: 0.9,
  },
  yearCol: {
    flex: 1.1,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#71717a',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 14,
  },
  purpleLink: {
    color: '#c084fc',
    fontWeight: '500',
  },
  submitBtn: {
    marginBottom: 12,
  },
  secondaryBtn: {
    marginTop: 2,
  },
});
