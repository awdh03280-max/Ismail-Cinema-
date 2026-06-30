import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { searchMovies, getPopularMovies, Movie } from '../api/omdb';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import { addToFavorites, removeFromFavorites, isFavorite } from '../storage/storage';

const HomeScreen = ({ navigation }: any) => {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [actionMovies, setActionMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const [popular, action] = await Promise.all([
        getPopularMovies('action'),
        searchMovies('superhero'),
      ]);
      setPopularMovies(popular);
      setActionMovies(action);
      await loadFavorites();
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const allMovies = [...popularMovies, ...actionMovies];
      const favSet = new Set<string>();
      for (const movie of allMovies) {
        const isFav = await isFavorite(movie.imdbID);
        if (isFav) favSet.add(movie.imdbID);
      }
      setFavorites(favSet);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <View style={styles.logoPlay} />
            </View>
          </View>
        </View>

        <SectionTitle title="Popular Movies" onSeeAll={() => navigation.navigate('MovieList', { category: 'popular' })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
          <View style={styles.carousel}>
            {popularMovies.map(movie => (
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

        <SectionTitle title="Action Movies" onSeeAll={() => navigation.navigate('MovieList', { category: 'action' })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
          <View style={styles.carousel}>
            {actionMovies.map(movie => (
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 40, height: 40, backgroundColor: '#e50914', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  logoPlay: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 0, borderTopWidth: 6, borderBottomWidth: 6, borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  carouselContainer: { paddingLeft: 16 },
  carousel: { flexDirection: 'row', gap: 0, paddingRight: 16 },
});

export default HomeScreen;
