import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../api/tmdb';
import { colors } from '../theme/colors';

const { width: W } = Dimensions.get('window');
const HERO_H = Math.min(560, W * 1.15);

interface HeroBannerProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
}

/**
 * Large featured hero banner with a subtle Ken-Burns zoom/pan on the backdrop
 * image, cycling through a handful of trending titles. This substitutes for a
 * looping video background — kept as a still-image effect so PlayerScreen /
 * webview streaming logic is never touched here.
 */
const HeroBanner: React.FC<HeroBannerProps> = ({ movies, onPlay, onMoreInfo }) => {
  const [index, setIndex] = useState(0);
  const zoom = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const featured = movies[index];

  useEffect(() => {
    if (!movies.length) return;

    zoom.setValue(1);
    Animated.timing(zoom, {
      toValue: 1.12,
      duration: 7000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const rotateTimer = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIndex(prev => (prev + 1) % movies.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 7000);

    return () => clearInterval(rotateTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies.length, index]);

  if (!featured) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade, ...StyleSheet.absoluteFillObject }}>
        <Animated.Image
          source={{ uri: featured.Backdrop || featured.Poster }}
          style={[styles.backdrop, { transform: [{ scale: zoom }] }]}
        />
      </Animated.View>

      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.4)', '#000000']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.badge}>
          <Ionicons name="flame" size={12} color={colors.gold} />
          <Text style={styles.badgeText}>Featured</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {featured.Title}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text style={styles.ratingText}>{featured.imdbRating}</Text>
          </View>
          {!!featured.Year && <Text style={styles.metaText}>{featured.Year}</Text>}
        </View>

        {!!featured.Plot && (
          <Text style={styles.plot} numberOfLines={2}>
            {featured.Plot}
          </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.playButton}
            activeOpacity={0.85}
            onPress={() => onPlay(featured)}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoButton}
            activeOpacity={0.8}
            onPress={() => onMoreInfo(featured)}
          >
            <Ionicons name="information-circle-outline" size={20} color="#fff" />
            <Text style={styles.infoButtonText}>More Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: HERO_H,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 10,
    ...Platform.select({
      web: { textShadow: '0 2px 12px rgba(0,0,0,0.8)' } as object,
      default: {
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
      },
    }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 13,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  plot: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: '92%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 8,
    ...Platform.select({
      web: { boxShadow: '0 6px 20px rgba(229,9,20,0.5)' } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(120,120,120,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  infoButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default HeroBanner;
