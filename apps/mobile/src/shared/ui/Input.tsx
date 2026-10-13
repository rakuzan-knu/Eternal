import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  Platform,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { AlertCircle, X, ClipboardPaste } from 'lucide-react-native';
import { Pressable } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  showClearButton?: boolean;
  onClear?: () => void;
  pasteSuggestion?: string | null;
  onPasteSuggestion?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      showClearButton,
      onClear,
      pasteSuggestion,
      onPasteSuggestion,
      containerStyle,
      inputStyle,
      style,
      onFocus,
      onBlur,
      accessibilityLabel,
      accessibilityHint,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const hasError = Boolean(error);
    const innerRef = React.useRef<TextInput | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as TextInput);

    const handleContainerPress = () => {
      if (props.editable !== false) {
        innerRef.current?.focus();
      }
    };

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && (
          <Text style={styles.label} accessibilityRole="text">
            {label}
          </Text>
        )}

        <View
          style={[
            styles.inputContainer,
            isFocused && styles.focusedContainer,
            hasError && styles.errorContainer,
            props.editable === false && styles.disabledContainer,
            style,
          ]}
          onTouchEnd={handleContainerPress}
          {...(Platform.OS === 'web'
            ? {
                onClick: (e: any) => {
                  if (props.editable !== false && e.target !== innerRef.current) {
                    innerRef.current?.focus();
                  }
                },
              }
            : {})}
        >
          {leftElement && <View style={styles.leftSlot}>{leftElement}</View>}

          <TextInput
            ref={innerRef}
            placeholderTextColor="#737373"
            selectionColor="#a855f7"
            accessibilityLabel={accessibilityLabel || label || props.placeholder}
            accessibilityHint={accessibilityHint || hint}
            accessibilityState={{ disabled: props.editable === false }}
            aria-invalid={hasError}
            {...({ accessibilityInvalid: hasError } as any)}
            style={[styles.input, inputStyle]}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />

          {showClearButton && Boolean(props.value) && props.editable !== false && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear text"
              onPress={(e) => {
                e.stopPropagation?.();
                onClear?.();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}
            >
              <X size={14} color="#71717a" />
            </Pressable>
          )}

          {rightElement && <View style={styles.rightSlot}>{rightElement}</View>}
        </View>

        {pasteSuggestion && !props.value && onPasteSuggestion && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Paste ${pasteSuggestion} from clipboard`}
            onPress={onPasteSuggestion}
            style={styles.pasteBadge}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ClipboardPaste size={12} color="#c084fc" />
            <Text style={styles.pasteBadgeText} numberOfLines={1}>
              Paste: <Text style={styles.pasteBadgeHighlight}>{pasteSuggestion}</Text>
            </Text>
          </Pressable>
        )}

        {hasError ? (
          <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AlertCircle size={13} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={styles.hintText}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.85)',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'text' } as any) : {}),
  },
  focusedContainer: {
    borderColor: 'rgba(168, 85, 247, 0.7)',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  errorContainer: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  disabledContainer: {
    opacity: 0.45,
    backgroundColor: '#121214',
  },
  leftSlot: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSlot: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  input: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    color: '#f5f5f5',
    fontSize: 14,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          borderWidth: 0,
        } as any)
      : {}),
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginLeft: 2,
    gap: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    flex: 1,
  },
  hintText: {
    fontSize: 11,
    color: '#737373',
    marginTop: 4,
    marginLeft: 2,
  },
  pasteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    maxWidth: '100%',
  },
  pasteBadgeText: {
    fontSize: 11,
    color: '#a1a1aa',
  },
  pasteBadgeHighlight: {
    color: '#c084fc',
    fontWeight: '600',
  },
});
