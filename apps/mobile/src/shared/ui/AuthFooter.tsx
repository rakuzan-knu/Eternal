import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export function AuthFooter() {
  const links = ['Privacy Policy', 'Terms of Service', 'Cookies', 'About', 'Help'];

  return (
    <View style={styles.footer} accessibilityRole={'contentinfo' as any}>
      <View style={styles.linksRow}>
        {links.map((link) => (
          <Pressable
            key={link}
            accessibilityRole="link"
            accessibilityLabel={link}
            accessibilityHint={`Opens ${link}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>{link}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.copyright} accessibilityRole="text">
        Eternal © 2026
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 'auto',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  linkButton: {
    minHeight: 28,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 11,
    color: '#737373',
    fontWeight: '500',
  },
  copyright: {
    fontSize: 11,
    color: '#525252',
  },
});
