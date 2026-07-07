/**
 * MovieOfTheDay — premium "Movie of the Day" banner shown at the top of
 * the Home Screen. Fetches a deterministic featured title (rotates daily),
 * caches it in AsyncStorage so we only hit the API once per day, and shows
 * an auto-playing muted video preview (or backdrop fallback on native).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Movie, getMovieOfTheDay } from '../api/tmdb';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';
import { useFamilyMode } from '../context/FamilyModeContext';
import MovieOfTheDayVideo from './MovieOfTheDayVideo';

const { width: W } = Dimensions.get('window');
const VIDEO_H = Math.round(W * 0.56); // 16:9 ratio

/** UTC date string used as the AsyncStorage cache key (changes at midnight). */
const todayKey = () => new Date().toISOString().slice(0, 10);
const CACHE_KEY_PREFIX = 'motd_';

interface Props {
  onPress: (movie: Movie) => void;
}

const MovieOfTheDay: React.FC<Props> = ({ onPress }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  // Family Mode — suppress the section when enabled (we cannot guarantee
  // the day's pick passes the cert/adult filter without a full re-fetch).
  const { isEnabled, isUnlocked, filterMovies } = useFamilyMode();
  const familyActive = isEnabled && !isUnlocked;

  // Subtle shimmer animation while loading
  const shimmer = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef<Animated.CompositeAnimation | null>(null);

  const runShimmer = useCallback(() => {
    shimmerAnim.current?.stop();
    shimmer.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: ND,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: ND,
        }),
      ]),
    );
    shimmerAnim.current = anim;
    anim.start();
  }, [shimmer]);

  useEffect(() => {
    runShimmer();
    return () => { shimmerAnim.current?.stop(); };
  }, [runShimmer]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cacheKey = `${CACHE_KEY_PREFIX}${todayKey()}`;
      try {
        // Try cache first
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Movie;
            if (!cancelled) {
              setMovie(parsed);
              setLoading(false);
              shimmerAnim.current?.stop();
              return;
            }
          } catch {
            // Corrupted cache — remove it and fall through to network fetch
            await AsyncStorage.removeItem(cacheKey);
          }
        }

        // Fetch from API
        const fetched = await getMovieOfTheDay();
        if (!cancelled) {
          setMovie(fetched);
          setLoading(false);
          shimmerAnim.current?.stop();
          // Persist for the rest of the day
          await AsyncStorage.setItem(cacheKey, JSON.stringify(fetched));
          // Purge yesterday's cache (best-effort)
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${yesterday}`);
        }
      } catch (err) {
        console.warn('MovieOfTheDay fetch error:', err);
        if (!cancelled) {
          setLoading(false);
          shimmerAnim.current?.stop();
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // Fade in when movie is ready
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading && movie) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: ND,
      }).start();
    }
  }, [loading, movie, fadeAnim]);

  // Hide entirely when Family Mode is locked — the day's pick is unfiltered.
  if (familyActive) return null;

  if (loading) {
    return (
      <Animated.View
        style={[
          styles.skeleton,
          { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] }) },
        ]}
      />
    );
  }

  // Apply Family Mode filter even when unlocked (covers the brief unlock window).
  const visible = filterMovies(movie ? [movie] : []);
  if (!movie || !visible.length) return null;

  const rating = parseFloat(movie.imdbRating);
  const ratingLabel = !isNaN(rating) && rating > 0 ? rating.toFixed(1) : null;

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLine} />
        <Text style={styles.sectionLabel}>🍿 MOVIE OF THE DAY</Text>
        <View style={styles.headerLine} />
      </View>

      {/* Video / image */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onPress(movie)}
        style={styles.videoWrap}
      >
        <MovieOfTheDayVideo
          trailerKey={movie.trailerKey}
          backdropUri={movie.Backdrop || movie.Poster}
          height={VIDEO_H}
        />

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.97)', '#000']}
          locations={[0, 0.45, 0.75, 1]}
          style={styles.gradient}
        />

        {/* Content overlaid on gradient */}
        <View style={styles.overlay}>
          {movie.tagline ? (
            <Text style={styles.tagline} numberOfLines={1}>
              {movie.tagline}
            </Text>
          ) : null}

          <Text style={styles.title} numberOfLines={2}>
            {movie.Title}
          </Text>

          <View style={styles.metaRow}>
            {ratingLabel && (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={11} color={colors.gold} />
                <Text style={styles.ratingText}>{ratingLabel}</Text>
              </View>
            )}
            {movie.Year ? <Text style={styles.metaText}>{movie.Year}</Text> : null}
            {movie.Genre ? (
              <Text style={styles.metaText} numberOfLines={1}>
                {movie.Genre.split(',')[0].trim()}
              </Text>
            ) : null}
            {movie.certification ? (
              <View style={styles.certBadge}>
                <Text style={styles.certText}>{movie.certification}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {/* Watch Now button */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.watchBtn}
          activeOpacity={0.85}
          onPress={() => onPress(movie)}
        >
          <Ionicons name="play" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.watchBtnText}>Watch Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoBtn}
          activeOpacity={0.8}
          onPress={() => onPress(movie)}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoBtnText}>More Info</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.black,
    paddingTop: 70, // leave room for the floating ISMAIL CINEMA header
  },
  skeleton: {
    height: VIDEO_H + 110,
    backgroundColor: colors.surfaceCard,
    marginTop: 70,
  },

  // Section header row
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  headerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.goldMuted,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Video area
  videoWrap: {
    width: '100%',
    height: VIDEO_H,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tagline: {
    color: colors.goldMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
    ...Platform.select({
      web: { textShadow: '0 2px 12px rgba(0,0,0,0.9)' } as object,
      default: {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.goldMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  certBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  certText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 6,
    ...Platform.select({
      web: { boxShadow: `0 4px 20px ${colors.redGlow}` } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  watchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  infoBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
});

export default MovieOfTheDay;
