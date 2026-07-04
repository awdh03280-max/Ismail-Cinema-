import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { searchMovies, getPopularMovies, Movie } from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import SectionTitle from '../components/SectionTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';

const HomeScreen = ({ navigation }: any) => {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [actionMovies, setActionMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { isEnabled, isUnlocked, filterMovies } = useFamilyMode();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
    loadMovies();
  }, []);

  // Re-filter when family mode state changes (enable/disable/lock/unlock)
  useEffect(() => {
    loadMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isUnlocked]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const [popular, action] = await Promise.all([
        getPopularMovies(),
        searchMovies('Action'),
      ]);

      setPopularMovies(filterMovies(popular));
      setActionMovies(filterMovies(action));

      const favSet = new Set<string>();
      [...popular, ...action].forEach(async movie => {
        if (await isFavorite(movie.imdbID)) {
          favSet.add(movie.imdbID);
          setFavorites(new Set(favSet));
        }
      });
    } catch (error) {
      console.error(error);
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <View style={styles.logoPlay} />
            </View>
          </View>

          {/* Family Mode indicator */}
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

        <SectionTitle
          title="Popular Movies"
          onSeeAll={() => navigation.navigate('MovieList', { category: 'popular' })}
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
          onSeeAll={() => navigation.navigate('MovieList', { category: 'action' })}
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
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
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
  carousel: { flexDirection: 'row', paddingHorizontal: 16 },
});

export default HomeScreen;
