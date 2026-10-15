import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@social-network/shared-stores';
import { Button, GlassCard } from '@/shared/ui';
import { Lock, ScanFace, LogOut } from 'lucide-react-native';

export interface SecurityLockScreenProps {
  onUnlock: () => void;
}

export function SecurityLockScreen({ onUnlock }: SecurityLockScreenProps) {
  const { user, clearSession } = useAuthStore();
  const [unlocking, setUnlocking] = React.useState(false);

  // Auto-prompt biometrics when lock screen mounts
  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      setUnlocking(true);
      try {
        await onUnlock();
      } finally {
        if (active) setUnlocking(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [onUnlock]);

  const handleManualUnlock = async () => {
    setUnlocking(true);
    try {
      await onUnlock();
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.ambientGlow} />

      <GlassCard style={styles.card}>
        <View style={styles.iconCircle}>
          <Lock size={32} color="#c084fc" />
        </View>

        <Text style={styles.title}>Eternal Locked</Text>
        <Text style={styles.subtitle}>
          The app was locked for your security after being in the background.
        </Text>

        {user && (
          <View style={styles.userBadge}>
            <Text style={styles.userName}>{user.displayName || user.username}</Text>
            <Text style={styles.userHandle}>@{user.username}</Text>
          </View>
        )}

        <Button
          title="Unlock with Biometrics"
          variant="primary"
          size="lg"
          loading={unlocking}
          leftIcon={<ScanFace size={18} color="#000000" />}
          onPress={handleManualUnlock}
          accessibilityLabel="Unlock with Biometrics"
          accessibilityHint="Requests Face ID or Touch ID authentication"
          style={styles.unlockBtn}
        />

        <Button
          title="Log Out"
          variant="ghost"
          size="md"
          leftIcon={<LogOut size={16} color="#71717a" />}
          onPress={clearSession}
          accessibilityLabel="Log Out"
          accessibilityHint="Signs out from current account"
          style={styles.logoutBtn}
          textStyle={styles.logoutText}
        />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  ambientGlow: {
    position: 'absolute',
    top: '30%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    filter: 'blur(60px)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  userBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
    width: '100%',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  userHandle: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  unlockBtn: {
    marginBottom: 10,
  },
  logoutBtn: {
    marginTop: 4,
  },
  logoutText: {
    color: '#71717a',
  },
});
