import * as React from 'react';
import { Linking, View, Text, Pressable, StyleSheet } from 'react-native';
import { webOrigin } from '@/shared/api/client';
import { tr, useLanguage } from '@/shared/lib/i18n';

export function AuthFooter() {
  const language = useLanguage();
  const [failedUrl, setFailedUrl] = React.useState<string>();
  const links = [
    { label: tr('Privacy Policy'), path: '/privacy' },
    { label: tr('Terms of Service'), path: '/terms' },
    { label: 'Cookies', path: '/terms/cookie-policy' },
    { label: 'About', path: '/company' },
    { label: 'Help', path: '/safety' },
  ];

  async function openLink(path: string) {
    const url = `${webOrigin}${path}`;
    setFailedUrl(undefined);
    try {
      await Linking.openURL(url);
    } catch {
      setFailedUrl(url);
    }
  }

  return (
    <View style={styles.footer} role="contentinfo">
      <View style={styles.linksRow}>
        {links.map(({ label, path }) => (
          <Pressable
            key={path}
            onPress={() => void openLink(path)}
            accessibilityRole="link"
            accessibilityLabel={label}
            accessibilityHint={tr('Opens {name}', { name: label })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {failedUrl && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.linkError}>
          {language === 'uk' ? 'Не вдалося відкрити сторінку.' : 'Could not open the page.'}{' '}
          {failedUrl}
        </Text>
      )}
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
  linkError: {
    color: '#fca5a5',
    textAlign: 'center',
  },
  copyright: {
    fontSize: 11,
    color: '#525252',
  },
});
