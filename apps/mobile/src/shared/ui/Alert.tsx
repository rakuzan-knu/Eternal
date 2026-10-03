import * as React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react-native';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  style?: ViewStyle;
}

const variantConfig = {
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.28)',
    color: '#ef4444',
    text: '#fca5a5',
    Icon: AlertCircle,
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    color: '#10b981',
    text: '#6ee7b7',
    Icon: CheckCircle2,
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    color: '#f59e0b',
    text: '#fcd34d',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'rgba(147, 51, 234, 0.12)',
    border: 'rgba(147, 51, 234, 0.28)',
    color: '#a855f7',
    text: '#d8b4fe',
    Icon: Info,
  },
};

export function Alert({ variant = 'error', title, children, onDismiss, style }: AlertProps) {
  const config = variantConfig[variant];
  const IconComponent = config.Icon;

  return (
    <View
      style={[styles.container, { backgroundColor: config.bg, borderColor: config.border }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconContainer} accessible={false}>
        <IconComponent size={16} color={config.color} />
      </View>

      <View style={styles.textContainer}>
        {title && <Text style={styles.title}>{title}</Text>}
        {typeof children === 'string' ? (
          <Text style={[styles.message, { color: config.text }]}>{children}</Text>
        ) : (
          children
        )}
      </View>

      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss alert"
          accessibilityHint="Closes this alert message"
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={8}
        >
          <X size={14} color="#a1a1aa" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  iconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
