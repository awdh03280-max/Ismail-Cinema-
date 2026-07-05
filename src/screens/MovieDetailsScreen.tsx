import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getDetails, Movie } from '../api/tmdb';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  addToContinueWatching,
  getPlaybackPosition,
} from '../storage/storage';
import { colors } from '../theme/colors';

/** Parse "120 min" → 120. Returns 0 if unreadable. */
const parseRuntime = (runtime: string): number => {
  const match = runtime?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const MovieDetailsScreen = ({ route, navigation }: any) => {
  const { movieId, contentType } = route.params;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  useEffect(() => {
    loadMovieDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      const details = await getDetails(movieId, contentType);
      setMovie(details);
      const fav = await isFavorite(movieId);
      setIsFav(fav);
      const pos = await getPlaybackPosition(movieId);
      setSavedProgress(pos ?? 0);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!movie) return;
    if (isFav) {
      await removeFromFavorites(movieId);
      setIsFav(false);
    } else {
      await addToFavorites({
        imdbID: movieId,
        title: movie.Title,
        poster: movie.Poster,
        addedAt: Date.now(),
      });
      setIsFav(true);
    }
  };

  const handleWatchNow = async () => {
    if (!movie) return;

    const runtimeMinutes = parseRuntime(movie.Runtime);

    // Ensure it's in Continue Watching list before opening player
    await addToContinueWatching({
      imdbID: movieId,
      title: movie.Title,
      poster: movie.Poster,
      progress: savedProgress,
      watchedAt: Date.now(),
    });

    navigation.navigate('Player', {
      movieId,
      title: movie.Title,
      poster: movie.Poster,
      runtimeMinutes,
      initialProgress: savedProgress,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.red} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Movie not found</Text>
      </View>
    );
  }

  const hasProgress = savedProgress > 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: movie.Backdrop || movie.Poster }} style={styles.poster} />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.7)', '#000000']}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconButton}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.iconButton}>
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={22}
                color={isFav ? colors.red : '#fff'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.title}>{movie.Title}</Text>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.rating}>{movie.imdbRating}</Text>
              </View>
              {!!movie.Year && <Text style={styles.year}>{movie.Year}</Text>}
              {!!movie.Type && <Text style={styles.type}>{movie.Type.toUpperCase()}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Progress bar shown if user has started watching */}
          {hasProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${savedProgress}%` as any }]}
                />
              </View>
              <Text style={styles.progressLabel}>{Math.round(savedProgress)}% watched</Text>
            </View>
          )}

          {/* Huge Watch / Resume button — the primary action on this screen */}
          <TouchableOpacity style={styles.playButton} onPress={handleWatchNow} activeOpacity={0.85}>
            <Ionicons name="play" size={26} color="#fff" />
            <Text style={styles.playButtonText}>
              {hasProgress ? 'Resume' : 'Watch Now'}
            </Text>
            {hasProgress && (
              <View style={styles.resumeBadge}>
                <Text style={styles.resumeBadgeText}>{Math.round(savedProgress)}%</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.sectionContent}>{movie.Plot}</Text>
          </View>

          <View style={styles.metaGrid}>
            {!!movie.Genre && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Genre</Text>
                <Text style={styles.metaValue}>{movie.Genre}</Text>
              </View>
            )}
            {!!movie.Runtime && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Runtime</Text>
                <Text style={styles.metaValue}>{movie.Runtime}</Text>
              </View>
            )}
            {!!movie.Language && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Language</Text>
                <Text style={styles.metaValue}>{movie.Language.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {!!movie.Director && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Director</Text>
              <Text style={styles.sectionContent}>{movie.Director}</Text>
            </View>
          )}

          {!!movie.Cast && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <Text style={styles.sectionContent}>{movie.Cast}</Text>
            </View>
          )}

          {/* Reserved space for future Cast/Director/Crew detail cards, and
              Comments — intentionally left as placeholders, not implemented. */}
          <View style={styles.reservedSection}>
            <View style={styles.reservedHeader}>
              <Ionicons name="people-outline" size={18} color={colors.textMuted} />
              <Text style={styles.reservedTitle}>Full Cast & Crew</Text>
            </View>
            <Text style={styles.reservedNote}>Coming soon</Text>
          </View>

          <View style={styles.reservedSection}>
            <View style={styles.reservedHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textMuted} />
              <Text style={styles.reservedTitle}>Comments</Text>
            </View>
            <Text style={styles.reservedNote}>Coming soon</Text>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  heroWrap: {
    width: '100%',
    height: 460,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  content: {
    paddingHorizontal: 18,
    marginTop: -8,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 0.3,
    ...Platform.select({
      web: { textShadow: '0 2px 14px rgba(0,0,0,0.85)' } as object,
      default: {
        textShadowColor: 'rgba(0,0,0,0.85)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 14,
      },
    }),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  rating: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 13,
  },
  year: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  type: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginBottom: 18,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.red,
    borderRadius: 2,
  },
  progressLabel: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.red,
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 28,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 8px 26px rgba(229,9,20,0.55)' } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
        elevation: 8,
      },
    }),
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 19,
    letterSpacing: 0.3,
  },
  resumeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  resumeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  metaItem: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: '30%',
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionContent: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  reservedSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  reservedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reservedTitle: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  reservedNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 26,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default MovieDetailsScreen;
