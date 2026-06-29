import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getMovieDetails, Movie } from '../api/omdb';
import { addToFavorites, removeFromFavorites, isFavorite, addToContinueWatching } from '../storage/storage';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.6;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const MovieDetailsScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { movieId } = route.params;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      const details = await getMovieDetails(movieId);
      if (details.Response === 'True') {
        setMovie(details);
        const fav = await isFavorite(movieId);
        setIsFav(fav);
      } else {
        setError('Movie not found');
      }
    } catch (err) {
      setError('Failed to load movie details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!movie) return;
    try {
      if (isFav) {
        await removeFromFavorites(movieId);
        setIsFav(false);
      } else {
        await addToFavorites({
          imdbID: movie.imdbID,
          title: movie.Title,
          poster: movie.Poster,
          addedAt: Date.now(),
        });
        setIsFav(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleWatch = async () => {
    if (!movie) return;
    try {
      await addToContinueWatching({
        imdbID: movie.imdbID,
        title: movie.Title,
        poster: movie.Poster,
        progress: 0,
        watchedAt: Date.now(),
      });
      alert('Added to Continue Watching');
    } catch (error) {
      console.error('Error adding to continue watching:', error);
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

  if (error || !movie) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadMovieDetails()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={28} color={isFav ? '#e50914' : '#fff'} />
          </TouchableOpacity>
        </View>
        <View style={styles.posterContainer}>
          <Image source={{ uri: movie.Poster }} style={styles.poster} />
          <LinearGradient colors={['transparent', '#0a0e27']} style={styles.posterGradient} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{movie.Title}</Text>
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color="#e50914" />
              <Text style={styles.metaText}>{movie.Year}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={16} color="#e50914" />
              <Text style={styles.metaText}>{movie.imdbRating}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color="#e50914" />
              <Text style={styles.metaText}>{movie.Runtime}</Text>
            </View>
          </View>
          <View style={styles.genreContainer}>
            {movie.Genre.split(',').map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre.trim()}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.watchButton} onPress={handleWatch}>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plot</Text>
            <Text style={styles.plotText}>{movie.Plot}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Director</Text>
            <Text style={styles.infoText}>{movie.Director}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <Text style={styles.infoText}>{movie.Cast}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{movie.Type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language:</Text>
              <Text style={styles.detailValue}>{movie.Language}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Released:</Text>
              <Text style={styles.detailValue}>{movie.Released}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  scrollContent: { paddingBottom: 40 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, zIndex: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  favoriteButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  posterContainer: { alignItems: 'center', marginVertical: 20 },
  poster: { width: POSTER_WIDTH, height: POSTER_HEIGHT, borderRadius: 12 },
  posterGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  contentContainer: { paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12 },
  metaContainer: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#999', fontSize: 12 },
  genreContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genreTag: { backgroundColor: '#1a1a2e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e50914' },
  genreText: { color: '#e50914', fontSize: 12, fontWeight: '600' },
  watchButton: { flexDirection: 'row', backgroundColor: '#e50914', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 },
  watchButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  plotText: { color: '#ccc', fontSize: 14, lineHeight: 22 },
  infoText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  detailLabel: { color: '#999', fontSize: 14 },
  detailValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16, marginBottom: 16 },
  retryButton: { backgroundColor: '#e50914', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default MovieDetailsScreen;
