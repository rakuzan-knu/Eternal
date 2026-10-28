import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Check, Search, SearchX, X } from 'lucide-react-native';
import type { UserProfileDto } from '@social-network/shared-contracts';
import { Input } from '@/shared/ui';
import { useDebounce } from '@/shared/lib/useDebounce';
import { Avatar, colors, common, ErrorNotice } from '../../feed/ui/primitives';
import { feedApi } from '../../feed/api/feedApi';
import { searchApi } from '../../search/model/search';
import { tr } from '@/shared/lib/i18n';

export type PickedPerson = Pick<UserProfileDto, 'id' | 'username' | 'displayName' | 'avatar'> &
  Partial<Pick<UserProfileDto, 'isVerified'>>;

export function PeoplePicker({
  userId,
  multi,
  selected,
  excludeIds = [],
  maxSelected,
  header,
  onPick,
}: {
  userId: string;
  multi: boolean;
  selected: PickedPerson[];
  excludeIds?: string[];
  maxSelected?: number;
  header?: React.ReactNode;
  onPick: (person: PickedPerson) => void;
}) {
  const [term, setTerm] = React.useState('');
  const query = useDebounce(term.trim(), 300);
  const search = useQuery({
    queryKey: ['mobile', userId, 'people-picker', query],
    queryFn: ({ signal }) => searchApi.people(query, signal),
    enabled: query.length > 0,
    staleTime: 30_000,
  });
  const suggestions = useQuery({
    queryKey: ['mobile', userId, 'suggested-users'],
    queryFn: ({ signal }) => feedApi.suggestions(signal),
    enabled: query.length === 0,
    staleTime: 60_000,
  });
  const source = query ? search : suggestions;
  const hidden = new Set([userId, ...excludeIds]);
  const people = (source.data ?? []).filter((person) => !hidden.has(person.id));
  const selectedIds = new Set(selected.map((person) => person.id));
  const full = maxSelected !== undefined && selected.length >= maxSelected;

  return (
    <View style={common.flex}>
      <View style={s.search}>
        <Input
          value={term}
          onChangeText={setTerm}
          placeholder={tr('Search by name or username')}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          showClearButton
          onClear={() => setTerm('')}
          leftElement={<Search size={18} color={colors.muted} />}
          accessibilityLabel={tr('Search people')}
        />
      </View>
      {multi && selected.length > 0 && (
        <View style={s.chips} accessibilityLabel={`${selected.length} selected`}>
          {selected.map((person) => (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              accessibilityLabel={tr('Remove {name}', {
                name: person.displayName || person.username,
              })}
              onPress={() => onPick(person)}
              style={({ pressed }) => [s.chip, pressed && common.pressed]}
            >
              <Text style={s.chipText} numberOfLines={1}>
                {person.displayName || person.username}
              </Text>
              <X size={14} color={colors.text} />
            </Pressable>
          ))}
        </View>
      )}
      <FlatList
        data={people}
        keyExtractor={(person) => person.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {header}
            <Text style={s.section}>{query ? tr('Results') : tr('Suggested')}</Text>
          </>
        }
        ItemSeparatorComponent={() => <View style={s.divider} />}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          const disabled = multi && !isSelected && full;
          const name = item.displayName || item.username;
          return (
            <Pressable
              accessibilityRole={multi ? 'checkbox' : 'button'}
              accessibilityState={multi ? { checked: isSelected, disabled } : { disabled }}
              accessibilityLabel={`${name}, @${item.username}`}
              disabled={disabled}
              onPress={() => onPick(item)}
              style={({ pressed }) => [s.row, pressed && s.pressed, disabled && s.disabled]}
            >
              <Avatar name={name} uri={item.avatar} size={44} />
              <View style={common.flex}>
                <View style={s.nameRow}>
                  <Text style={s.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.isVerified && <BadgeCheck size={14} color={colors.purple} />}
                </View>
                <Text style={common.muted} numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
              {multi && (
                <View style={[s.check, isSelected && s.checked]}>
                  {isSelected && <Check size={14} color="#fff" />}
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          source.isPending && source.fetchStatus !== 'idle' ? (
            <ActivityIndicator
              color={colors.purple}
              style={s.loader}
              accessibilityLabel={tr('Searching')}
            />
          ) : source.isError ? (
            <View style={s.padded}>
              <ErrorNotice
                message={tr("People couldn't be loaded.")}
                onRetry={() => {
                  void source.refetch();
                }}
              />
            </View>
          ) : (
            <View style={s.empty}>
              <SearchX size={22} color={colors.muted} />
              <Text style={s.emptyText}>
                {query
                  ? tr('No people match “{term}”', { term: query })
                  : tr('Search for someone by name or username.')}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  search: { paddingHorizontal: 16, paddingTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    maxWidth: 180,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#a855f72e',
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  list: { paddingBottom: 24, flexGrow: 1 },
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 60,
  },
  pressed: { backgroundColor: '#ffffff08' },
  disabled: { opacity: 0.4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.purple, borderColor: colors.purple },
  loader: { padding: 24 },
  padded: { padding: 16 },
  empty: { alignItems: 'center', gap: 8, padding: 32 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
