/**
 * MovieOfTheDayVideo — web platform.
 * Auto-plays the YouTube trailer muted when a trailerKey is available;
 * falls back to the backdrop image otherwise.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface Props {
  trailerKey: string;
  backdropUri: string;
  height: number;
}

const MovieOfTheDayVideo: React.FC<Props> = ({ trailerKey, backdropUri, height }) => {
  if (trailerKey) {
    const src =
      `https://www.youtube.com/embed/${trailerKey}` +
      `?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}` +
      `&rel=0&modestbranding=1&playsinline=1&showinfo=0`;

    return (
      <View style={[styles.container, { height }]}>
        {/* Backdrop shown behind while iframe loads */}
        <Image
          source={{ uri: backdropUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <iframe
          key={trailerKey}
          src={src}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'transparent',
            display: 'block',
          }}
          allow="autoplay; encrypted-media"
          // @ts-ignore — allowFullScreen is valid HTML but not in RN types
          allowFullScreen={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Image
        source={{ uri: backdropUri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  } as any,
});

export default MovieOfTheDayVideo;
