import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAnimatedMovies,
  getAnimatedSeries,
  getFamilyAnimation,
  getKidsCollection,
  getDisneyPixarCollection,
  searchAnimation,
  Movie,
} from '../api/tmdb';
import HeroBanner from '../components/HeroBanner';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';
import { colors } from '../theme/colors';

interface AnimationSection {
  title: string;
  movies: Movie[];
}

const AnimationScreen = ({ navigation }: any) => {
  const [sections, setSections] = useState<AnimationSection[]>([]);
  const [hero, setHero] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  const { filterMovies } = useFamilyMode();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  const loadAnimation = useCallback(async () => {
    try {
      setLoading(true);
      const [movies, series, family, kids, disneyPixar] = await Promise.all([
        getAnimatedMovies(),
        getAnimatedSeries(),
        getFamilyAnimation(),
        getKidsCollection(),
        getDisneyPixarCollection(),
      ]);

      const heroList = filterMovies(disneyPixar.length ? disneyPixar : movies).slice(0, 6);
      const built: AnimationSection[] = [
        { title: 'Animated Movies', movies: filterMovies(movies) },
        { title: 'Animated Series', movies: filterMovies(series) },
        { title: 'Family Animation', movies: filterMovies(family) },
        { title: 'Kids Collection', movies: filterMovies(kids) },
        { title: 'Disney / Pixar Collection', movies: filterMovies(disneyPixar) },
      ].filter(s => s.movies.length > 0);

      setHero(heroList);
      setSections(built);

      const all = [...heroList, ...built.flatMap(s => s.movies)];
      const favSet = new Set<string>();
      for (const m of all) {
        if (await isFavorite(m.imdbID)) favSet.add(m.imdbID);
      }
      setFavorites(favSet);

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMovies]);

  useEffect(() => {
    loadAnimation();
  }, [loadAnimation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnimation();
    setRefreshing(false);
  };

  const handleOpen = (movie: Movie) => {
    navigation.navigate('MovieDetails', {
      movieId: movie.imdbID,
      contentType: movie.contentType,
    });
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      setSearched(true);
      const results = await searchAnimation(query.trim());
      const filtered = filterMovies(results);
      setSearchResults(filtered);

      const favSet = new Set(favorites);
      for (const m of filtered) {
        if (await isFavorite(m.imdbID)) favSet.add(m.imdbID);
      }
      setFavorites(favSet);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearched(false);
    setSearchResults([]);
  };

  if (loading) return <LoadingSpinner color={colors.red} />;

  const isSearchMode = searched;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        <View style={styles.headerOverlay}>
          <View style={styles.logoRow}>
            <Ionicons name="color-palette" size={16} color={colors.gold} />
            <Text style={styles.logoText}>ANIMATION</Text>
          </View>
        </View>

        {!isSearchMode && <HeroBanner movies={hero} onPlay={handleOpen} onMoreInfo={handleOpen} />}

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search animated movies & shows..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {isSearchMode ? (
            searching ? (
              <LoadingSpinner color={colors.red} />
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon="film-outline"
                title="No Results Found"
                message={`No animation found for "${query}"`}
              />
            ) : (
              <View>
                <SectionTitle title={`Results for "${query}"`} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.carousel}>
                    {searchResults.map(m => (
                      <MovieCard
                        key={m.imdbID}
                        movie={m}
                        onPress={() => handleOpen(m)}
                        onFavoritePress={() => handleFavoritePress(m)}
                        isFavorite={favorites.has(m.imdbID)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )
          ) : (
            sections.map(section => (
              <View key={section.title}>
                <SectionTitle title={section.title} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.carousel}>
                    {section.movies.map(m => (
                      <MovieCard
                        key={m.imdbID}
                        movie={m}
                        onPress={() => handleOpen(m)}
                        onFavoritePress={() => handleFavoritePress(m)}
                        isFavorite={favorites.has(m.imdbID)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))
          )}
        </Animated.View>

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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  carousel: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
});

export default AnimationScreen;
