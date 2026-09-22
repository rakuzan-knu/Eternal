import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Eye, EyeOff, CheckCircle2, XCircle, ArrowBigUp } from 'lucide-react-native';
import { Input, type InputProps } from './Input';
import type { PasswordStrength } from '@social-network/shared-contracts';

export interface PasswordStrengthInfo {
  strength: PasswordStrength;
  score: number;
  feedback?: string[];
}

export interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry' | 'rightElement'> {
  showStrengthMeter?: boolean;
  strengthInfo?: PasswordStrengthInfo;
  showRequirementsChecklist?: boolean;
  passwordValue?: string;
}

const strengthColors: Record<PasswordStrength, string> = {
  weak: '#ef4444',
  fair: '#f59e0b',
  good: '#3b82f6',
  strong: '#10b981',
};

const strengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

export const PasswordInput = React.forwardRef<TextInput, PasswordInputProps>(
  (
    {
      showStrengthMeter = false,
      strengthInfo,
      showRequirementsChecklist = false,
      passwordValue,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isCapsLockOn, setIsCapsLockOn] = React.useState(false);

    // Enterprise Security: auto-hide revealed password after 30 seconds
    React.useEffect(() => {
      if (!showPassword) return;
      const timer = setTimeout(() => setShowPassword(false), 30000);
      return () => clearTimeout(timer);
    }, [showPassword]);

    // Detect Caps Lock on Web & hardware keyboards
    React.useEffect(() => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;

      const handleKeyEvent = (e: KeyboardEvent) => {
        if (typeof e.getModifierState === 'function') {
          setIsCapsLockOn(e.getModifierState('CapsLock'));
        }
      };

      window.addEventListener('keydown', handleKeyEvent);
      window.addEventListener('keyup', handleKeyEvent);
      return () => {
        window.removeEventListener('keydown', handleKeyEvent);
        window.removeEventListener('keyup', handleKeyEvent);
      };
    }, []);

    const val =
      typeof passwordValue === 'string' && passwordValue.length > 0
        ? passwordValue
        : typeof props.value === 'string'
          ? props.value
          : '';

    // Requirement 1: 8+ characters (empty -> partial (1-7) -> complete (8+))
    const lengthStatus: 'empty' | 'partial' | 'complete' =
      val.length === 0 ? 'empty' : val.length >= 8 ? 'complete' : 'partial';

    // Requirement 2: Latin letters (A-Z, a-z). Red if non-Latin letters detected!
    const hasNonLatinLetter =
      /[а-яА-ЯёЁ]/.test(val) ||
      Array.from(val).some((ch) => /\p{L}/u.test(ch) && !/[a-zA-Z]/.test(ch));

    const hasLatinLower = /[a-z]/.test(val);
    const hasLatinUpper = /[A-Z]/.test(val);

    const casesStatus: 'empty' | 'partial' | 'complete' | 'error' =
      val.length === 0
        ? 'empty'
        : hasNonLatinLetter
          ? 'error'
          : !hasLatinLower && !hasLatinUpper
            ? 'empty'
            : hasLatinLower && hasLatinUpper
              ? 'complete'
              : 'partial';

    // Requirement 3: Number or symbol (digits or special characters, NEVER letters in any language)
    const hasDigit = /[0-9]/.test(val);
    const hasSpecial = /[^\p{L}\s0-9]/u.test(val) || /[^a-zA-Zа-яА-ЯёЁ0-9\s]/.test(val);
    const specialStatus: 'empty' | 'partial' | 'complete' =
      val.length === 0 || (!hasDigit && !hasSpecial) ? 'empty' : 'complete';

    const renderRequirementItem = (
      label: string,
      status: 'empty' | 'partial' | 'complete' | 'error',
    ) => {
      let icon = <View style={styles.emptyDot} />;
      let textStyle: StyleProp<TextStyle> = undefined;

      if (status === 'complete') {
        icon = <CheckCircle2 size={13} color="#10b981" />;
        textStyle = styles.checklistTextActive;
      } else if (status === 'error') {
        icon = <XCircle size={13} color="#ef4444" />;
        textStyle = styles.checklistTextError;
      } else if (status === 'partial') {
        icon = (
          <View style={styles.partialDotOuter}>
            <View style={styles.partialDotInner} />
          </View>
        );
        textStyle = styles.checklistTextPartial;
      }

      return (
        <View style={styles.checklistItem}>
          {icon}
          <Text style={[styles.checklistText, textStyle]}>{label}</Text>
        </View>
      );
    };

    return (
      <View style={styles.wrapper}>
        <Input
          ref={ref}
          {...props}
          keyboardType="ascii-capable"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          rightElement={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityHint="Toggles visibility of password characters"
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {showPassword ? (
                <EyeOff size={18} color="#a1a1aa" />
              ) : (
                <Eye size={18} color="#a1a1aa" />
              )}
            </Pressable>
          }
        />

        {isCapsLockOn && (
          <View
            style={styles.capsLockRow}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <ArrowBigUp size={13} color="#eab308" />
            <Text style={styles.capsLockText}>Caps Lock is on</Text>
          </View>
        )}

        {showRequirementsChecklist && (
          <View style={styles.checklistContainer} accessibilityRole="summary">
            {renderRequirementItem('8+ characters', lengthStatus)}
            {renderRequirementItem('Latin letters (A-Z, a-z)', casesStatus)}
            {renderRequirementItem('Number or symbol', specialStatus)}
          </View>
        )}

        {showStrengthMeter && strengthInfo && (
          <View
            style={styles.strengthContainer}
            accessibilityRole="summary"
            accessibilityLabel={`Password strength: ${strengthLabels[strengthInfo.strength]}`}
          >
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthTitle}>Password strength</Text>
              <Text
                style={[styles.strengthBadge, { color: strengthColors[strengthInfo.strength] }]}
              >
                {strengthLabels[strengthInfo.strength]}
              </Text>
            </View>

            <View style={styles.meterTrack} accessible={false}>
              {[1, 2, 3, 4].map((step) => {
                const active = strengthInfo.score >= step;
                return (
                  <View
                    key={step}
                    style={[
                      styles.meterBar,
                      {
                        backgroundColor: active ? strengthColors[strengthInfo.strength] : '#27272a',
                      },
                    ]}
                  />
                );
              })}
            </View>

            {strengthInfo.feedback && strengthInfo.feedback.length > 0 && (
              <Text style={styles.feedbackText}>Suggestion: {strengthInfo.feedback[0]}</Text>
            )}
          </View>
        )}
      </View>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthContainer: {
    marginTop: -8,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  strengthTitle: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  strengthBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  meterTrack: {
    flexDirection: 'row',
    height: 4,
    gap: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  meterBar: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  feedbackText: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
  },
  capsLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  capsLockText: {
    fontSize: 11,
    color: '#eab308',
    fontWeight: '500',
  },
  checklistContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: -6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  emptyDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1.5,
    borderColor: '#52525b',
    backgroundColor: 'transparent',
  },
  partialDotOuter: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1.5,
    borderColor: '#facc15',
    backgroundColor: 'rgba(234, 179, 8, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partialDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#facc15',
  },
  checklistText: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  checklistTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  checklistTextPartial: {
    color: '#facc15',
    fontWeight: '600',
  },
  checklistTextError: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
