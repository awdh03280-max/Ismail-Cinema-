/**
 * MovieDetailsScreen — premium cinematic redesign.
 *
 * Layout (top → bottom):
 *   Hero: auto-playing trailer (YouTube) OR animated backdrop with blur gradient
 *   Header: back + favourite (always overlaid on hero)
 *   Content: title, meta, genres, play button, overview, cast, companies,
 *            similar, recommended, real Firestore comments
 *
 * Unchanged: Movie Player, Google Sign-In, Firebase config.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Dimensions,
  Linking,
  KeyboardAvoidingView,
  DimensionValue,
  Alert,
} from 'react-native';
import { ND } from '../utils/animation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
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
  getFavorites,
  addToContinueWatching,
  getPlaybackPosition,
} from '../storage/storage';
import { colors } from '../theme/colors';
import CastCard from '../components/CastCard';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';
import TrailerEmbed from '../components/TrailerEmbed';
import { useXP } from '../context/XPContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRAILER_HEIGHT = Math.round(SCREEN_WIDTH * 9 / 16);
const HERO_HEIGHT = 460;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
  likes: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseRuntime = (runtime: string): number => {
  const match = runtime?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const formatRelativeTime = (ts: Timestamp | null): string => {
  if (!ts) return 'just now';
  const ms = Date.now() - ts.toMillis();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 2_592_000_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

// ── CommentCard ───────────────────────────────────────────────────────────────

interface CommentCardProps {
  comment: Comment;
  currentUid: string | null;
  onLike: (commentId: string, liked: boolean) => void;
  onAuthorPress?: (uid: string, displayName: string, photoURL: string | null) => void;
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, currentUid, onLike, onAuthorPress }) => {
  const liked = !!currentUid && comment.likes.includes(currentUid);

  return (
    <View style={commentStyles.card}>
      {/* Avatar — tappable to open public profile */}
      <View style={commentStyles.avatarCol}>
        <TouchableOpacity
          onPress={() => onAuthorPress?.(comment.uid, comment.displayName, comment.photoURL)}
          activeOpacity={0.75}
          disabled={!onAuthorPress || comment.uid === currentUid}
        >
          {comment.photoURL ? (
            <Image source={{ uri: comment.photoURL }} style={commentStyles.avatar} />
          ) : (
            <View style={[commentStyles.avatar, commentStyles.avatarFallback]}>
              <Text style={commentStyles.avatarInitials}>{initials(comment.displayName)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={commentStyles.threadLine} />
      </View>

      {/* Body */}
      <View style={commentStyles.body}>
        <View style={commentStyles.headerRow}>
          <TouchableOpacity
            onPress={() => onAuthorPress?.(comment.uid, comment.displayName, comment.photoURL)}
            activeOpacity={0.7}
            disabled={!onAuthorPress || comment.uid === currentUid}
          >
            <Text style={commentStyles.name}>{comment.displayName}</Text>
          </TouchableOpacity>
          <Text style={commentStyles.time}>{formatRelativeTime(comment.createdAt)}</Text>
        </View>
        <Text style={commentStyles.text}>{comment.text}</Text>
        <View style={commentStyles.actionsRow}>
          <TouchableOpacity
            style={commentStyles.likeBtn}
            onPress={() => onLike(comment.id, liked)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={15}
              color={liked ? colors.red : colors.textMuted}
            />
            {comment.likes.length > 0 && (
              <Text style={[commentStyles.likeCount, liked && { color: colors.red }]}>
                {comment.likes.length}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const commentStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  avatarCol: {
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceCard,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  avatarInitials: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 13,
  },
  threadLine: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
    marginTop: 6,
    marginBottom: -6,
  },
  body: {
    flex: 1,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────────

const MovieDetailsScreen = ({ route, navigation }: any) => {
  const { movieId, contentType } = route.params;
  const { user, userProfile } = useAuth();
  const { trackContentWatched, trackComment } = useXP();

  // Content state
  const [movie, setMovie] = useState<Movie | null>(null);
  const [credits, setCredits] = useState<CreditsResult | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [recommended, setRecommended] = useState<Movie[]>([]);
  const [rowFavorites, setRowFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const backdropScale = useRef(new Animated.Value(1.15)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const playPulse = useRef(new Animated.Value(1)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') StatusBar.setBackgroundColor('#000000');
  }, []);

  useEffect(() => {
    loadMovieDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  useEffect(() => {
    if (!loading && movie) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 800, useNativeDriver: ND }),
        Animated.timing(backdropScale, { toValue: 1, duration: 1400, useNativeDriver: ND }),
        Animated.timing(heroFade, { toValue: 1, duration: 600, useNativeDriver: ND }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: ND }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 200, useNativeDriver: ND }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(playPulse, { toValue: 1.04, duration: 1000, useNativeDriver: ND }),
          Animated.timing(playPulse, { toValue: 1, duration: 1000, useNativeDriver: ND }),
        ])
      ).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, movie]);

  // Real-time comments subscription
  // Key includes contentType so movie/TV threads with the same TMDB numeric ID
  // never collide (e.g. movie 1396 vs TV show 1396).
  const commentDocId = `${contentType}_${movieId}`;
  useEffect(() => {
    if (!movieId) return;
    const commentsRef = collection(db, 'movieComments', commentDocId, 'threads');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const loaded: Comment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Comment, 'id'>),
      }));
      setComments(loaded);
    });
    return unsub;
  }, [movieId]);

  // ── Data Loading ───────────────────────────────────────────────────────────

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      const details = await getDetails(movieId, contentType);
      setMovie(details);

      const [fav, pos, creditsRes, similarRes, recommendedRes, allFavs] =
        await Promise.all([
          isFavorite(movieId),
          getPlaybackPosition(movieId),
          getCredits(movieId, contentType),
          getSimilarTitles(movieId, contentType),
          getRecommendedTitles(movieId, contentType),
          getFavorites(),
        ]);

      setIsFav(fav);
      setSavedProgress(pos ?? 0);
      setCredits(creditsRes);
      setSimilar(similarRes.slice(0, 12));
      setRecommended(recommendedRes.slice(0, 12));

      const favIds = new Set(allFavs.map((f) => f.imdbID));
      const rowMovies = [...similarRes.slice(0, 12), ...recommendedRes.slice(0, 12)];
      setRowFavorites(new Set(rowMovies.map((m) => m.imdbID).filter((id) => favIds.has(id))));
    } catch (err) {
      console.error('[MovieDetails] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

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
        contentType,
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
        contentType: m.contentType,
        addedAt: Date.now(),
      });
      const next = new Set(rowFavorites);
      next.add(m.imdbID);
      setRowFavorites(next);
    }
  };

  const handleOpenTitle = (m: Movie) => {
    navigation.push('MovieDetails', { movieId: m.imdbID, contentType: m.contentType });
  };

  const handleWatchNow = async () => {
    if (!movie) return;
    const runtimeMinutes = parseRuntime(movie.Runtime);
    await addToContinueWatching({
      imdbID: movieId,
      title: movie.Title,
      poster: movie.Poster,
      progress: savedProgress,
      watchedAt: Date.now(),
    });
    // Track for achievements — pass imdbID so the same title is only counted
    // once per session even if the user taps "Watch Now" multiple times.
    const genres = movie.Genre
      ? movie.Genre.split(',').map((g: string) => g.trim())
      : [];
    trackContentWatched({ imdbID: movieId, contentType, genres }).catch(() => {});
    navigation.navigate('Player', {
      movieId,
      title: movie.Title,
      poster: movie.Poster,
      contentType,
      runtimeMinutes,
      initialProgress: savedProgress,
    });
  };

  const handlePostComment = async () => {
    if (!user || !userProfile || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const commentsRef = collection(db, 'movieComments', commentDocId, 'threads');
      await addDoc(commentsRef, {
        uid: user.uid,
        displayName: userProfile.displayName || 'Cinema User',
        photoURL: userProfile.photoURL ?? null,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
      });
      setCommentText('');
      // Track comment for achievements (fire-and-forget)
      trackComment().catch(() => {});
    } catch (err) {
      console.error('[MovieDetails] post comment error:', err);
      Alert.alert('Could not post comment', 'Please check your connection and try again.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleToggleLike = async (commentId: string, liked: boolean) => {
    if (!user) return;
    const ref = doc(db, 'movieComments', commentDocId, 'threads', commentId);
    try {
      await updateDoc(ref, {
        likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (err) {
      console.error('[MovieDetails] like error:', err);
    }
  };

  const handleOpenIMDb = () => {
    if (movie?.imdbExternalId) {
      Linking.openURL(`https://www.imdb.com/title/${movie.imdbExternalId}`);
    }
  };

  // ── Loading / Error States ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="film-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Title not found</Text>
      </View>
    );
  }

  const hasProgress = savedProgress > 0;
  const hasTrailer = !!movie.trailerKey;
  const heroHeight = hasTrailer ? TRAILER_HEIGHT : HERO_HEIGHT;

  const genreList = movie.Genre
    ? movie.Genre.split(',').map((g) => g.trim()).filter(Boolean)
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView
        style={styles.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Hero: Trailer OR Backdrop ──────────────────────────────────── */}
        <View style={[styles.heroWrap, { height: heroHeight }]}>
          {hasTrailer ? (
            <TrailerEmbed
              trailerKey={movie.trailerKey}
              height={heroHeight}
              backdropUri={movie.Backdrop || movie.Poster}
            />
          ) : (
            <>
              <Animated.Image
                source={{ uri: movie.Backdrop || movie.Poster }}
                style={[
                  styles.backdrop,
                  {
                    opacity: backdropOpacity,
                    transform: [{ scale: backdropScale }],
                  },
                ]}
                resizeMode="cover"
              />
              {/* Cinematic blur layer on web */}
              {Platform.OS === 'web' && (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backdropFilter: 'blur(1px) brightness(0.9)' } as any,
                  ]}
                />
              )}
            </>
          )}

          {/* Gradient overlay — darkens bottom for text legibility */}
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'transparent', 'rgba(0,0,0,0.6)', '#000']}
            locations={[0, 0.3, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Gold shimmer accent line at bottom of hero */}
          <View style={styles.heroAccentLine} />

          {/* Header bar — overlaid on hero */}
          <Animated.View style={[styles.headerBar, { opacity: heroFade }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconBtn}>
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={21}
                color={isFav ? colors.red : '#fff'}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Title Block ────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.titleBlock,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {movie.contentType === 'tv' ? 'SERIES' : 'MOVIE'}
            </Text>
          </View>

          <Text style={styles.title}>{movie.Title}</Text>

          {!!movie.tagline && (
            <Text style={styles.tagline}>"{movie.tagline}"</Text>
          )}

          {/* ── Rating + Meta row ──────────────────────────────────────── */}
          <View style={styles.metaRow}>
            {/* TMDB Rating */}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color={colors.gold} />
              <Text style={styles.ratingText}>{movie.imdbRating}</Text>
              <Text style={styles.ratingLabel}>TMDB</Text>
            </View>

            {/* IMDb badge (links to IMDb) */}
            {!!movie.imdbExternalId && (
              <TouchableOpacity style={styles.imdbBadge} onPress={handleOpenIMDb} activeOpacity={0.8}>
                <Text style={styles.imdbText}>IMDb</Text>
                <Ionicons name="open-outline" size={10} color="#f5c518" />
              </TouchableOpacity>
            )}

            {/* Year */}
            {!!movie.Year && <Text style={styles.metaPill}>{movie.Year}</Text>}

            {/* Runtime */}
            {!!movie.Runtime && <Text style={styles.metaPill}>{movie.Runtime}</Text>}

            {/* Age certification */}
            {!!movie.certification && (
              <View style={styles.certBadge}>
                <Text style={styles.certText}>{movie.certification}</Text>
              </View>
            )}
          </View>

          {/* ── Genre chips ────────────────────────────────────────────── */}
          {genreList.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genreRow}
            >
              {genreList.map((g) => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreChipText}>{g}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Animated content block ─────────────────────────────────────── */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Progress bar ────────────────────────────────────────────── */}
          {hasProgress && (
            <View style={styles.progressWrap}>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${savedProgress}%` as DimensionValue }]} />
                </View>
                <Text style={styles.progressLabel}>{Math.round(savedProgress)}%</Text>
              </View>
            </View>
          )}

          {/* ── Huge Play / Resume Button ─────────────────────────────── */}
          <View style={styles.section}>
            <Animated.View style={{ transform: [{ scale: playPulse }] }}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handleWatchNow}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#ff2a35', colors.red, '#b5000c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playGradient}
                >
                  <Ionicons name={hasProgress ? 'play-circle' : 'play'} size={26} color="#fff" />
                  <Text style={styles.playButtonText}>
                    {hasProgress ? `Resume  ·  ${Math.round(savedProgress)}%` : 'Watch Now'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Add to Watchlist secondary button */}
            <TouchableOpacity
              style={styles.watchlistBtn}
              onPress={handleToggleFavorite}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFav ? 'checkmark-circle' : 'add-circle-outline'}
                size={20}
                color={isFav ? colors.gold : colors.textSecondary}
              />
              <Text style={[styles.watchlistText, isFav && { color: colors.gold }]}>
                {isFav ? 'In Watchlist' : 'Add to Watchlist'}
              </Text>
            </TouchableOpacity>

            {/* Watch Party button */}
            <TouchableOpacity
              style={styles.watchPartyBtn}
              onPress={() =>
                navigation.navigate('WatchParty', {
                  movieId,
                  movieTitle: movie.Title,
                  moviePoster: movie.Poster,
                  contentType,
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={18} color={colors.gold} />
              <Text style={styles.watchPartyText}>Watch Party</Text>
            </TouchableOpacity>
          </View>

          {/* ── Overview ──────────────────────────────────────────────── */}
          {!!movie.Plot && (
            <View style={styles.overviewSection}>
              <Text style={styles.sectionHeading}>Overview</Text>
              <Text
                style={styles.overviewText}
                numberOfLines={overviewExpanded ? undefined : 4}
              >
                {movie.Plot}
              </Text>
              {movie.Plot.length > 200 && (
                <TouchableOpacity
                  onPress={() => setOverviewExpanded((v) => !v)}
                  style={styles.readMoreBtn}
                >
                  <Text style={styles.readMoreText}>
                    {overviewExpanded ? 'Show less' : 'Read more'}
                  </Text>
                  <Ionicons
                    name={overviewExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.gold}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Director / Creator ─────────────────────────────────────── */}
          {(!!movie.Director || !!credits?.writers.length) && (
            <View style={styles.crewRow}>
              {!!movie.Director && (
                <View style={styles.crewBlock}>
                  <Text style={styles.crewLabel}>
                    {movie.contentType === 'tv' ? 'Creator' : 'Director'}
                  </Text>
                  <Text style={styles.crewValue}>{movie.Director}</Text>
                </View>
              )}
              {!!credits?.writers.length && (
                <View style={styles.crewBlock}>
                  <Text style={styles.crewLabel}>Writers</Text>
                  <Text style={styles.crewValue}>{credits.writers.slice(0, 3).join(', ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Production Companies ───────────────────────────────────── */}
          {movie.productionCompanies?.length > 0 && (
            <View style={styles.companiesSection}>
              <Text style={styles.sectionHeading}>Production</Text>
              <View style={styles.companiesRow}>
                {movie.productionCompanies.map((co) => (
                  <View key={co} style={styles.companyChip}>
                    <Ionicons name="business-outline" size={11} color={colors.gold} />
                    <Text style={styles.companyName} numberOfLines={1}>{co}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* ── Cast ─────────────────────────────────────────────────────────── */}
        {!!credits?.cast.length && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <SectionTitle title="Cast" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.castRow}
            >
              {credits.cast.map((c) => (
                <CastCard
                  key={c.id}
                  name={c.name}
                  role={c.character}
                  profilePath={c.profilePath}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Similar Movies ────────────────────────────────────────────────── */}
        {!!similar.length && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <SectionTitle title="Similar Titles" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {similar.map((m) => (
                <MovieCard
                  key={m.imdbID}
                  movie={m}
                  onPress={() => handleOpenTitle(m)}
                  onFavoritePress={() => handleRowFavoritePress(m)}
                  isFavorite={rowFavorites.has(m.imdbID)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Recommended Movies ────────────────────────────────────────────── */}
        {!!recommended.length && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <SectionTitle title="Recommended For You" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {recommended.map((m) => (
                <MovieCard
                  key={m.imdbID}
                  movie={m}
                  onPress={() => handleOpenTitle(m)}
                  onFavoritePress={() => handleRowFavoritePress(m)}
                  isFavorite={rowFavorites.has(m.imdbID)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Comments Section ──────────────────────────────────────────────── */}
        <Animated.View style={[styles.commentsSection, { opacity: fadeAnim }]}>
          {/* Decorative gold header line */}
          <View style={styles.commentsSectionHeader}>
            <View style={styles.goldBar} />
            <Text style={styles.sectionHeading}>Comments</Text>
            <Text style={styles.commentCount}>{comments.length}</Text>
          </View>

          {/* Input row */}
          {user ? (
            <View style={styles.inputCard}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={styles.inputAvatar} />
              ) : (
                <View style={[styles.inputAvatar, styles.inputAvatarFallback]}>
                  <Text style={styles.inputAvatarInitials}>
                    {initials(userProfile?.displayName ?? 'U')}
                  </Text>
                </View>
              )}
              <TextInput
                style={styles.commentInput}
                placeholder="Share your thoughts..."
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!commentText.trim() || postingComment) && styles.sendBtnDisabled,
                ]}
                onPress={handlePostComment}
                disabled={!commentText.trim() || postingComment}
                activeOpacity={0.8}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.loginPrompt}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={22} color={colors.gold} />
              <Text style={styles.loginPromptText}>Sign in to join the conversation</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.gold} />
            </TouchableOpacity>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
              <Text style={styles.emptyCommentsNote}>Be the first to share your thoughts!</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  currentUid={user?.uid ?? null}
                  onLike={handleToggleLike}
                  onAuthorPress={(uid, displayName, photoURL) =>
                    navigation.push('PublicProfile', { uid, displayName, photoURL })
                  }
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },

  // ── Hero ──
  heroWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heroAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.goldMuted,
  },
  headerBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any,
    }),
  },

  // ── Title block ──
  titleBlock: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  typeBadgeText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 36,
    marginBottom: 6,
    ...Platform.select({
      web: { textShadow: '0 2px 20px rgba(0,0,0,0.9)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 16,
      },
    }),
  },
  tagline: {
    color: colors.goldMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 14,
    lineHeight: 18,
  },

  // ── Meta row ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ratingText: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 13,
  },
  ratingLabel: {
    color: colors.goldMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  imdbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5c518',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imdbText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  metaPill: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certBadge: {
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  certText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Genre chips ──
  genreRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  genreChip: {
    backgroundColor: 'rgba(212,175,55,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  genreChipText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Section spacing ──
  section: {
    paddingHorizontal: 18,
    marginTop: 22,
  },

  // ── Progress bar ──
  progressWrap: {
    paddingHorizontal: 18,
    marginTop: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.red,
    borderRadius: 2,
  },
  progressLabel: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
  },

  // ── Play button ──
  playButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 10px 36px rgba(229,9,20,0.65)' } as any,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  playGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 19,
    letterSpacing: 0.3,
  },
  watchlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  watchlistText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Overview ──
  overviewSection: {
    paddingHorizontal: 18,
    marginTop: 28,
  },
  sectionHeading: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  overviewText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  readMoreText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Crew ──
  crewRow: {
    paddingHorizontal: 18,
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  crewBlock: {
    flex: 1,
    minWidth: 120,
  },
  crewLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  crewValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // ── Companies ──
  companiesSection: {
    paddingHorizontal: 18,
    marginTop: 24,
  },
  companiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  companyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  companyName: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 160,
  },

  // ── Cast & Carousel rows ──
  castRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 14,
  },
  carousel: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── Comments ──
  commentsSection: {
    paddingHorizontal: 18,
    marginTop: 36,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  goldBar: {
    width: 4,
    height: 18,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  commentCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: -4,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 22,
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceElevated,
  },
  inputAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  inputAvatarInitials: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  commentInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(229,9,20,0.5)' } as any,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    ...Platform.select({
      web: { boxShadow: 'none' } as object,
      default: { shadowOpacity: 0, elevation: 0 },
    }),
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 22,
  },
  loginPromptText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  commentsList: {
    gap: 4,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  emptyCommentsTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyCommentsNote: {
    color: colors.textMuted,
    fontSize: 13,
  },

  // ── Watch Party ──
  watchPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  watchPartyText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default MovieDetailsScreen;
