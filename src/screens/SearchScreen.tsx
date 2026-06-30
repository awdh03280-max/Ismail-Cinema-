import React, { useState } from 'react';
import { View, StyleSheet, FlatList, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { searchMovies, Movie } from '../api/omdb';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { addToFavorites, removeFromFavorites, isFavorite } from '../storage/storage';

const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      setSearched(true);
      const results = await searchMovies(searchQuery);
      setMovies(results);
      await loadFavoritesForMovies(results);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoritesForMovies = async (movies: Movie[]) => {
    try {
      const favSet = new Set<string>();
      for (const movie of movies) {
        const isFav = await isFavorite(movie.imdbID);
        if (isFav) favSet.add(movie.imdbID);
      }
      setFavorites(favSet);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setMovies([]);
    setSearched(false);
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetails', { movieId: movie.imdbID });
  };

  const handleFavoritePress = async (movie: Movie) => {
    try {
      if (favorites.has(movie.imdbID)) {
        await removeFromFavorites(movie.imdbID);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(movie.imdbID);
          return newSet;
        });
      } else {
        await addToFavorites({
          imdbID: movie.imdbID,
          title: movie.Title,
          poster: movie.Poster,
          addedAt: Date.now(),
        });
        setFavorites(prev => new Set(prev).add(movie.imdbID));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
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
          message="Find your favorite movies and TV shows"
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
  columnWrapper: { justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 8 },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
});

export default SearchScreen;
