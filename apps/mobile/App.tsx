import * as React from 'react';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore, useUIStore } from '@social-network/shared-stores';
import { formatRelativeTime, formatCompactNumber } from '@social-network/shared-utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'profile'>('feed');
  const { user, isAuthenticated } = useAuthStore();
  const { theme } = useUIStore();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={[styles.container, theme === 'dark' ? styles.darkBg : styles.lightBg]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌐 Social Network</Text>
          <Text style={styles.headerSubtitle}>Mobile Edition</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Expo + React Native Client</Text>
            <Text style={styles.cardBody}>
              Connected seamlessly to enterprise monorepo packages:
            </Text>
            <Text style={styles.featureItem}>• @shared/contracts (Zod Schemas)</Text>
            <Text style={styles.featureItem}>• @shared/stores (Zustand Auth & UI)</Text>
            <Text style={styles.featureItem}>• @shared/api-client (TanStack Query)</Text>
            <Text style={styles.featureItem}>• @shared/socket (WebRTC Mesh & Socket.IO)</Text>
            <Text style={styles.featureItem}>• @shared/crypto (Pure WebCrypto E2EE)</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Shared Utility Verification</Text>
            <Text style={styles.metricText}>
              Relative Time: {formatRelativeTime(new Date(Date.now() - 3600000))}
            </Text>
            <Text style={styles.metricText}>
              Engagement Formatted: {formatCompactNumber(1254300)} views
            </Text>
            <Text style={styles.metricText}>
              Auth State: {isAuthenticated ? `Logged in as ${user?.username}` : 'Guest session'}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'feed' && styles.navItemActive]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.navText, activeTab === 'feed' && styles.navTextActive]}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'chat' && styles.navItemActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.navText, activeTab === 'chat' && styles.navTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkBg: {
    backgroundColor: '#09090b',
  },
  lightBg: {
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f4f4f5',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#38bdf8',
    marginVertical: 2,
  },
  metricText: {
    fontSize: 13,
    color: '#e4e4e7',
    marginVertical: 3,
  },
  navBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#18181b',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
  },
  navText: {
    color: '#71717a',
    fontSize: 12,
  },
  navTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
