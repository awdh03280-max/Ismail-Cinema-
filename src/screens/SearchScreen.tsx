import React, { useState } from 'react';
import { View, StyleSheet, FlatList, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { searchMovies, Movie } from '../api/tmdb';
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
        const fav = await isFavorite(movie.imdbID);

        if (fav) {
          favSet.add(movie.imdbID);
        }
      }

      setFavorites(favSet);
    } catch (error) {
      console.error(error);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setMovies([]);
    setSearched(false);
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetails', {
      movieId: movie.imdbID,
    });
  };

  const handleFavoritePress = async (movie: Movie) => {
    if (favorites.has(movie.imdbID)) {
      await removeFromFavorites(movie.imdbID);

      const newFav = new Set(favorites);
      newFav.delete(movie.imdbID);
      setFavorites(newFav);
    } else {
      await addToFavorites({
        imdbID: movie.imdbID,
        title: movie.Title,
        poster: movie.Poster,
        addedAt: Date.now(),
      });

      const newFav = new Set(favorites);
      newFav.add(movie.imdbID);
      setFavorites(newFav);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
          keyExtractor={(item) => item.imdbID}
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
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },

  columnWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },

  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },

  movieContainer: {
    width: '48%',
  },
});

export default SearchScreen;
