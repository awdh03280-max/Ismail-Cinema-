import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Movie,
  getTrendingNow,
  getTopRatedMovies,
  getMustWatchMovies,
  getMustWatchSeries,
  getTopRatedAnime,
  getTopRatedAnimation,
  getRecentlyAdded,
} from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import HeroBanner from '../components/HeroBanner';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getContinueWatching,
  ContinueWatchingMovie,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';
import { colors } from '../theme/colors';

interface HomeSection {
  key: string;
  title: string;
  movies: Movie[];
}

/** Maps a stored continue-watching entry to the minimal shape MovieCard needs. */
const toContinueWatchingMovie = (m: ContinueWatchingMovie): Movie => {
  const ct = m.contentType ?? 'movie';
  return {
    imdbID: m.imdbID,
    Title: m.title,
    Year: '',
    Poster: m.poster,
    Backdrop: '',
    Plot: '',
    imdbRating: 'N/A',
    voteCount: 0,
    Runtime: '',
    Genre: '',
    Director: '',
    Cast: '',
    Type: ct === 'tv' ? 'series' : 'movie',
    Released: '',
    Language: '',
    Country: '',
    adult: false,
    contentType: ct,
    // Detail-only fields — safe defaults for the card view
    trailerKey: '',
    certification: '',
    productionCompanies: [],
    imdbExternalId: '',
    tagline: '',
  };
};

const HomeScreen = ({ navigation }: any) => {
  const [hero, setHero] = useState<Movie[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { isEnabled, isUnlocked, filterMovies } = useFamilyMode();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  const loadMovies = useCallback(async () => {
    try {
      setLoading(true);

      const [
        trending,
        topRated,
        mustWatchMovies,
        mustWatchSeries,
        bestAnime,
        bestAnimation,
        continueWatching,
        recentlyAdded,
      ] = await Promise.all([
        getTrendingNow(),
        getTopRatedMovies(),
        getMustWatchMovies(),
        getMustWatchSeries(),
        getTopRatedAnime(),
        getTopRatedAnimation(),
        getContinueWatching(),
        getRecentlyAdded(),
      ]);

      const filteredHero = filterMovies(trending.slice(0, 6));

      const rawSections: HomeSection[] = [
        { key: 'trending', title: '🔥 Trending Now', movies: trending },
        { key: 'topRated', title: '⭐ Top Rated Movies', movies: topRated },
        { key: 'mustWatchMovies', title: '🍿 Must Watch Movies', movies: mustWatchMovies },
        { key: 'mustWatchSeries', title: '📺 Must Watch Series', movies: mustWatchSeries },
        { key: 'bestAnime', title: '🎌 Best Anime', movies: bestAnime },
        { key: 'bestAnimation', title: '🎨 Best Animation', movies: bestAnimation },
        {
          key: 'continueWatching',
          title: '❤️ Continue Watching',
          movies: continueWatching
            .sort((a, b) => b.watchedAt - a.watchedAt)
            .map(toContinueWatchingMovie),
        },
        { key: 'recentlyAdded', title: '🆕 Recently Added', movies: recentlyAdded },
      ];

      const filteredSections = rawSections
        .map(section => ({ ...section, movies: filterMovies(section.movies) }))
        .filter(section => section.movies.length > 0);

      setHero(filteredHero);
      setSections(filteredSections);

      const allMovies = [filteredHero, ...filteredSections.map(s => s.movies)].flat();
      const favSet = new Set<string>();
      for (const movie of allMovies) {
        if (await isFavorite(movie.imdbID)) {
          favSet.add(movie.imdbID);
        }
      }
      setFavorites(favSet);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isUnlocked]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetails', { movieId: movie.imdbID, contentType: movie.contentType });
  };

  const handleFavoritePress = async (movie: Movie) => {
    if (favorites.has(movie.imdbID)) {
      await removeFromFavorites(movie.imdbID);
      const next = new Set(favorites);
      next.delete(movie.imdbID);
      setFavorites(next);
    } else {
      await addToFavorites({
        imdbID: movie.imdbID,
        title: movie.Title,
        poster: movie.Poster,
        contentType: movie.contentType,
        addedAt: Date.now(),
      });
      const next = new Set(favorites);
      next.add(movie.imdbID);
      setFavorites(next);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header overlaid on hero */}
        <View style={styles.headerOverlay}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>ISMAIL</Text>
            <Text style={styles.logoAccent}>CINEMA</Text>
          </View>

          {isEnabled && (
            <View style={[styles.fmBadge, isUnlocked && styles.fmBadgeUnlocked]}>
              <Ionicons
                name={isUnlocked ? 'shield-checkmark' : 'shield'}
                size={12}
                color="#fff"
              />
              <Text style={styles.fmBadgeText}>
                {isUnlocked ? 'Unlocked' : 'Family Mode'}
              </Text>
            </View>
          )}
        </View>

        <HeroBanner
          movies={hero}
          onPlay={handleMoviePress}
          onMoreInfo={handleMoviePress}
        />

        {sections.map(section => (
          <View key={section.key}>
            <SectionTitle title={section.title} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carousel}>
                {section.movies.map(movie => (
                  <View key={movie.imdbID} style={styles.cardWrap}>
                    <MovieCard
                      movie={movie}
                      onPress={() => handleMoviePress(movie)}
                      onFavoritePress={() => handleFavoritePress(movie)}
                      isFavorite={favorites.has(movie.imdbID)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  logoText: {
    color: colors.red,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  fmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(229,9,20,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fmBadgeUnlocked: { backgroundColor: 'rgba(30,160,30,0.7)' },
  fmBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  carousel: { flexDirection: 'row', paddingHorizontal: 16, gap: 14 },
  cardWrap: { width: 150 },
});

export default HomeScreen;
