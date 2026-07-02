import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { searchMovies, getPopularMovies, Movie } from '../api/tmdb';
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

      const popular = await getPopularMovies();
      const action = await searchMovies('Action');

      setPopularMovies(popular);
      setActionMovies(action);

      const favSet = new Set<string>();

      [...popular, ...action].forEach(async (movie) => {
        if (await isFavorite(movie.imdbID)) {
          favSet.add(movie.imdbID);
          setFavorites(new Set(favSet));
        }
      });

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
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

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e50914"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <View style={styles.logoPlay} />
            </View>
          </View>
        </View>

        <SectionTitle
          title="Popular Movies"
          onSeeAll={() =>
            navigation.navigate('MovieList', {
              category: 'popular',
            })
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

        <SectionTitle
          title="Action Movies"
          onSeeAll={() =>
            navigation.navigate('MovieList', {
              category: 'action',
            })
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },

  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    width: 40,
    height: 40,
    backgroundColor: '#e50914',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoPlay: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  carousel: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
});

export default HomeScreen;
