import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StoryOverlay, TextOverlay } from '@social-network/shared-contracts';
import {
  makeOverlay,
  safeStoryLink,
  STORY_ANIMATIONS,
  STORY_COLORS,
  STORY_FONTS,
  STORY_TEXT_BACKGROUNDS,
} from '../model/storyEditor';
import {
  StoryToolPanel,
  StoryField,
  StoryChoices,
  StoryColorPicker,
  StoryRange,
} from './StoryToolPanel';
import { common, ErrorNotice } from './primitives';
import { StoryText } from './StoryCanvas';
import { Button } from '@/shared/ui';
import { tr } from '@/shared/lib/i18n';

export function StoryTextEditor({
  initial,
  width,
  onSave,
  onClose,
}: {
  initial?: TextOverlay;
  width: number;
  onSave: (overlay: TextOverlay) => void;
  onClose: () => void;
}) {
  const [layer, setLayer] = React.useState(
    () =>
      initial ||
      makeOverlay({
        type: 'text',
        text: '',
        fontFamily: 'modern',
        fontSizeCqw: 6.5,
        yPercent: 45,
        fontStyle: 'normal',
        animation: 'none',
      }),
  );
  if (layer.type !== 'text') return null;
  return (
    <StoryToolPanel
      title={tr('Text')}
      onClose={onClose}
      onSave={() => onSave(layer)}
      saveDisabled={!layer.text.trim()}
    >
      <StoryText overlay={layer} width={width} />
      <StoryField
        label={tr('Story text')}
        value={layer.text}
        onChange={(text) => setLayer({ ...layer, text })}
        maxLength={2000}
        multiline
      />
      <StoryChoices
        label={tr('Font')}
        values={STORY_FONTS}
        value={STORY_FONTS.find((font) => font === layer.fontFamily) || 'modern'}
        onChange={(fontFamily) => setLayer({ ...layer, fontFamily })}
      />
      <StoryRange
        label={tr('Text size')}
        value={layer.fontSizeCqw || 6.5}
        min={3.5}
        max={12}
        step={0.5}
        onChange={(fontSizeCqw) => setLayer({ ...layer, fontSizeCqw })}
      />
      <StoryChoices
        label={tr('Alignment')}
        values={['left', 'center', 'right'] as const}
        value={layer.textAlign}
        onChange={(textAlign) => setLayer({ ...layer, textAlign })}
      />
      <StoryChoices
        label={tr('Font style')}
        values={['normal', 'italic'] as const}
        value={layer.fontStyle || 'normal'}
        onChange={(fontStyle) => setLayer({ ...layer, fontStyle })}
      />
      <StoryColorPicker
        label={tr('Text color')}
        value={layer.color}
        colors={STORY_COLORS}
        onChange={(color) => setLayer({ ...layer, color })}
      />
      <StoryChoices
        label={tr('Text background')}
        values={STORY_TEXT_BACKGROUNDS}
        value={layer.backgroundStyle}
        onChange={(backgroundStyle) => setLayer({ ...layer, backgroundStyle })}
      />
      {layer.backgroundStyle !== 'none' && (
        <StoryColorPicker
          label={tr('Background color')}
          value={layer.backgroundColor || '#000000'}
          colors={STORY_COLORS}
          onChange={(backgroundColor) => setLayer({ ...layer, backgroundColor })}
        />
      )}
      <StoryChoices
        label={tr('Animation')}
        values={STORY_ANIMATIONS}
        value={layer.animation || 'none'}
        onChange={(animation) => setLayer({ ...layer, animation })}
      />
    </StoryToolPanel>
  );
}
type StickerTool = 'poll' | 'link' | 'mention';
export function StoryStickerEditor({
  tool,
  initial,
  onSave,
  onClose,
}: {
  tool: StickerTool;
  initial?: StoryOverlay;
  onSave: (overlay: StoryOverlay) => void;
  onClose: () => void;
}) {
  const [first, setFirst] = React.useState(
    initial?.type === 'poll'
      ? initial.question
      : initial?.type === 'link'
        ? initial.url
        : initial?.type === 'mention'
          ? initial.username
          : '',
  );
  const [second, setSecond] = React.useState(
    initial?.type === 'link' ? initial.title : 'TAP HERE 🔥',
  );
  const [options, setOptions] = React.useState(
    initial?.type === 'poll' ? initial.options.map((item) => item.text) : ['Yes', 'No'],
  );
  const [error, setError] = React.useState<string | null>(null);
  const title = tool === 'poll' ? tr('Poll') : tool === 'link' ? tr('Link') : tr('Mention');
  function save() {
    try {
      const fields =
        tool === 'poll'
          ? { question: first.trim(), options: options.map((text) => ({ text: text.trim() })) }
          : tool === 'link'
            ? { url: safeStoryLink(first), title: second.trim() || tr('Link') }
            : { username: first.trim().replace(/^@/, '') };
      if (tool === 'mention' && !/^[\p{L}\p{N}_.]+$/u.test(String(fields.username)))
        throw new Error(tr('Enter a valid username.'));
      onSave(makeOverlay({ ...initial, type: tool, ...fields }));
    } catch {
      setError(
        tool === 'poll'
          ? tr('Add a question and 2–4 nonempty options.')
          : tool === 'link'
            ? tr('Enter a valid http or https link and a sticker title.')
            : tr('Enter a valid username.'),
      );
    }
  }
  return (
    <StoryToolPanel title={title} onClose={onClose} onSave={save} saveDisabled={!first.trim()}>
      {error && <ErrorNotice message={error} />}
      <StoryField
        label={
          tool === 'poll'
            ? tr('Poll question')
            : tool === 'link'
              ? tr('Link URL')
              : tr('Username to mention')
        }
        value={first}
        onChange={setFirst}
        maxLength={tool === 'poll' ? 255 : tool === 'link' ? 2048 : 33}
        keyboardType={tool === 'link' ? 'url' : 'default'}
      />
      {tool === 'link' && (
        <StoryField label={tr('Link sticker title')} value={second} onChange={setSecond} />
      )}
      {tool === 'poll' && (
        <>
          {options.map((option, i) => (
            <View key={i}>
              <StoryField
                label={tr('Poll option {index}', { index: i + 1 })}
                value={option}
                onChange={(text) =>
                  setOptions(options.map((value, index) => (index === i ? text : value)))
                }
                maxLength={100}
              />
              {options.length > 2 && (
                <Button
                  title={tr('Remove option {index}', { index: i + 1 })}
                  variant="ghost"
                  onPress={() => setOptions(options.filter((_, index) => index !== i))}
                />
              )}
            </View>
          ))}
          <Button
            title={tr('Add poll option')}
            variant="secondary"
            disabled={options.length >= 4}
            onPress={() => setOptions([...options, ''])}
          />
          <Text style={common.muted}>
            {tr('One interactive poll per story. Viewers can change their vote.')}
          </Text>
        </>
      )}
      {tool === 'mention' && (
        <Text style={common.muted}>
          {tr('The sticker opens their profile and notifies the mentioned person.')}
        </Text>
      )}
    </StoryToolPanel>
  );
}
const EMOJIS = [
  '😀',
  '🥰',
  '😍',
  '😂',
  '🥹',
  '😎',
  '🤩',
  '🥳',
  '😭',
  '🤯',
  '🫶',
  '❤️',
  '💜',
  '🔥',
  '✨',
  '🌈',
  '☀️',
  '🌙',
  '⭐',
  '🎉',
  '🎶',
  '🎧',
  '🍀',
  '🌸',
  '🌊',
  '🦋',
  '🐾',
  '☕',
  '🍕',
  '🎂',
  '💯',
  '🙏',
  '👏',
  '💪',
  '👀',
  '📍',
  '🚀',
  '💫',
  '🪩',
  '🎬',
];
export function StoryEmojiEditor({
  onSave,
  onClose,
  onPhoto,
  onLink,
  onPoll,
  onMention,
}: {
  onSave: (text: string) => void;
  onClose: () => void;
  onPhoto: () => void;
  onLink: () => void;
  onPoll: () => void;
  onMention: () => void;
}) {
  const [custom, setCustom] = React.useState('');
  return (
    <StoryToolPanel
      title={tr('Stickers')}
      onClose={onClose}
      onSave={custom.trim() ? () => onSave(custom.trim()) : undefined}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          title={tr('Photo sticker')}
          fullWidth={false}
          variant="secondary"
          onPress={onPhoto}
        />
        <Button title={tr('Poll')} fullWidth={false} variant="secondary" onPress={onPoll} />
        <Button title={tr('Link')} fullWidth={false} variant="secondary" onPress={onLink} />
        <Button title={tr('Mention')} fullWidth={false} variant="secondary" onPress={onMention} />
      </View>
      <StoryField
        label={tr('Emoji or sticker text')}
        value={custom}
        onChange={setCustom}
        maxLength={2000}
      />
      <Text style={common.muted}>
        {tr('Use your keyboard for any emoji, or choose a favourite below.')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={tr('Add sticker {emoji}', { emoji })}
            onPress={() => onSave(emoji)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </StoryToolPanel>
  );
}
