import * as React from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { STORY_FILTERS } from '../model/storyEditor';
import { Video } from './MediaGallery';
import { ErrorNotice } from './primitives';
import type { StoryVideoProps } from './storyVideoTypes';

let previewSequence = 0;
/** The native web renderer supplies the same GPU video effects as the web app. */
function FilteredStoryVideo({
  uri,
  active,
  volume = 1,
  filter,
  label = 'Story video',
}: StoryVideoProps) {
  const view = React.useRef<WebView>(null);
  const [source, setSource] = React.useState<{ uri: string } | { html: string }>();
  const [readDirectory, setReadDirectory] = React.useState<string>();
  const [failed, setFailed] = React.useState(false);
  const css =
    STORY_FILTERS.find((item) => item.id === filter)
      ?.operations.map(
        ([operation, value]) =>
          `${operation === 'hueRotate' ? 'hue-rotate' : operation}(${value}${operation === 'hueRotate' ? 'deg' : ''})`,
      )
      .join(' ') || 'none';
  const latest = React.useRef({ active, volume, css });
  latest.current = { active, volume, css };
  function sync() {
    const value = latest.current;
    view.current?.injectJavaScript(
      `(function(){const v=document.querySelector('video');if(v){v.volume=${value.volume};v.style.filter=${JSON.stringify(value.css)};${value.active && AppState.currentState === 'active' ? 'v.play().catch(function(){});' : 'v.pause();'}}})();true;`,
    );
  }
  React.useEffect(() => {
    let mounted = true;
    let directory: string | undefined;
    const build = async () => {
      const local = uri.startsWith('file:') || uri.startsWith('content:');
      let videoUri = uri;
      if (local) {
        if (!FileSystem.cacheDirectory) throw new Error('Preview storage unavailable');
        directory = `${FileSystem.cacheDirectory}story-preview-${Date.now()}-${++previewSequence}/`;
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        await FileSystem.copyAsync({ from: uri, to: `${directory}media.mp4` });
        videoUri = 'media.mp4';
      }
      const encoded = JSON.stringify(videoUri).replace(/</g, '\\u003c');
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}video{width:100%;height:100%;object-fit:contain}</style></head><body><video controls playsinline loop></video><script>const video=document.querySelector('video');video.src=${encoded};video.addEventListener('error',()=>window.ReactNativeWebView.postMessage('video-error'));</script></body></html>`;
      if (directory) {
        await FileSystem.writeAsStringAsync(`${directory}preview.html`, html);
        if (mounted) {
          setReadDirectory(directory);
          setSource({ uri: `${directory}preview.html` });
        }
      } else if (mounted) setSource({ html });
    };
    setFailed(false);
    void build()
      .catch(() => {
        if (mounted) setFailed(true);
      })
      .finally(() => {
        if (!mounted && directory)
          void FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => undefined);
      });
    return () => {
      mounted = false;
      view.current?.injectJavaScript("document.querySelector('video')?.pause();true;");
      if (directory)
        void FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => undefined);
    };
  }, [uri]);
  React.useEffect(() => {
    sync();
  }, [active, volume, css, source]);
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active')
        view.current?.injectJavaScript("document.querySelector('video')?.pause();true;");
    });
    return () => subscription.remove();
  }, []);
  if (failed)
    return (
      <ErrorNotice message="This video effect couldn't be previewed. Choose Normal or try another video." />
    );
  if (!source) return <ActivityIndicator color="#a855f7" />;
  return (
    <WebView
      ref={view}
      source={source}
      accessibilityLabel={label}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={(request) =>
        request.url === 'about:blank' || (!!readDirectory && request.url.startsWith(readDirectory))
      }
      allowingReadAccessToURL={readDirectory}
      allowFileAccess={!!readDirectory}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      incognito
      scrollEnabled={false}
      bounces={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      onLoadEnd={sync}
      onMessage={(event) => {
        if (event.nativeEvent.data === 'video-error') setFailed(true);
      }}
      onError={() => setFailed(true)}
      style={{ flex: 1, backgroundColor: 'transparent' }}
    />
  );
}
export function StoryVideo(props: StoryVideoProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {props.filter && props.filter !== 'none' ? (
        <FilteredStoryVideo {...props} />
      ) : (
        <Video
          uri={props.uri}
          active={props.active}
          autoPlay
          volume={props.volume}
          loop
          label={props.label || 'Story video'}
        />
      )}
    </View>
  );
}
