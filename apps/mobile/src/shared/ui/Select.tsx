import * as React from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet, type ViewStyle } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

export interface SelectProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export const Select = React.forwardRef<View, SelectProps>(
  (
    {
      label,
      value,
      options,
      onChange,
      placeholder = 'Select...',
      error,
      hint,
      containerStyle,
      disabled = false,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const hasError = Boolean(error);

    const handleSelect = (option: string) => {
      onChange(option);
      setIsOpen(false);
    };

    return (
      <View ref={ref} style={[styles.wrapper, containerStyle]}>
        {label && (
          <Text style={styles.label} accessibilityRole="text">
            {label}
          </Text>
        )}

        <Pressable
          accessibilityRole="combobox"
          accessibilityLabel={label ? `${label}: ${value || placeholder}` : value || placeholder}
          accessibilityState={{ expanded: isOpen, disabled }}
          accessibilityHint="Double tap to open selection options"
          disabled={disabled}
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [
            styles.selectButton,
            isOpen && styles.openButton,
            hasError && styles.errorButton,
            disabled && styles.disabledButton,
            pressed && !disabled && styles.pressedButton,
          ]}
        >
          <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <ChevronDown
            size={16}
            color={isOpen ? '#c084fc' : '#a1a1aa'}
            style={isOpen ? styles.chevronRotated : undefined}
          />
        </Pressable>

        {hasError && <Text style={styles.errorText}>{error}</Text>}
        {!hasError && hint && <Text style={styles.hintText}>{hint}</Text>}

        {/* Option Selection Modal */}
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close options menu"
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {label ? `Select ${label}` : 'Select an option'}
                </Text>
              </View>

              <FlatList
                data={options}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                initialNumToRender={20}
                renderItem={({ item }) => {
                  const isSelected = item === value;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={item}
                      style={({ pressed }) => [
                        styles.optionItem,
                        isSelected && styles.optionSelected,
                        pressed && styles.optionPressed,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {item}
                      </Text>
                      {isSelected && <Check size={16} color="#c084fc" />}
                    </Pressable>
                  );
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  },
);

Select.displayName = 'Select';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
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
  selectButton: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(23, 23, 23, 0.85)',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  openButton: {
    borderColor: 'rgba(168, 85, 247, 0.7)',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  errorButton: {
    borderColor: '#ef4444',
  },
  disabledButton: {
    opacity: 0.45,
    backgroundColor: '#121214',
  },
  pressedButton: {
    backgroundColor: 'rgba(30, 30, 32, 0.95)',
  },
  valueText: {
    fontSize: 14,
    color: '#f5f5f5',
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: '#737373',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    marginTop: 5,
    marginLeft: 2,
  },
  hintText: {
    fontSize: 11,
    color: '#737373',
    marginTop: 4,
    marginLeft: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: 420,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  list: {
    maxHeight: 340,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(38, 38, 38, 0.4)',
  },
  optionSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  optionPressed: {
    backgroundColor: 'rgba(38, 38, 42, 0.6)',
  },
  optionText: {
    fontSize: 14,
    color: '#d4d4d8',
  },
  optionTextSelected: {
    color: '#c084fc',
    fontWeight: '600',
  },
});
