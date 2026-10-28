import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import type { ContentLanguage } from '../model/documents';
import { lazyTextCopy } from '../model/lazyText';
import { tr } from '@/shared/lib/i18n';

export function LazyFallback({
  lang,
  failed,
  onRetry,
  onBack,
}: {
  lang: ContentLanguage;
  failed: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const t = lazyTextCopy[lang];
  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
      </View>
      <View style={s.body}>
        {failed ? (
          <ErrorNotice message={t.failed} onRetry={onRetry} />
        ) : (
          <ActivityIndicator color={colors.purple} accessibilityLabel={t.loading} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  topBar: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4 },
  body: { padding: 24, alignItems: 'stretch' },
});
