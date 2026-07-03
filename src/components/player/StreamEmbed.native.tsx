/**
 * StreamEmbed — native platform implementation (Android + iOS).
 * Uses react-native-webview for full-featured in-app streaming.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import WebViewRN from 'react-native-webview';

const WebView = WebViewRN as any;

interface Props {
  uri: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  style?: object;
}

const StreamEmbed: React.FC<Props> = ({ uri, onLoadStart, onLoadEnd, onError, style }) => (
  <WebView
    source={{ uri }}
    style={[styles.container, style]}
    allowsFullscreenVideo
    allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction={false}
    javaScriptEnabled
    domStorageEnabled
    onLoadStart={onLoadStart}
    onLoadEnd={onLoadEnd}
    onError={onError}
    onHttpError={({ nativeEvent }: { nativeEvent: any }) => {
      if (nativeEvent.statusCode >= 400 && onError) onError();
    }}
    userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/118.0.0.0 Mobile Safari/537.36"
    originWhitelist={['*']}
    mixedContentMode="always"
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default StreamEmbed;
