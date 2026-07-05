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
import { getCategoryFeed, ContentCategory, Movie } from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import HeroBanner from '../components/HeroBanner';
import CategoryTabs from '../components/CategoryTabs';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';
import { colors } from '../theme/colors';

const HomeScreen = ({ navigation }: any) => {
  const [category, setCategory] = useState<ContentCategory>('movies');
  const [hero, setHero] = useState<Movie[]>([]);
  const [sections, setSections] = useState<{ title: string; movies: Movie[] }[]>([]);
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
      const feed = await getCategoryFeed(category);

      const filteredHero = filterMovies(feed.hero);
      const filteredSections = feed.sections.map(section => ({
        title: section.title,
        movies: filterMovies(section.movies),
      }));

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
  }, [category, isEnabled, isUnlocked]);

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

        <View style={styles.tabsWrapper}>
          <CategoryTabs active={category} onChange={setCategory} />
        </View>

        {sections.map(section => (
          <View key={section.title}>
            <SectionTitle title={section.title} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carousel}>
                {section.movies.map(movie => (
                  <MovieCard
                    key={movie.imdbID}
                    movie={movie}
                    onPress={() => handleMoviePress(movie)}
                    onFavoritePress={() => handleFavoritePress(movie)}
                    isFavorite={favorites.has(movie.imdbID)}
                  />
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
  tabsWrapper: {
    marginTop: 18,
  },
  carousel: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
});

export default HomeScreen;
