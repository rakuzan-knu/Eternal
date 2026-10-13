import * as React from 'react';
import { View, StyleSheet, type ViewProps, type ViewStyle } from 'react-native';

export interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style, ...props }: GlassCardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      <View style={styles.topHighlight} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    width: '100%',
    backgroundColor: 'rgba(23, 23, 23, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 10,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
