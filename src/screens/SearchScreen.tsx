import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { searchMovies, Movie } from '../api/tmdb';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';

const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  /** Raw results from the last API call — never mutated for Family Mode. */
  const [rawMovies, setRawMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { isEnabled, isUnlocked, filterMovies } = useFamilyMode();

  /**
   * Derived list: re-computed whenever Family Mode state changes so existing
   * results are immediately re-filtered on lock/unlock without a new API call.
   */
  const movies = useMemo(
    () => filterMovies(rawMovies),
    [rawMovies, isEnabled, isUnlocked, filterMovies]
  );

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      setSearched(true);
      const results = await searchMovies(searchQuery);
      setRawMovies(results);           // store raw; display list is derived
      await loadFavoritesForMovies(results);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoritesForMovies = async (list: Movie[]) => {
    try {
      const favSet = new Set<string>();
      for (const movie of list) {
        if (await isFavorite(movie.imdbID)) favSet.add(movie.imdbID);
      }
      setFavorites(favSet);
    } catch (error) {
      console.error(error);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setRawMovies([]);
    setSearched(false);
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetails', { movieId: movie.imdbID });
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
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e']}
        style={StyleSheet.absoluteFill}
      />
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      {!searched ? (
        <EmptyState
          icon="search"
          title="Search Movies"
          message="Find your favorite movies"
        />
      ) : movies.length === 0 ? (
        <EmptyState
          icon="film"
          title="No Results Found"
          message={`No movies found for "${searchQuery}"`}
        />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={item => item.imdbID}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.movieContainer}>
              <MovieCard
                movie={item}
                onPress={() => handleMoviePress(item)}
                onFavoritePress={() => handleFavoritePress(item)}
                isFavorite={favorites.has(item.imdbID)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  columnWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
});

export default SearchScreen;
