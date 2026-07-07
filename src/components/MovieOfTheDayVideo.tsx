/**
 * MovieOfTheDayVideo — native platform.
 * Shows the backdrop image (no WebView dependency on native).
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface Props {
  trailerKey: string;
  backdropUri: string;
  height: number;
}

const MovieOfTheDayVideo: React.FC<Props> = ({ backdropUri, height }) => (
  <View style={[styles.container, { height }]}>
    <Image
      source={{ uri: backdropUri }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
});

export default MovieOfTheDayVideo;
