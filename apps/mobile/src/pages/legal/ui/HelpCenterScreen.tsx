import * as React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronRight, FileText, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { colors, common, IconButton } from '../../feed/ui/primitives';
import {
  DOCUMENTS,
  loadSafetyCenter,
  SAFETY_HUB_KEYS,
  chrome,
  sentenceCase,
  type ContentLanguage,
  type DocumentGroup,
  type DocumentId,
} from '../model/documents';
import type { SafetyCenterTranslation } from '@social-network/shared-content';
import { useLazyText } from '../model/lazyText';
import { LazyFallback } from './LazyFallback';
import { tr } from '@/shared/lib/i18n';

const GROUPS: { id: DocumentGroup; Icon: typeof FileText }[] = [
  { id: 'rules', Icon: FileText },
  { id: 'privacy', Icon: LockKeyhole },
  { id: 'safety', Icon: ShieldCheck },
];

type HelpCenterProps = {
  lang: ContentLanguage;
  active: boolean;
  onBack: () => void;
  onOpenDocument: (id: DocumentId) => void;
  onOpenPath: (path: string) => void;
};

export function HelpCenterScreen(props: HelpCenterProps) {
  const query = useLazyText('safety-center', 'hub', props.lang, () => loadSafetyCenter(props.lang));
  if (!query.data)
    return (
      <LazyFallback
        lang={props.lang}
        failed={query.isError}
        onRetry={() => void query.refetch()}
        onBack={props.onBack}
      />
    );
  return <HelpCenterBody {...props} center={query.data} />;
}

function HelpCenterBody({
  center,
  lang,
  active,
  onBack,
  onOpenDocument,
  onOpenPath,
}: HelpCenterProps & { center: SafetyCenterTranslation }) {
  const t = chrome[lang];

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${t.helpTitle} • Eternal`;
  }, [active, t.helpTitle]);

  return (
    <View style={s.screen} testID="mobile-help-center">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.topTitle}>
          {t.helpTitle}
        </Text>
        <View style={s.topSpacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text style={s.title}>{sentenceCase(center.hero.title)}</Text>
          <Text style={s.lead}>{center.hero.subtitle}</Text>
        </View>

        {GROUPS.map(({ id, Icon }) => (
          <View key={id} style={s.block}>
            <Text accessibilityRole="header" style={s.groupTitle}>
              {t.groups[id]}
            </Text>
            <View style={s.surface}>
              {DOCUMENTS.filter((doc) => doc.group === id).map((doc, index) => (
                <React.Fragment key={doc.id}>
                  {index > 0 && <View style={s.divider} />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${doc.label[lang]}. ${doc.summary[lang]}`}
                    onPress={() => onOpenDocument(doc.id)}
                    style={({ pressed }) => [s.row, pressed && s.pressed]}
                  >
                    <Icon size={20} color={colors.muted} />
                    <View style={common.flex}>
                      <Text style={s.rowTitle}>{doc.label[lang]}</Text>
                      <Text style={common.muted}>{doc.summary[lang]}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.muted} />
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={s.block}>
          <Text accessibilityRole="header" style={s.groupTitle}>
            {t.resources}
          </Text>
          <View style={s.surface}>
            {SAFETY_HUB_KEYS.map((key, index) => {
              const hub = center[key];
              return (
                <React.Fragment key={key}>
                  {index > 0 && <View style={s.resourceDivider} />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${sentenceCase(hub.heading)}. ${hub.description}`}
                    onPress={() => onOpenPath(hub.link)}
                    style={({ pressed }) => [s.row, s.resourceRow, pressed && s.pressed]}
                  >
                    <View style={common.flex}>
                      <Text style={s.rowTitle}>{sentenceCase(hub.heading)}</Text>
                      <Text style={common.muted} numberOfLines={2}>
                        {hub.description}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.muted} />
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topSpacer: { width: 44 },
  topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40, gap: 28 },
  hero: { gap: 8 },
  title: { color: colors.text, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  lead: { color: colors.text, fontSize: 15, lineHeight: 23, opacity: 0.85 },
  block: { gap: 10 },
  groupTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  surface: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 50 },
  resourceDivider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resourceRow: { gap: 12 },
  pressed: { backgroundColor: '#ffffff08' },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
