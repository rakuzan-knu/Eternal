import * as React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ArrowUp, ChevronDown, ExternalLink, Info } from 'lucide-react-native';
import { openWebSection } from '../../feed/ui/FeedDock';
import { colors, common, IconButton } from '../../feed/ui/primitives';
import {
  chrome,
  findDocument,
  loadDocument,
  type ContentLanguage,
  type DocumentId,
  type DocumentSection,
  type LegalDocument,
} from '../model/documents';
import { useLazyText } from '../model/lazyText';
import { LazyFallback } from './LazyFallback';
import { tr } from '@/shared/lib/i18n';

type DocumentScreenProps = {
  documentId: DocumentId;
  lang: ContentLanguage;
  active: boolean;
  onBack: () => void;
  onNavigationError: (failed: boolean) => void;
};

export function DocumentScreen(props: DocumentScreenProps) {
  const query = useLazyText('document', props.documentId, props.lang, () =>
    loadDocument(props.documentId, props.lang),
  );
  if (!query.data)
    return (
      <LazyFallback
        lang={props.lang}
        failed={query.isError}
        onRetry={() => void query.refetch()}
        onBack={props.onBack}
      />
    );
  return <DocumentBody {...props} doc={query.data} />;
}

function DocumentBody({
  doc,
  documentId,
  lang,
  active,
  onBack,
  onNavigationError,
}: DocumentScreenProps & { doc: LegalDocument }) {
  const t = chrome[lang];
  const scroll = React.useRef<ScrollView>(null);
  const content = React.useRef<View>(null);
  const sectionRefs = React.useRef(new Map<string, View>());
  const [contentsOpen, setContentsOpen] = React.useState(false);

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${doc.title} • Eternal`;
  }, [active, doc.title]);

  const jumpTo = (id: string) => {
    const target = sectionRefs.current.get(id);
    if (!target || !content.current) return;
    target.measureLayout(content.current, (_x, y) =>
      scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }),
    );
  };

  return (
    <View style={s.screen} testID="mobile-document">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text style={s.topTitle} numberOfLines={1}>
          {doc.title}
        </Text>
        <View style={s.topSpacer} />
      </View>
      <ScrollView ref={scroll}>
        <View ref={content} style={s.content}>
          <View style={s.hero}>
            <Text accessibilityRole="header" style={s.title}>
              {doc.title}
            </Text>
            {doc.dates.map((date) => (
              <Text key={date} style={common.muted}>
                {date}
              </Text>
            ))}
            {!!doc.description && <Text style={s.lead}>{doc.description}</Text>}
          </View>

          <View style={s.contents}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: contentsOpen }}
              aria-expanded={contentsOpen}
              onPress={() => setContentsOpen((open) => !open)}
              style={({ pressed }) => [s.contentsHeader, pressed && common.pressed]}
            >
              <Text style={[common.title, common.flex]}>{t.contents}</Text>
              <Text style={common.muted}>{t.sectionCount(doc.sections.length)}</Text>
              <View style={contentsOpen && s.flipped}>
                <ChevronDown size={18} color={colors.muted} />
              </View>
            </Pressable>
            {contentsOpen &&
              doc.sections.map((section) => (
                <Pressable
                  key={section.id}
                  accessibilityRole="link"
                  accessibilityLabel={`${section.number}. ${section.title}`}
                  onPress={() => jumpTo(section.id)}
                  style={({ pressed }) => [s.contentsItem, pressed && common.pressed]}
                >
                  <Text style={s.contentsNumber}>{section.number}</Text>
                  <Text style={[common.text, common.flex]}>{section.title}</Text>
                </Pressable>
              ))}
          </View>

          {doc.sections.map((section) => (
            <View
              key={section.id}
              ref={(node) => {
                if (node) sectionRefs.current.set(section.id, node);
                else sectionRefs.current.delete(section.id);
              }}
            >
              <Section section={section} inShort={t.inShort} />
            </View>
          ))}

          <View style={s.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })}
              style={({ pressed }) => [s.footerAction, pressed && common.pressed]}
            >
              <ArrowUp size={18} color={colors.text} />
              <Text style={common.text}>{t.backToTop}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityHint={tr('Opens in the web app')}
              onPress={() =>
                void openWebSection(findDocument(documentId).webPath, onNavigationError)
              }
              style={({ pressed }) => [s.footerAction, pressed && common.pressed]}
            >
              <ExternalLink size={18} color={colors.text} />
              <Text style={common.text}>{t.openOnWeb}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const Section = React.memo(function Section({
  section,
  inShort,
}: {
  section: DocumentSection;
  inShort: string;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionNumber}>{section.number}</Text>
        <Text accessibilityRole="header" style={s.sectionTitle}>
          {section.title}
        </Text>
      </View>
      {!!section.tldr && (
        <View style={s.tldr}>
          <Text style={s.tldrLabel}>{inShort}</Text>
          <Text style={common.text}>{section.tldr}</Text>
        </View>
      )}
      {section.subsections.map((sub) => (
        <View key={sub.id} style={s.subsection}>
          <Text accessibilityRole="header" style={s.subTitle}>
            {sub.title}
          </Text>
          {sub.content.map((paragraph, index) => (
            <Text key={index} style={s.paragraph} selectable>
              {paragraph}
            </Text>
          ))}
          {sub.bullets?.map((bullet, index) => (
            <View key={index} style={s.bullet}>
              <Text style={s.bulletMark}>•</Text>
              <Text style={[s.paragraph, common.flex]} selectable>
                {bullet}
              </Text>
            </View>
          ))}
          {sub.steps?.map((step) => (
            <View key={step.stepNumber} style={s.step}>
              <View style={s.stepNumber}>
                <Text style={s.stepNumberText}>{step.stepNumber}</Text>
              </View>
              <View style={common.flex}>
                <Text style={common.title}>{step.title}</Text>
                <Text style={s.paragraph}>{step.description}</Text>
              </View>
            </View>
          ))}
          {!!sub.tip && (
            <View style={s.tip}>
              <Info size={16} color={colors.purple} />
              <Text style={[s.paragraph, common.flex]}>{sub.tip}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
});

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
  content: { padding: 20, paddingBottom: 40, gap: 28 },
  hero: { gap: 6 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700', marginBottom: 4 },
  lead: { color: colors.text, fontSize: 16, lineHeight: 25, marginTop: 8, opacity: 0.9 },
  contents: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  contentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  flipped: { transform: [{ rotate: '180deg' }] },
  contentsItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contentsNumber: {
    width: 24,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  section: { gap: 16 },
  sectionHeader: { flexDirection: 'row', gap: 12, alignItems: 'baseline' },
  sectionNumber: {
    color: colors.purple,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: { flex: 1, color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  tldr: {
    gap: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#a855f712',
    borderLeftWidth: 3,
    borderLeftColor: colors.purple,
  },
  tldrLabel: { color: '#d8b4fe', fontSize: 13, fontWeight: '700' },
  subsection: { gap: 8 },
  subTitle: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  paragraph: { color: colors.text, fontSize: 15, lineHeight: 24, opacity: 0.88 },
  bullet: { flexDirection: 'row', gap: 10, paddingLeft: 4 },
  bulletMark: { color: colors.purple, fontSize: 15, lineHeight: 24 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#a855f71f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#d8b4fe', fontWeight: '700', fontVariant: ['tabular-nums'] },
  tip: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
});
