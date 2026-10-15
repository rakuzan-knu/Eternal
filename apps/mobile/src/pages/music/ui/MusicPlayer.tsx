import * as React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MusicSlider as Slider } from './MusicSlider';
import {
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Mic2,
  Volume2,
  VolumeX,
  X,
  ArrowLeft,
  MoreHorizontal,
} from 'lucide-react-native';
import { useMusic } from '../model/MusicProvider';
import { durationLabel, musicLink, trackSource } from '../model/music';
import { musicApi } from '../api/musicApi';
import { colors, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import { shareLink } from '../../feed/ui/shareLink';
import { webOrigin } from '@/shared/api/client';
import { Button } from '@/shared/ui';
import { MusicJam } from './MusicJam';
import { MusicLyrics } from './MusicLyrics';
import { MusicBackdrop } from './MusicBackdrop';
import { Cover, m, TrackRow } from './primitives';

export function MusicPlayer() {
  const music = useMusic();
  const track = music.current;
  const { width, height } = useWindowDimensions();
  const [panel, setPanel] = React.useState('Playing');
  const [scrub, setScrub] = React.useState<number | null>(null);
  if (!track) return null;
  const liked = music.liked.data?.some((item) => item.id === track.id);
  const icon = music.playing ? (
    <Pause size={23} color="white" fill="white" />
  ) : (
    <Play size={23} color="white" fill="white" />
  );
  const share = () => {
    void shareLink(track.title, musicLink('track', track.id, webOrigin))
      .then((result) => {
        if (result === 'copied') music.setNotice('Link copied');
      })
      .catch(() => music.setError('The share menu could not be opened.'));
  };
  return (
    <>
      <View
        style={{
          marginHorizontal: 12,
          marginBottom: 8,
          borderRadius: 18,
          backgroundColor: '#2d1e40',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#bb85ff20',
        }}
      >
        <View style={[m.row, { padding: 7, gap: 7 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open player: ${track.title}`}
            onPress={() => {
              setPanel('Playing');
              music.setExpanded(true);
            }}
            style={[m.row, m.flex]}
          >
            <Cover uri={track.albumArt} size={42} rounded={11} />
            <View style={m.flex}>
              <Text numberOfLines={1} style={m.trackTitle}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={m.muted}>
                {music.stream.data?.preview ? 'Spotify preview · ' : ''}
                {track.artist}
              </Text>
            </View>
          </Pressable>
          <IconButton label={music.playing ? 'Pause music' : 'Play music'} onPress={music.toggle}>
            {music.stream.isFetching ? <ActivityIndicator color="white" /> : icon}
          </IconButton>
          <IconButton
            label="Next track"
            onPress={() => music.next()}
            disabled={
              music.listener || (music.index === music.queue.length - 1 && music.repeat === 'off')
            }
          >
            <SkipForward size={20} color="white" />
          </IconButton>
        </View>
        <View style={{ height: 2, backgroundColor: '#ffffff10' }}>
          <View
            style={{
              height: 2,
              width: `${Math.min(100, (music.position / Math.max(1, music.duration)) * 100)}%`,
              backgroundColor: '#bd86ff',
            }}
          />
        </View>
      </View>
      {music.expanded && (
        <Sheet title="Now playing" onClose={() => music.setExpanded(false)}>
          {panel === 'Lyrics' ? (
            <MusicLyrics onBack={() => setPanel('Playing')} />
          ) : (
            <View style={m.flex}>
              <MusicBackdrop seed={track.id} />
              <ScrollView
                contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
              >
                {panel !== 'Playing' && (
                  <View style={m.row}>
                    <IconButton label="Back to now playing" onPress={() => setPanel('Playing')}>
                      <ArrowLeft size={22} color="white" />
                    </IconButton>
                    <Text accessibilityRole="header" style={m.heading}>
                      {panel === 'More' ? 'Track options' : panel}
                    </Text>
                  </View>
                )}
                {music.error && <ErrorNotice message={music.error} onRetry={music.toggle} />}
                {music.listener && (
                  <Text style={m.muted}>
                    Playback follows the Jam host. Choose a track to leave Jam and listen on your
                    own.
                  </Text>
                )}
                {panel === 'Playing' && (
                  <>
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <Cover
                        uri={track.albumArt}
                        size={Math.max(120, Math.min(width - 64, 340, height - 500))}
                        rounded={28}
                      />
                    </View>
                    <View style={m.row}>
                      <View style={m.flex}>
                        <Text style={m.heading}>{track.title}</Text>
                        <Text style={[m.muted, { fontSize: 16, marginTop: 5 }]}>
                          {track.artist}
                        </Text>
                      </View>
                      <IconButton
                        label={liked ? 'Unlike current track' : 'Like current track'}
                        disabled={music.busy || !music.isOnline}
                        onPress={() => void music.like(track)}
                      >
                        <Heart
                          size={25}
                          color={liked ? colors.purple : 'white'}
                          fill={liked ? colors.purple : 'none'}
                        />
                      </IconButton>
                    </View>
                    <View>
                      <Slider
                        disabled={music.listener}
                        accessibilityLabel="Playback position"
                        accessibilityValue={{
                          min: 0,
                          max: Math.max(1, music.duration),
                          now: scrub ?? music.position,
                          text: durationLabel(scrub ?? music.position),
                        }}
                        step={1000}
                        minimumValue={0}
                        maximumValue={Math.max(1, music.duration)}
                        value={scrub ?? music.position}
                        onSlidingStart={() => setScrub(music.position)}
                        onValueChange={setScrub}
                        onSlidingComplete={(value) => {
                          music.seekTo(value);
                          setScrub(null);
                        }}
                        minimumTrackTintColor={colors.purple}
                        maximumTrackTintColor="#ffffff25"
                        thumbTintColor="white"
                        style={{ height: 44 }}
                      />
                      <View style={[m.row, { justifyContent: 'space-between' }]}>
                        <Text style={m.small}>{durationLabel(scrub ?? music.position)}</Text>
                        <Text style={m.small}>{durationLabel(music.duration)}</Text>
                      </View>
                    </View>
                    <View style={[m.row, { justifyContent: 'space-between', gap: 0 }]}>
                      <IconButton
                        label={`Shuffle ${music.shuffle ? 'on' : 'off'}`}
                        selected={music.shuffle}
                        disabled={music.listener}
                        onPress={music.toggleShuffle}
                      >
                        <Shuffle size={22} color={music.shuffle ? colors.purple : colors.muted} />
                      </IconButton>
                      <IconButton
                        label="Previous track"
                        onPress={music.previous}
                        disabled={music.listener}
                      >
                        <SkipBack size={29} color="white" fill="white" />
                      </IconButton>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={music.playing ? 'Pause' : 'Play'}
                        onPress={music.toggle}
                        style={[m.play, { width: 72, height: 72, borderRadius: 36 }]}
                      >
                        {icon}
                      </Pressable>
                      <IconButton
                        label="Next track"
                        onPress={() => music.next()}
                        disabled={
                          music.listener ||
                          (music.index === music.queue.length - 1 && music.repeat === 'off')
                        }
                      >
                        <SkipForward size={29} color="white" fill="white" />
                      </IconButton>
                      <IconButton
                        label={`Repeat: ${music.repeat}`}
                        disabled={music.listener}
                        onPress={() =>
                          music.setRepeat(
                            music.repeat === 'off' ? 'all' : music.repeat === 'all' ? 'one' : 'off',
                          )
                        }
                      >
                        {music.repeat === 'one' ? (
                          <Repeat1 size={23} color={colors.purple} />
                        ) : (
                          <Repeat
                            size={23}
                            color={music.repeat === 'all' ? colors.purple : colors.muted}
                          />
                        )}
                      </IconButton>
                    </View>
                    <View style={[m.row, { justifyContent: 'space-around' }]}>
                      {[
                        { title: 'Queue', icon: <ListMusic size={21} color="white" /> },
                        { title: 'Lyrics', icon: <Mic2 size={21} color="white" /> },
                        { title: 'More', icon: <MoreHorizontal size={21} color="white" /> },
                      ].map((action) => (
                        <Pressable
                          key={action.title}
                          accessibilityRole="button"
                          accessibilityLabel={`Show ${action.title.toLowerCase()}`}
                          onPress={() => setPanel(action.title)}
                          style={{
                            minWidth: 64,
                            minHeight: 56,
                            gap: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {action.icon}
                          <Text style={m.small}>{action.title}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {trackSource(track) === 'spotify' && (
                      <Button
                        title="Listen in Spotify"
                        variant="secondary"
                        onPress={() =>
                          void Linking.openURL(
                            `https://open.spotify.com/track/${encodeURIComponent(track.id.replace(/^sp-/, ''))}`,
                          ).catch(() => music.setError('Spotify could not be opened.'))
                        }
                      />
                    )}
                    {music.stream.data?.preview && (
                      <Text style={m.muted}>
                        Spotify preview. Full playback is available in Spotify with your account.
                      </Text>
                    )}
                  </>
                )}
                {panel === 'More' && (
                  <>
                    <Button title="Game Mode" variant="secondary" onPress={music.enterGameMode} />
                    <Text style={m.muted}>Volume</Text>
                    <View style={m.row}>
                      <IconButton
                        label={music.muted ? 'Unmute' : 'Mute'}
                        onPress={() => music.setMuted(!music.muted)}
                      >
                        {music.muted ? (
                          <VolumeX size={20} color="white" />
                        ) : (
                          <Volume2 size={20} color="white" />
                        )}
                      </IconButton>
                      <Slider
                        accessibilityLabel="Music volume"
                        style={{ flex: 1, height: 44 }}
                        minimumValue={0}
                        maximumValue={1}
                        step={0.05}
                        value={music.preferences.volume}
                        onValueChange={(volume) =>
                          music.setPreferences((value) => ({ ...value, volume }))
                        }
                        minimumTrackTintColor={colors.purple}
                        thumbTintColor="white"
                      />
                    </View>

                    <Button title="Share track" variant="secondary" onPress={share} />
                    <Button
                      title="Listen together · Jam"
                      variant="secondary"
                      onPress={() => setPanel('Jam')}
                    />
                    <Button
                      title={music.sleepUntil ? 'Sleep timer · On' : 'Sleep timer'}
                      variant="secondary"
                      onPress={() => setPanel('Sleep timer')}
                    />
                    <Button title="Close player" variant="ghost" onPress={music.close} />
                  </>
                )}
                {panel === 'Queue' && (
                  <>
                    <Text style={m.heading}>Up next</Text>
                    <Button
                      title="Clear upcoming tracks"
                      variant="ghost"
                      onPress={music.clearQueue}
                      disabled={music.listener}
                    />
                    {music.queue.slice(music.index + 1).map((item, i) => (
                      <View key={`${item.id}:${i}`} style={m.row}>
                        <View style={m.flex}>
                          <TrackRow track={item} onPlay={() => music.play(item, music.queue)} />
                        </View>
                        <IconButton
                          label={`Remove ${item.title} from queue`}
                          disabled={music.listener}
                          onPress={() => music.removeQueue(music.index + i + 1)}
                        >
                          <X size={19} color={colors.muted} />
                        </IconButton>
                      </View>
                    ))}
                    {music.index + 1 >= music.queue.length && (
                      <Text style={m.muted}>
                        Your queue is empty. Add tracks from their options menu.
                      </Text>
                    )}
                    <Button
                      title="Find more like this"
                      variant="secondary"
                      disabled={!music.isOnline || music.busy || music.listener}
                      onPress={() =>
                        void music.run(async () => {
                          const tracks = await musicApi.recommendations(track);
                          tracks
                            .filter(
                              (item) => !music.queue.some((existing) => existing.id === item.id),
                            )
                            .forEach(music.addToQueue);
                        })
                      }
                    />
                  </>
                )}
                {panel === 'Jam' && <MusicJam />}
                {panel === 'Sleep timer' && (
                  <>
                    <Text style={m.heading}>Fall asleep to your favourites</Text>
                    {[15, 30, 45, 60].map((minutes) => (
                      <Button
                        key={minutes}
                        title={`${minutes} minutes`}
                        variant="secondary"
                        onPress={() => {
                          music.setSleepUntil(Date.now() + minutes * 60_000);
                          setPanel('Playing');
                        }}
                      />
                    ))}
                    {music.sleepUntil && (
                      <Button
                        title="Turn off timer"
                        variant="ghost"
                        onPress={() => music.setSleepUntil(null)}
                      />
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </Sheet>
      )}
    </>
  );
}
