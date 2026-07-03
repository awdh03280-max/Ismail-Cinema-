/**
 * StreamEmbed — web platform implementation.
 * Uses a standard <iframe> since react-native-webview is native-only.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  uri: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  style?: object;
}

const StreamEmbed: React.FC<Props> = ({ uri, onLoadStart, onLoadEnd, onError, style }) => {
  // onLoadStart equivalent: fire synchronously before iframe loads
  React.useEffect(() => {
    onLoadStart?.();
  }, [uri]);

  return (
    <View style={[styles.container, style as any]}>
      <iframe
        key={uri}
        src={uri}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#000',
        }}
        allowFullScreen
        allow="autoplay; fullscreen; encrypted-media"
        onLoad={onLoadEnd}
        onError={onError}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-presentation"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default StreamEmbed;
