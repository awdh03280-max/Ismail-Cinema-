import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import MovieCard from '../components/MovieCard';
import HeroSection from '../components/HeroSection';
import { getTrendingMovies } from '../api/omdb';
import { Movie } from '../api/omdb';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
    loadTrendingMovies();
  }, []);

  const loadTrendingMovies = async () => {
    try {
      setLoading(true);
      const movies = await getTrendingMovies();
      setTrendingMovies(movies);
      setError(null);
    } catch (err) {
      setError('Failed to load movies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {trendingMovies.length > 0 && (
          <HeroSection movie={trendingMovies[0]} onWatchPress={() => navigation.navigate('MovieDetails', { movieId: trendingMovies[0].imdbID })} />
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('trending_now')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moviesContainer}>
            {trendingMovies.map((movie) => (
              <TouchableOpacity key={movie.imdbID} onPress={() => navigation.navigate('MovieDetails', { movieId: movie.imdbID })}>
                <MovieCard movie={movie} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('popular')}</Text>
          <View style={styles.gridContainer}>
            {trendingMovies.slice(0, 4).map((movie) => (
              <TouchableOpacity key={movie.imdbID} style={styles.gridItem} onPress={() => navigation.navigate('MovieDetails', { movieId: movie.imdbID })}>
                <MovieCard movie={movie} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginTop: 20, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  moviesContainer: { paddingRight: 12, gap: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 12 },
});

export default HomeScreen;
