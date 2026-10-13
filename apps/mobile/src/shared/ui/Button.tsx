import * as React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
  type GestureResponderEvent,
} from 'react-native';
import { haptics } from '@/shared/lib';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'purple' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  style,
  textStyle,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = (e: any) => {
    if (isDisabled) return;
    haptics.light();
    onPress?.(e);
  };

  const spinnerColor =
    variant === 'primary'
      ? '#000000'
      : variant === 'outline' || variant === 'ghost'
        ? '#a855f7'
        : '#ffffff';

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            style={[styles.baseText, textVariantStyles[variant], textSizeStyles[size], textStyle]}
          >
            {title ?? children}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  md: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 50,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: {
    fontSize: 13,
  },
  md: {
    fontSize: 14,
  },
  lg: {
    fontSize: 14,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  secondary: {
    backgroundColor: 'rgba(23, 23, 23, 0.85)',
    borderColor: '#262626',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#262626',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  purple: {
    backgroundColor: '#9333ea',
    borderColor: '#a855f7',
  },
  danger: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
});

const textVariantStyles = StyleSheet.create({
  primary: {
    color: '#000000',
    fontWeight: '600',
  },
  secondary: {
    color: '#d4d4d4',
  },
  outline: {
    color: '#e4e4e7',
  },
  ghost: {
    color: '#a1a1aa',
  },
  purple: {
    color: '#ffffff',
  },
  danger: {
    color: '#ffffff',
  },
});
