import * as React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Users } from 'lucide-react-native';
import { useMusic } from '../model/MusicProvider';
import { colors, ErrorNotice } from '../../feed/ui/primitives';
import { Button } from '@/shared/ui';
import { webOrigin } from '@/shared/api/client';
import { shareLink } from '../../feed/ui/shareLink';
import { m, Chips } from './primitives';
import { tr } from '@/shared/lib/i18n';
export function MusicJam() {
  const music = useMusic();
  const jam = music.jam;
  const [code, setCode] = React.useState('');
  return (
    <View style={{ gap: 14 }}>
      <Users size={36} color={colors.purple} />
      <Text style={m.heading}>{tr('Listen together')}</Text>
      <Text style={m.muted}>
        {tr('One room, one soundtrack. Join your friends on mobile or web.')}
      </Text>
      {jam.error && <ErrorNotice message={jam.error} />}
      <Text style={m.muted}>
        {jam.connected ? tr('Connected to live listening') : tr('Reconnecting to live listening…')}
      </Text>
      {jam.room ? (
        <>
          <Text style={m.heading}>{jam.room.hostUsername}'s Jam</Text>
          <Text selectable style={m.accent}>
            {jam.room.roomId}
          </Text>
          <Text style={m.muted}>
            {jam.room.listeners.length} listeners ·{' '}
            {jam.isHost ? tr('You control playback') : tr('Playback follows the host')}
          </Text>
          {jam.room.listeners.map((person) => (
            <Text key={person.id} style={m.text}>
              {person.username}
              {person.id === jam.room?.hostUserId ? ` · ${tr('Host')}` : ''}
            </Text>
          ))}
          {jam.isHost ? (
            <Chips
              label={tr('Jam queue policy')}
              values={['DJ only', 'Everyone']}
              value={jam.room.queuePolicy === 'dj_only' ? 'DJ only' : 'Everyone'}
              onChange={(value) => jam.policy(value === 'DJ only' ? 'dj_only' : 'open_queue')}
            />
          ) : (
            <Button
              title={jam.paused ? tr('Resume listening with host') : tr('Pause for me')}
              variant="secondary"
              onPress={jam.togglePause}
            />
          )}
          <Button
            title={tr('Invite to Jam')}
            onPress={() =>
              void shareLink(
                'Join my Jam',
                `${webOrigin}/music?jam=${encodeURIComponent(jam.room!.roomId)}`,
              ).catch(() => music.setError(tr('The invitation could not be shared.')))
            }
          />
          <Button title={tr('Leave Jam')} variant="ghost" onPress={jam.leave} />
        </>
      ) : (
        <>
          <Button
            title={tr('Start a Jam')}
            disabled={!jam.connected || !music.current}
            onPress={jam.create}
          />
          {!music.current && (
            <Text style={m.muted}>{tr('Play a track before starting a room.')}</Text>
          )}
          <TextInput
            accessibilityLabel={tr('Jam room code or link')}
            placeholder={tr('Paste a room code or invite link')}
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            style={m.input}
          />
          <Button
            title={tr('Join Jam')}
            variant="secondary"
            disabled={!code.trim() || !jam.connected}
            onPress={() => jam.join(code)}
          />
        </>
      )}
    </View>
  );
}
