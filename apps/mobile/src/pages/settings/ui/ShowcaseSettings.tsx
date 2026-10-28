import * as React from 'react';
import { View } from 'react-native';
import {
  Cake,
  CalendarDays,
  Clock,
  Link2,
  Orbit,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react-native';
import type { ShowcasePrivacy, UpdateShowcaseDto } from '@social-network/shared-contracts';
import { Button, Input } from '@/shared/ui';
import { ErrorNotice } from '../../feed/ui/primitives';
import { useShowcase, useUpdateShowcase } from '../model/settings';
import {
  ChoiceSheet,
  QueryState,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  settingsStyles,
  ToggleRow,
  choiceLabel,
  type Choice,
} from './SettingsKit';
import { type MessageKey, msg, tr } from '@/shared/lib/i18n';

type PrivacyKey = 'privacyMeta' | 'privacyActivity' | 'privacyShowcase' | 'privacyLinks';

const AUDIENCE: readonly Choice<ShowcasePrivacy>[] = [
  { value: 'PUBLIC', label: msg('Everyone') },
  { value: 'FOLLOWERS', label: msg('Followers') },
  { value: 'PRIVATE', label: msg('Only me') },
];

const SECTIONS: readonly {
  key: PrivacyKey;
  label: MessageKey;
  detail: MessageKey;
  Icon: typeof Users;
}[] = [
  {
    key: 'privacyMeta',
    label: msg('About me'),
    detail: msg('Pronouns, age, birthday and time zone'),
    Icon: UserRound,
  },
  {
    key: 'privacyActivity',
    label: msg('Activity'),
    detail: msg('What you play and listen to right now'),
    Icon: Orbit,
  },
  {
    key: 'privacyShowcase',
    label: msg('Showcase'),
    detail: msg('Favorite games, films and music'),
    Icon: Sparkles,
  },
  {
    key: 'privacyLinks',
    label: msg('Connected accounts'),
    detail: msg('Links to your linked platforms'),
    Icon: Link2,
  },
];

export function ShowcaseSettings({
  userId,
  username,
  isOnline,
  active,
  onBack,
}: {
  userId: string;
  username: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
}) {
  const showcase = useShowcase(userId, username);
  const update = useUpdateShowcase(userId);
  const [sheet, setSheet] = React.useState<PrivacyKey | null>(null);
  const [pronouns, setPronouns] = React.useState<string | null>(null);
  const data = showcase.data;
  const set = (dto: UpdateShowcaseDto) => update.mutate(dto);
  const draft = pronouns ?? data?.pronouns ?? '';

  return (
    <SettingsPage
      title={tr('Profile showcase')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-showcase"
    >
      {!data ? (
        <QueryState query={showcase} />
      ) : (
        <>
          <SettingsGroup title={tr('Who can see each section')}>
            {SECTIONS.map(({ key, label, detail, Icon }) => (
              <SettingsRow
                key={key}
                Icon={Icon}
                label={tr(label)}
                detail={tr(detail)}
                value={choiceLabel(AUDIENCE, data[key]) ?? tr('Everyone')}
                disabled={!isOnline}
                onPress={() => setSheet(key)}
              />
            ))}
          </SettingsGroup>
          <SettingsGroup
            title={tr('About me')}
            footer={tr('Age and birthday come from the birth date on your account.')}
          >
            <ToggleRow
              Icon={Cake}
              label={tr('Show age')}
              value={data.showAge}
              disabled={!isOnline}
              onChange={(showAge) => set({ showAge })}
            />
            <ToggleRow
              Icon={CalendarDays}
              label={tr('Show birthday')}
              value={data.showBirthdate}
              disabled={!isOnline}
              onChange={(showBirthdate) => set({ showBirthdate })}
            />
            <ToggleRow
              Icon={Sparkles}
              label={tr('Show zodiac sign')}
              value={data.showZodiac ?? false}
              disabled={!isOnline}
              onChange={(showZodiac) => set({ showZodiac })}
            />
            <ToggleRow
              Icon={UserRound}
              label={tr('Show gender')}
              value={data.showGender}
              disabled={!isOnline}
              onChange={(showGender) => set({ showGender })}
            />
            <ToggleRow
              Icon={Clock}
              label={tr('Show local time')}
              detail={data.timezone ?? undefined}
              value={data.showTimezone}
              disabled={!isOnline}
              onChange={(showTimezone) =>
                set({
                  showTimezone,
                  ...(showTimezone && !data.timezone
                    ? { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
                    : {}),
                })
              }
            />
          </SettingsGroup>
          <View style={settingsStyles.form}>
            <Input
              label={tr('Pronouns')}
              value={draft}
              maxLength={20}
              placeholder={tr('e.g. they/them')}
              autoCapitalize="none"
              onChangeText={setPronouns}
              hint={`${draft.length}/20`}
              accessibilityLabel={tr('Pronouns')}
            />
            {pronouns !== null && pronouns.trim() !== (data.pronouns ?? '') && (
              <Button
                title={tr('Save pronouns')}
                variant="purple"
                size="sm"
                fullWidth={false}
                loading={update.isPending}
                disabled={!isOnline}
                onPress={() =>
                  update.mutate(
                    { pronouns: pronouns.trim() || null },
                    { onSuccess: () => setPronouns(null) },
                  )
                }
              />
            )}
          </View>
          {update.isError && <ErrorNotice message={tr("The change wasn't saved. Try again.")} />}
          <SettingsRow
            label={tr('Showcase widgets, favorites and accent color are arranged on the web.')}
          />
        </>
      )}
      {sheet && data && (
        <ChoiceSheet
          title={tr(SECTIONS.find((item) => item.key === sheet)?.label ?? 'Visibility')}
          description={tr('Choose who can see this part of your profile.')}
          value={data[sheet]}
          choices={AUDIENCE}
          onPick={(value) => set({ [sheet]: value })}
          onClose={() => setSheet(null)}
        />
      )}
    </SettingsPage>
  );
}
