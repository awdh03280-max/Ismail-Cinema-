import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, StatusBar, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { searchMovies, Movie } from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { addToFavorites, removeFromFavorites, isFavorite } from '../storage/storage';

const MovieListScreen = ({ route, navigation }: any) => {
  const { category } = route.params;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
  }, []);

  useEffect(() => {
    loadMovies();
  }, [category]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const results = await searchMovies(category);
      setMovies(results);
      await loadFavoritesForMovies(results);
    } catch (error) {
      console.error('Error loading movies:', error);
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

  const handleMoviePress = (movieId: string) => {
    navigation.navigate('MovieDetails', { movieId });
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
      <View style={styles.header}>
        <Text style={styles.title}>{category.charAt(0).toUpperCase() + category.slice(1)} Movies</Text>
      </View>
      {movies.length === 0 ? (
        <EmptyState
          icon="film"
          title="No Movies Found"
          message={`No ${category} movies available`}
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
                onPress={() => handleMoviePress(item.imdbID)}
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
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  columnWrapper: { justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 8 },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
});

export default MovieListScreen;
