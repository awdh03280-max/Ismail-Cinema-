import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  getDetails,
  getCredits,
  getSimilarTitles,
  getRecommendedTitles,
  Movie,
  CreditsResult,
} from '../api/tmdb';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  addToContinueWatching,
  getPlaybackPosition,
} from '../storage/storage';
import { colors } from '../theme/colors';
import CastCard from '../components/CastCard';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';

/** Parse "120 min" → 120. Returns 0 if unreadable. */
const parseRuntime = (runtime: string): number => {
  const match = runtime?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const formatReleaseDate = (raw: string): string => {
  if (!raw) return '';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const MovieDetailsScreen = ({ route, navigation }: any) => {
  const { movieId, contentType } = route.params;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [credits, setCredits] = useState<CreditsResult | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [recommended, setRecommended] = useState<Movie[]>([]);
  const [rowFavorites, setRowFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const backdropScale = useRef(new Animated.Value(1.12)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const playPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  useEffect(() => {
    loadMovieDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  useEffect(() => {
    if (!loading && movie) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(backdropScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 650,
          delay: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 650,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(playPulse, {
            toValue: 1.05,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(playPulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, movie]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      const details = await getDetails(movieId, contentType);
      setMovie(details);

      const fav = await isFavorite(movieId);
      setIsFav(fav);

      const pos = await getPlaybackPosition(movieId);
      setSavedProgress(pos ?? 0);

      const [creditsRes, similarRes, recommendedRes] = await Promise.all([
        getCredits(movieId, contentType),
        getSimilarTitles(movieId, contentType),
        getRecommendedTitles(movieId, contentType),
      ]);

      setCredits(creditsRes);
      setSimilar(similarRes.slice(0, 12));
      setRecommended(recommendedRes.slice(0, 12));

      const rowMovies = [...similarRes.slice(0, 12), ...recommendedRes.slice(0, 12)];
      const favSet = new Set<string>();
      for (const m of rowMovies) {
        if (await isFavorite(m.imdbID)) favSet.add(m.imdbID);
      }
      setRowFavorites(favSet);
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

  const handleRowFavoritePress = async (m: Movie) => {
    if (rowFavorites.has(m.imdbID)) {
      await removeFromFavorites(m.imdbID);
      const next = new Set(rowFavorites);
      next.delete(m.imdbID);
      setRowFavorites(next);
    } else {
      await addToFavorites({
        imdbID: m.imdbID,
        title: m.Title,
        poster: m.Poster,
        addedAt: Date.now(),
      });
      const next = new Set(rowFavorites);
      next.add(m.imdbID);
      setRowFavorites(next);
    }
  };

  const handleOpenTitle = (m: Movie) => {
    navigation.push('MovieDetails', {
      movieId: m.imdbID,
      contentType: m.contentType,
    });
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

  const infoCards = [
    { icon: 'calendar-outline', label: 'Release Date', value: formatReleaseDate(movie.Released) },
    { icon: 'time-outline', label: 'Runtime', value: movie.Runtime },
    { icon: 'film-outline', label: 'Genres', value: movie.Genre },
    { icon: 'language-outline', label: 'Language', value: movie.Language?.toUpperCase() },
    { icon: 'earth-outline', label: 'Country', value: movie.Country },
    {
      icon: 'star',
      label: 'TMDB Rating',
      value: `${movie.imdbRating} / 10${movie.voteCount ? `  ·  ${movie.voteCount.toLocaleString()} votes` : ''}`,
    },
  ].filter((c) => !!c.value);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Animated.Image
            source={{ uri: movie.Backdrop || movie.Poster }}
            style={[
              styles.poster,
              { opacity: backdropOpacity, transform: [{ scale: backdropScale }] },
            ]}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.75)', '#000000']}
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

          <Animated.View
            style={[
              styles.heroContent,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.title}>{movie.Title}</Text>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.rating}>{movie.imdbRating}</Text>
              </View>
              {!!movie.Year && <Text style={styles.year}>{movie.Year}</Text>}
              {!!movie.Type && <Text style={styles.type}>{movie.Type.toUpperCase()}</Text>}
            </View>
          </Animated.View>
        </View>

        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
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
          <Animated.View style={{ transform: [{ scale: playPulse }] }}>
            <TouchableOpacity style={styles.playButton} onPress={handleWatchNow} activeOpacity={0.85}>
              <Ionicons name="play" size={28} color="#fff" />
              <Text style={styles.playButtonText}>
                {hasProgress ? 'Resume' : 'Watch Now'}
              </Text>
              {hasProgress && (
                <View style={styles.resumeBadge}>
                  <Text style={styles.resumeBadgeText}>{Math.round(savedProgress)}%</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.sectionContent}>{movie.Plot}</Text>
          </View>

          {/* Info cards grid */}
          <View style={styles.infoGrid}>
            {infoCards.map((c) => (
              <View key={c.label} style={styles.infoCard}>
                <View style={styles.infoCardIconWrap}>
                  <Ionicons name={c.icon as any} size={16} color={colors.gold} />
                </View>
                <Text style={styles.infoCardLabel}>{c.label}</Text>
                <Text style={styles.infoCardValue}>{c.value}</Text>
              </View>
            ))}
          </View>

          {/* Director / Writers / Producers */}
          {(!!movie.Director || !!credits?.writers.length || !!credits?.producers.length) && (
            <View style={styles.creditsRow}>
              {!!movie.Director && (
                <View style={styles.creditsBlock}>
                  <Text style={styles.creditsLabel}>Director</Text>
                  <Text style={styles.creditsValue}>{movie.Director}</Text>
                </View>
              )}
              {!!credits?.writers.length && (
                <View style={styles.creditsBlock}>
                  <Text style={styles.creditsLabel}>Writers</Text>
                  <Text style={styles.creditsValue}>{credits.writers.join(', ')}</Text>
                </View>
              )}
              {!!credits?.producers.length && (
                <View style={styles.creditsBlock}>
                  <Text style={styles.creditsLabel}>Producers</Text>
                  <Text style={styles.creditsValue}>{credits.producers.join(', ')}</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Cast carousel */}
        {!!credits?.cast.length && (
          <View>
            <SectionTitle title="Cast" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.castRow}>
                {credits.cast.map((c) => (
                  <CastCard
                    key={c.id}
                    name={c.name}
                    role={c.character}
                    profilePath={c.profilePath}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Full crew */}
        {!!credits?.crew.length && (
          <View style={styles.crewSection}>
            <Text style={styles.sectionTitle}>Full Crew</Text>
            <View style={styles.crewList}>
              {credits.crew.map((c, idx) => (
                <View key={`${c.id}-${c.job}-${idx}`} style={styles.crewItem}>
                  <Text style={styles.crewName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.crewJob} numberOfLines={1}>{c.job}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Similar Movies */}
        {!!similar.length && (
          <View>
            <SectionTitle title="Similar Movies" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carousel}>
                {similar.map((m) => (
                  <MovieCard
                    key={m.imdbID}
                    movie={m}
                    onPress={() => handleOpenTitle(m)}
                    onFavoritePress={() => handleRowFavoritePress(m)}
                    isFavorite={rowFavorites.has(m.imdbID)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Recommended Movies */}
        {!!recommended.length && (
          <View>
            <SectionTitle title="Recommended For You" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carousel}>
                {recommended.map((m) => (
                  <MovieCard
                    key={m.imdbID}
                    movie={m}
                    onPress={() => handleOpenTitle(m)}
                    onFavoritePress={() => handleRowFavoritePress(m)}
                    isFavorite={rowFavorites.has(m.imdbID)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Comments — UI placeholder only, no functionality yet */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments</Text>

          <View style={styles.commentInputRow}>
            <View style={styles.commentAvatar}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your thoughts about this title..."
              placeholderTextColor={colors.textMuted}
              editable={false}
              pointerEvents="none"
            />
            <View style={styles.commentSendButton}>
              <Ionicons name="send" size={16} color={colors.textMuted} />
            </View>
          </View>

          <View style={styles.commentsEmpty}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.textMuted} />
            <Text style={styles.commentsEmptyText}>No comments yet</Text>
            <Text style={styles.commentsEmptyNote}>Comments are coming soon</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  heroWrap: {
    width: '100%',
    height: 500,
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
    zIndex: 5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
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
    fontSize: 32,
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
    paddingVertical: 20,
    borderRadius: 14,
    marginBottom: 28,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 10px 32px rgba(229,9,20,0.6)' } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.65,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  infoCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: '47%',
    flexGrow: 1,
  },
  infoCardIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(212,175,55,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoCardLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoCardValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  creditsRow: {
    marginBottom: 8,
    gap: 16,
  },
  creditsBlock: {
    marginBottom: 14,
  },
  creditsLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  creditsValue: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  castRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  carousel: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  crewSection: {
    paddingHorizontal: 18,
    marginTop: 24,
  },
  crewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  crewItem: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '47%',
    flexGrow: 1,
  },
  crewName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  crewJob: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  commentsSection: {
    paddingHorizontal: 18,
    marginTop: 28,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  commentSendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  commentsEmptyText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 10,
  },
  commentsEmptyNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default MovieDetailsScreen;
