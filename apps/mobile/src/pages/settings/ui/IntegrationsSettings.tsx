import * as React from 'react';
import { Text, View } from 'react-native';
import {
  CheckCircle2,
  ExternalLink,
  Gamepad2,
  Github,
  Music2,
  Tv,
  Youtube,
  Box,
} from 'lucide-react-native';
import { Button } from '@/shared/ui';
import { colors, common, ErrorNotice } from '../../feed/ui/primitives';
import { useMe, useShowcase, useUnlinkIntegration } from '../model/settings';
import { QueryState, SettingsGroup, SettingsPage, SettingsRow } from './SettingsKit';
import { tr } from '@/shared/lib/i18n';

const PLATFORMS = [
  { id: 'steam', name: 'Steam', Icon: Gamepad2 },
  { id: 'github', name: 'GitHub', Icon: Github },
  { id: 'spotify', name: 'Spotify', Icon: Music2 },
  { id: 'youtube', name: 'YouTube', Icon: Youtube },
  { id: 'twitch', name: 'Twitch', Icon: Tv },
  { id: 'roblox', name: 'Roblox', Icon: Box },
] as const;

type Linked = Record<
  string,
  { username?: string; handle?: string; channel?: string } | null | undefined
>;

export function IntegrationsSettings({
  userId,
  username,
  isOnline,
  active,
  onBack,
  onOpenWeb,
}: {
  userId: string;
  username: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenWeb: () => void;
}) {
  const me = useMe(userId);
  const showcase = useShowcase(userId, username);
  const github = me.data?.githubUsername ?? null;
  const unlink = useUnlinkIntegration(userId, !!github);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const linked = (showcase.data?.connectedAccounts ?? {}) as Linked;

  return (
    <SettingsPage
      title={tr('Integrations')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-integrations"
    >
      {!showcase.data || !me.data ? (
        <QueryState query={showcase.data ? me : showcase} />
      ) : (
        <>
          <SettingsGroup
            title={tr('Connected accounts')}
            footer={tr(
              "Connecting uses each platform's sign-in, which opens on the web. Disconnect any account here.",
            )}
          >
            {PLATFORMS.map(({ id, name, Icon }) => {
              const account = linked[id];
              const handle =
                id === 'github' && github
                  ? github
                  : (account?.username ?? account?.handle ?? account?.channel ?? null);
              const connected = !!account || (id === 'github' && !!github);
              const confirming = confirm === id;
              return (
                <SettingsRow
                  key={id}
                  Icon={Icon}
                  label={name}
                  detail={
                    connected
                      ? handle
                        ? tr('Connected as {handle}', { handle })
                        : tr('Connected')
                      : tr('Not connected')
                  }
                  accessory={
                    connected ? (
                      <Button
                        title={confirming ? tr('Disconnect?') : tr('Disconnect')}
                        variant={confirming ? 'danger' : 'secondary'}
                        size="sm"
                        fullWidth={false}
                        loading={unlink.isPending && unlink.variables === id}
                        disabled={!isOnline}
                        accessibilityHint={
                          confirming
                            ? tr('Disconnects {name}', { name })
                            : tr('Tap again to confirm')
                        }
                        onPress={() => {
                          if (!confirming) return setConfirm(id);
                          setConfirm(null);
                          unlink.mutate(id);
                        }}
                      />
                    ) : (
                      <Button
                        title={tr('Connect')}
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        disabled={!isOnline}
                        accessibilityHint={tr('Opens Eternal on the web')}
                        rightIcon={<ExternalLink size={14} color={colors.purple} />}
                        onPress={onOpenWeb}
                      />
                    )
                  }
                />
              );
            })}
          </SettingsGroup>
          {unlink.isError && (
            <ErrorNotice message={tr("The account wasn't disconnected. Try again.")} />
          )}
          {github && (
            <View style={common.row}>
              <CheckCircle2 size={16} color={colors.green} />
              <Text style={common.muted}>
                {tr('{count} merged pull requests count toward your contributor badge.', {
                  count: me.data.mergedPrsCount ?? 0,
                })}
              </Text>
            </View>
          )}
        </>
      )}
    </SettingsPage>
  );
}
