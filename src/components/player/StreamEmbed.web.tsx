/**
 * StreamEmbed — web platform.
 * Uses a standard <iframe>. onHttpError is not available for cross-origin
 * iframes on the web, so only onError (iframe onerror) is surfaced.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StreamEmbedProps } from './StreamEmbed.native';

const StreamEmbed: React.FC<StreamEmbedProps> = ({
  uri,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
}) => {
  useEffect(() => {
    onLoadStart?.();
  }, [uri]);

  return (
    <View style={[styles.container, style as any]}>
      <iframe
        key={uri}
        src={uri}
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
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
  container: { flex: 1, backgroundColor: '#000' },
});

export default StreamEmbed;
