/**
 * TrailerEmbed — native platform fallback.
 * Shows the backdrop with a prominent "Watch Trailer" button
 * that opens YouTube in the device browser.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  trailerKey: string;
  height: number;
  backdropUri?: string;
}

const TrailerEmbed: React.FC<Props> = ({ trailerKey, height, backdropUri }) => {
  const handlePress = () => {
    Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
  };

  return (
    <View style={[styles.container, { height }]}>
      {!!backdropUri && (
        <Image
          source={{ uri: backdropUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity style={styles.playBtn} onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.playCircle}>
          <Ionicons name="play" size={36} color="#fff" style={{ marginLeft: 4 }} />
        </View>
        <Text style={styles.label}>Watch Trailer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    alignItems: 'center',
    gap: 12,
  },
  playCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229,9,20,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: `0 0 32px 8px ${colors.red}99` } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default TrailerEmbed;
