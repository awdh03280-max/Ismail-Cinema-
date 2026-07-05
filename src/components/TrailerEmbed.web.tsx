/**
 * TrailerEmbed — web platform.
 * Embeds a YouTube trailer as an auto-playing muted iframe.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  trailerKey: string;
  height: number;
}

const TrailerEmbed: React.FC<Props> = ({ trailerKey, height }) => {
  const src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <View style={[styles.container, { height }]}>
      <iframe
        key={trailerKey}
        src={src}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#000',
          display: 'block',
        }}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});

export default TrailerEmbed;
