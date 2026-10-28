import * as React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Quote,
  X,
} from 'lucide-react-native';
import { Button } from '@/shared/ui';
import { copyText } from '@/shared/lib/clipboard';
import { colors, common, IconButton } from '../../feed/ui/primitives';
import type { ContentLanguage } from '../../legal/model/documents';
import {
  loadContentPage,
  type ContentBlock,
  type ContentCard,
  type ContentPage,
  type ContentPageId,
} from '../model/content';
import { useLazyText } from '../../legal/model/lazyText';
import { LazyFallback } from '../../legal/ui/LazyFallback';
import { resolveContentPath, type ContentTarget } from '../model/routing';
import { tr } from '@/shared/lib/i18n';

const labels = {
  en: { more: 'Read more', less: 'Show less', copied: 'Copied', copy: 'Copy' },
  uk: { more: 'Детальніше', less: 'Згорнути', copied: 'Скопійовано', copy: 'Копіювати' },
} satisfies Record<ContentLanguage, Record<string, string>>;

type ContentScreenProps = {
  pageId: ContentPageId;
  lang: ContentLanguage;
  active: boolean;
  onBack: () => void;
  onNavigate: (target: ContentTarget) => void;
};

export function ContentScreen(props: ContentScreenProps) {
  const query = useLazyText('content', props.pageId, props.lang, () =>
    loadContentPage(props.pageId, props.lang),
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
  return <ContentBody {...props} page={query.data} />;
}

function ContentBody({
  page,
  lang,
  active,
  onBack,
  onNavigate,
}: ContentScreenProps & { page: ContentPage }) {
  const open = React.useCallback(
    (path: string) => onNavigate(resolveContentPath(path)),
    [onNavigate],
  );

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${page.title} • Eternal`;
  }, [active, page.title]);

  return (
    <View style={s.screen} testID="mobile-content">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text style={s.topTitle} numberOfLines={1}>
          {page.title}
        </Text>
        <View style={s.topSpacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text accessibilityRole="header" style={s.title}>
            {page.title}
          </Text>
          {!!page.lead && <Text style={s.lead}>{page.lead}</Text>}
        </View>
        {page.blocks.map((block, index) => (
          <Block key={index} block={block} lang={lang} onOpen={open} />
        ))}
      </ScrollView>
    </View>
  );
}

function Heading({ title, intro }: { title?: string; intro?: string }) {
  if (!title && !intro) return null;
  return (
    <View style={s.heading}>
      {!!title && (
        <Text accessibilityRole="header" style={s.blockTitle}>
          {title}
        </Text>
      )}
      {!!intro && <Text style={s.intro}>{intro}</Text>}
    </View>
  );
}

function Block({
  block,
  lang,
  onOpen,
}: {
  block: ContentBlock;
  lang: ContentLanguage;
  onOpen: (path: string) => void;
}) {
  switch (block.kind) {
    case 'cards':
      return (
        <View style={s.block}>
          <Heading title={block.title} intro={block.intro} />
          <View style={s.stack}>
            {block.items.map((card) => (
              <Card key={card.id} card={card} lang={lang} onOpen={onOpen} />
            ))}
          </View>
        </View>
      );
    case 'faq':
      return (
        <View style={s.block}>
          <Heading title={block.title} intro={block.intro} />
          <View style={s.surface}>
            {block.items.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <View style={s.divider} />}
                <Disclosure title={item.question}>
                  <Text style={s.paragraph}>{item.answer}</Text>
                </Disclosure>
              </React.Fragment>
            ))}
          </View>
        </View>
      );
    case 'text':
      return (
        <View style={s.block}>
          <Heading title={block.title} />
          {block.paragraphs.filter(Boolean).map((paragraph, index) => (
            <Text key={index} style={s.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      );
    case 'quote':
      return (
        <View style={s.quote}>
          <Quote size={22} color={colors.purple} />
          <Text style={s.quoteText}>{block.quote}</Text>
          <Text style={common.title}>{block.author}</Text>
          {!!block.role && <Text style={common.muted}>{block.role}</Text>}
        </View>
      );
    case 'timeline':
      return (
        <View style={s.block}>
          <Heading title={block.title} intro={block.intro} />
          {block.items.map((item, index) => (
            <View key={index} style={s.milestone}>
              <View style={s.rail}>
                <View style={s.dot} />
                {index < block.items.length - 1 && <View style={s.line} />}
              </View>
              <View style={[common.flex, s.milestoneBody]}>
                <Text style={s.eyebrow}>
                  {item.date}
                  {item.badge ? ` · ${item.badge}` : ''}
                </Text>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.paragraph}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case 'swatches':
      return (
        <View style={s.block}>
          <Heading title={block.title} intro={block.intro} />
          <View style={s.surface}>
            {block.items.map((swatch, index) => (
              <React.Fragment key={swatch.hex + index}>
                {index > 0 && <View style={s.divider} />}
                <Swatch swatch={swatch} lang={lang} />
              </React.Fragment>
            ))}
          </View>
        </View>
      );
    case 'dosDonts':
      return (
        <View style={s.block}>
          <Heading title={block.title} intro={block.intro} />
          {[
            { ...block.dos, good: true },
            { ...block.donts, good: false },
          ].map((group) => (
            <View key={group.title} style={s.surfacePadded}>
              <Text style={common.title}>{group.title}</Text>
              {group.items.map((item, index) => (
                <View key={index} style={s.listRow}>
                  {group.good ? (
                    <Check size={16} color={colors.green} />
                  ) : (
                    <X size={16} color={colors.danger} />
                  )}
                  <Text style={[s.paragraph, common.flex]}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'links':
      return (
        <View style={s.block}>
          <Heading title={block.title} intro={block.intro} />
          <View style={s.surface}>
            {block.items.map((item, index) => (
              <React.Fragment key={item.path + index}>
                {index > 0 && <View style={s.divider} />}
                <LinkRow label={item.label} text={item.text} path={item.path} onOpen={onOpen} />
              </React.Fragment>
            ))}
          </View>
        </View>
      );
    case 'cta':
      return (
        <View style={s.cta}>
          <Text style={s.blockTitle}>{block.title}</Text>
          {!!block.text && <Text style={s.paragraph}>{block.text}</Text>}
          <Button
            title={block.label}
            variant="secondary"
            fullWidth={false}
            onPress={() => onOpen(block.path)}
          />
        </View>
      );
  }
}

function linkHint(target: ContentTarget) {
  if (target.kind === 'external') return 'Opens in your browser';
  if (target.kind === 'web') return tr('Opens in the web app');
  return undefined;
}

function LinkRow({
  label,
  text,
  path,
  onOpen,
}: {
  label: string;
  text?: string;
  path: string;
  onOpen: (path: string) => void;
}) {
  const target = resolveContentPath(path);
  const leaves = target.kind === 'web' || target.kind === 'external';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={text ? `${label}. ${text}` : label}
      accessibilityHint={linkHint(target)}
      onPress={() => onOpen(path)}
      style={({ pressed }) => [s.linkRow, pressed && s.pressed]}
    >
      <View style={common.flex}>
        <Text style={s.cardTitle}>{label}</Text>
        {!!text && (
          <Text style={common.muted} numberOfLines={2}>
            {text}
          </Text>
        )}
      </View>
      {leaves ? (
        <ExternalLink size={16} color={colors.muted} />
      ) : (
        <ChevronRight size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

const Card = React.memo(function Card({
  card,
  lang,
  onOpen,
}: {
  card: ContentCard;
  lang: ContentLanguage;
  onOpen: (path: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const body = (
    <>
      {!!card.eyebrow && <Text style={s.eyebrow}>{card.eyebrow}</Text>}
      <Text style={s.cardTitle}>{card.title}</Text>
      {!!card.text && <Text style={s.paragraph}>{card.text}</Text>}
      {!!card.meta?.length && <Text style={common.muted}>{card.meta.join(' · ')}</Text>}
    </>
  );
  if (card.link) {
    const link = card.link;
    const target = resolveContentPath(link);
    const leaves = target.kind === 'web' || target.kind === 'external';
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityHint={linkHint(target)}
        onPress={() => onOpen(link)}
        style={({ pressed }) => [s.card, s.cardRow, pressed && s.pressed]}
      >
        <View style={[common.flex, s.cardBody]}>{body}</View>
        {leaves ? (
          <ExternalLink size={16} color={colors.muted} />
        ) : (
          <ChevronRight size={18} color={colors.muted} />
        )}
      </Pressable>
    );
  }
  return (
    <View style={s.card}>
      <View style={s.cardBody}>{body}</View>
      {card.details && (
        <>
          {expanded && (
            <View style={s.details}>
              {!!card.details.overview && <Text style={s.paragraph}>{card.details.overview}</Text>}
              {card.details.lists
                .filter((list) => list.items.length)
                .map((list) => (
                  <View key={list.title} style={s.detailList}>
                    <Text style={common.title}>{list.title}</Text>
                    {list.items.map((item, index) => (
                      <View key={index} style={s.listRow}>
                        <Text style={s.bulletMark}>•</Text>
                        <Text style={[s.paragraph, common.flex]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            aria-expanded={expanded}
            onPress={() => setExpanded((value) => !value)}
            style={({ pressed }) => [s.more, pressed && common.pressed]}
          >
            <Text style={s.moreText}>{expanded ? labels[lang].less : labels[lang].more}</Text>
            <View style={expanded && s.flipped}>
              <ChevronDown size={16} color="#d8b4fe" />
            </View>
          </Pressable>
        </>
      )}
    </View>
  );
});

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [s.disclosure, pressed && s.pressed]}
      >
        <Text style={[s.cardTitle, common.flex]}>{title}</Text>
        <View style={open && s.flipped}>
          <ChevronDown size={18} color={colors.muted} />
        </View>
      </Pressable>
      {open && <View style={s.disclosureBody}>{children}</View>}
    </View>
  );
}

function Swatch({
  swatch,
  lang,
}: {
  swatch: { name: string; hex: string; text: string };
  lang: ContentLanguage;
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${swatch.name}, ${swatch.hex}`}
      accessibilityHint={labels[lang].copy}
      onPress={() => {
        copyText(swatch.hex)
          .then(() => setCopied(true))
          .catch(() => setCopied(false));
      }}
      style={({ pressed }) => [s.swatchRow, pressed && s.pressed]}
    >
      <View style={[s.swatch, { backgroundColor: swatch.hex }]} />
      <View style={common.flex}>
        <Text style={s.cardTitle}>{swatch.name}</Text>
        <Text style={common.muted} numberOfLines={2}>
          {swatch.text}
        </Text>
      </View>
      <View style={s.hex}>
        {copied ? (
          <Check size={14} color={colors.green} />
        ) : (
          <Copy size={14} color={colors.muted} />
        )}
        <Text style={s.hexText} accessibilityLiveRegion="polite">
          {copied ? labels[lang].copied : swatch.hex.toUpperCase()}
        </Text>
      </View>
    </Pressable>
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
  content: { padding: 16, paddingBottom: 40, gap: 32 },
  hero: { gap: 10, paddingTop: 8 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  lead: { color: colors.text, fontSize: 16, lineHeight: 25, opacity: 0.88 },
  block: { gap: 12 },
  heading: { gap: 4 },
  blockTitle: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  stack: { gap: 10 },
  surface: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  surfacePadded: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 14 },
  cardBody: { padding: 16, gap: 6 },
  eyebrow: { color: '#d8b4fe', fontSize: 13, fontWeight: '600' },
  cardTitle: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  paragraph: { color: colors.text, fontSize: 15, lineHeight: 23, opacity: 0.88 },
  pressed: { backgroundColor: '#ffffff08' },
  details: { gap: 14, paddingHorizontal: 16, paddingBottom: 4 },
  detailList: { gap: 6 },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletMark: { color: colors.purple, fontSize: 15, lineHeight: 23 },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moreText: { color: '#d8b4fe', fontSize: 14, fontWeight: '600' },
  flipped: { transform: [{ rotate: '180deg' }] },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disclosureBody: { paddingHorizontal: 16, paddingBottom: 16 },
  quote: {
    gap: 8,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#a855f712',
    borderLeftWidth: 3,
    borderLeftColor: colors.purple,
  },
  quoteText: { color: colors.text, fontSize: 17, lineHeight: 26, fontStyle: 'italic' },
  milestone: { flexDirection: 'row', gap: 14 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.purple, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: '#a855f740', marginTop: 4 },
  milestoneBody: { gap: 4, paddingBottom: 20 },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  swatch: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff26' },
  hex: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hexText: { color: colors.muted, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cta: {
    gap: 10,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'flex-start',
  },
});
