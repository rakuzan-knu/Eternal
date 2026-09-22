import * as React from 'react';
import { View, Text, BackHandler, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { useAuthStore, configureAuthStorage } from '@social-network/shared-stores';
import { mobileSecureStorage, useAppLock } from '@/shared/lib';
import { LoginScreen } from '@/pages/auth-login';
import { RegisterScreen } from '@/pages/auth-register';
import { ForgotPasswordScreen } from '@/pages/auth-forgot-password';
import { SecurityLockScreen } from '@/features/security';
import { Button, GlassCard, AuthFooter } from '@/shared/ui';
import { LogOut, User, CheckCircle2, WifiOff } from 'lucide-react-native';

// 6. Hold native splash screen until storage rehydration completes
SplashScreen.preventAutoHideAsync().catch(() => {});

// 1. Hardware Keychain & SecureStore token configuration
configureAuthStorage(mobileSecureStorage);

// 4. Offline First & TanStack Query Sync
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    setOnline(isOnline);
  });
});

// Web global viewport constraint to prevent horizontal clipping
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rn-web-viewport-fix';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = `
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
      background-color: #050505 !important;
      background: radial-gradient(circle at 50% 12%, rgba(147, 51, 234, 0.22) 0%, rgba(5, 5, 5, 0) 65%), #050505 !important;
      background-attachment: fixed !important;
    }
    #root {
      width: 100% !important;
      max-width: 100% !important;
      min-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      overflow-x: hidden !important;
    }
    #root > div {
      width: 100% !important;
      max-width: 100% !important;
      flex: 1 1 auto !important;
    }
    /* Eliminate browser focus outlines and white boxes */
    input, textarea, select, button {
      outline: none !important;
      -webkit-tap-highlight-color: transparent !important;
      box-shadow: none !important;
    }
    input:focus, textarea:focus, select:focus {
      outline: none !important;
      box-shadow: none !important;
    }
    /* Prevent Chrome / Edge autofill from painting inputs white */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px #141416 inset !important;
      -webkit-text-fill-color: #f5f5f5 !important;
      caret-color: #ffffff !important;
      transition: background-color 50000s ease-in-out 0s;
    }
  `;
}

export type Screen = 'login' | 'register' | 'forgot-password';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AppContent() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [currentScreen, setCurrentScreen] = React.useState<Screen>('login');
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState(true);
  const { isAuthenticated, user, clearSession } = useAuthStore();
  const { isLocked, unlock } = useAppLock(isAuthenticated);

  // 6. Splash Screen: Hold native splash screen until token rehydration completes
  React.useEffect(() => {
    async function prepare() {
      try {
        // Wait for Zustand persist & SecureStore to rehydrate tokens
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch {
        // Fail-safe
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  // Monitor network connectivity
  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  // 5. Deep Linking: Handle reset-password?token=...
  React.useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        const isReset =
          parsed.path?.includes('reset-password') || parsed.hostname === 'reset-password';

        if (isReset) {
          const token = parsed.queryParams?.token;
          if (typeof token === 'string' && token.length > 0) {
            setResetToken(token);
            setCurrentScreen('forgot-password');
          }
        }
      } catch {
        // Safe fallback
      }
    };

    // Cold launch URL
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    // Foreground URL listener
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  // Android Hardware Back Button Handling
  React.useEffect(() => {
    const onBackPress = () => {
      if (currentScreen === 'register' || currentScreen === 'forgot-password') {
        setCurrentScreen('login');
        setResetToken(null);
        return true; // Prevent default behavior (exiting the app)
      }
      return false; // Allow standard Android back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [currentScreen]);

  // 3. SEO: Dynamic Title & Meta Description on Screen Change (Web)
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let pageTitle = 'Eternal';
    let metaDescription = 'Eternal is an enterprise social networking platform.';

    if (isAuthenticated) {
      pageTitle = 'Home • Eternal';
      metaDescription = 'Your personal timeline and activity feed on Eternal.';
    } else {
      switch (currentScreen) {
        case 'login':
          pageTitle = 'Log in • Eternal';
          metaDescription = 'Sign in to your Eternal account.';
          break;
        case 'register':
          pageTitle = 'Create an Account • Eternal';
          metaDescription = 'Join Eternal to connect with friends and communities.';
          break;
        case 'forgot-password':
          pageTitle = 'Reset Password • Eternal';
          metaDescription = 'Reset your Eternal account password securely.';
          break;
      }
    }

    document.title = pageTitle;

    let metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'description';
      document.head.appendChild(metaTag);
    }
    metaTag.content = metaDescription;
  }, [currentScreen, isAuthenticated]);

  // Keep splash screen visible until app is fully ready
  if (!appIsReady) {
    return null;
  }

  // 5. Security: Biometric App Lock (after 2 minutes in background)
  if (isLocked) {
    return <SecurityLockScreen onUnlock={unlock} />;
  }

  // Authenticated State View
  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.safeArea} accessibilityRole={'main' as any}>
        <StatusBar style="light" backgroundColor="#050505" />

        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <WifiOff size={14} color="#fca5a5" />
            <Text style={styles.offlineBannerText}>
              No internet connection. Waiting for network...
            </Text>
          </View>
        )}

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header} accessibilityRole="header">
            <View style={styles.brandRow}>
              <View
                style={styles.logoBadge}
                accessibilityRole="image"
                accessibilityLabel="Eternal Logo"
              >
                <Text style={styles.logoText}>E</Text>
              </View>
              <Text style={styles.brandName}>Eternal Social</Text>
            </View>

            <View
              style={styles.statusBadge}
              accessibilityRole="text"
              accessibilityLabel="Connection status: Connected"
            >
              <CheckCircle2 size={12} color="#34d399" />
              <Text style={styles.statusBadgeText}>Connected</Text>
            </View>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View
              style={styles.avatarContainer}
              accessibilityRole="image"
              accessibilityLabel={`${user.displayName || user.username}'s avatar`}
            >
              <User size={38} color="#a855f7" />
            </View>

            <Text style={styles.displayName}>{user.displayName || user.username}</Text>
            <Text style={styles.username}>@{user.username}</Text>

            {/* GlassCard for profile information */}
            <GlassCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account ID</Text>
                <Text style={styles.infoValueMono}>{user.id.slice(0, 8)}...</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email || 'N/A'}</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Runtime</Text>
                <Text style={styles.infoValueAccent}>React Native + Expo SDK 52</Text>
              </View>
            </GlassCard>

            <Button
              title="Sign Out"
              variant="secondary"
              size="lg"
              leftIcon={<LogOut size={16} color="#e4e4e7" />}
              accessibilityLabel="Sign Out"
              accessibilityHint="Signs out of your active account session"
              onPress={clearSession}
              style={styles.signOutButton}
            />
          </View>

          <AuthFooter />
        </View>
      </SafeAreaView>
    );
  }

  // Unauthenticated Auth Screens
  return (
    <SafeAreaView style={styles.safeArea} accessibilityRole={'main' as any}>
      <StatusBar style="light" backgroundColor="#050505" />

      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner} accessibilityRole="alert">
          <WifiOff size={14} color="#fca5a5" />
          <Text style={styles.offlineBannerText}>
            No internet connection. Waiting for network...
          </Text>
        </View>
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onNavigateRegister={() => setCurrentScreen('register')}
          onNavigateForgotPassword={() => setCurrentScreen('forgot-password')}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen onNavigateLogin={() => setCurrentScreen('login')} />
      )}

      {currentScreen === 'forgot-password' && (
        <ForgotPasswordScreen
          onNavigateLogin={() => {
            setResetToken(null);
            setCurrentScreen('login');
          }}
          resetToken={resetToken}
          onResetSuccess={() => {
            setResetToken(null);
            setCurrentScreen('login');
          }}
        />
      )}
    </SafeAreaView>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: '#050505',
    overflow: 'hidden',
  },

  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34d399',
  },
  profileSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 380,
    width: '100%',
    alignSelf: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#18181b',
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 24,
  },
  infoCard: {
    width: '100%',
    marginBottom: 28,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  infoValueMono: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  infoValueAccent: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },
  signOutButton: {
    maxWidth: 300,
  },
  offlineBanner: {
    width: '100%',
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fca5a5',
  },
});
