import * as React from 'react';
import { View, Text, AppState, BackHandler, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { useAuthStore, configureAuthStorage } from '@social-network/shared-stores';
import { mobileSecureStorage, useAppLock } from '@/shared/lib';
import { LoginScreen } from '@/pages/auth-login';
import { RegisterScreen } from '@/pages/auth-register';
import { ForgotPasswordScreen } from '@/pages/auth-forgot-password';
import { SecurityLockScreen } from '@/features/security';
import { WifiOff } from 'lucide-react-native';
import { FeedScreen } from '@/pages/feed';
import { getMobileApi } from '@/shared/api/client';

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
    [data-testid="mobile-feed"] [role="button"]:focus-visible,
    [data-testid="mobile-feed"] [role="tab"]:focus-visible,
    [data-testid="mobile-feed"] [role="link"]:focus-visible,
    [data-testid="mobile-feed"] textarea:focus-visible,
    [data-testid="feed-sheet"] [role="button"]:focus-visible,
    [data-testid="feed-sheet"] [role="tab"]:focus-visible,
    [data-testid="feed-sheet"] [role="link"]:focus-visible,
    [data-testid="feed-sheet"] input:focus-visible,
    [data-testid="feed-sheet"] textarea:focus-visible {
      outline: 2px solid #c084fc !important;
      outline-offset: 3px !important;
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

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: 0,
        networkMode: 'always',
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

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

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

    let metaTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'description';
      document.head.appendChild(metaTag);
    }
    metaTag.content = metaDescription;

    let robotsTag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.name = 'robots';
      document.head.appendChild(robotsTag);
    }
    // The mobile web shell contains account screens and a private, personalized feed.
    robotsTag.content = 'noindex, nofollow';
  }, [currentScreen, isAuthenticated]);

  // Keep splash screen visible until app is fully ready
  if (!appIsReady) {
    return null;
  }

  // 5. Security: Biometric App Lock (after 2 minutes in background)
  if (isLocked) {
    return <SecurityLockScreen onUnlock={unlock} />;
  }

  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" backgroundColor="#050505" />
        {!isOnline && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <WifiOff size={14} color="#fca5a5" />
            <Text style={styles.offlineBannerText}>
              You're offline. Loaded posts are still available.
            </Text>
          </View>
        )}
        <FeedScreen user={user} isOnline={isOnline} onSignOut={clearSession} />
      </SafeAreaView>
    );
  }

  // Unauthenticated Auth Screens
  return (
    <SafeAreaView style={styles.safeArea}>
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

function SessionQueries() {
  const [queryClient] = React.useState(() => {
    getMobileApi();
    return createQueryClient();
  });
  React.useEffect(() => () => queryClient.clear(), [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export function App() {
  const userId = useAuthStore((state) => state.user?.id);
  return (
    <SafeAreaProvider>
      <SessionQueries key={userId || 'signed-out'} />
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
