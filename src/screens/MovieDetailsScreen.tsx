import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getMovieDetails, Movie } from '../api/omdb';
import { addToFavorites, removeFromFavorites, isFavorite, addToContinueWatching } from '../storage/storage';

const MovieDetailsScreen = ({ route, navigation }: any) => {
  const { movieId } = route.params;
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
  }, []);

  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      const details = await getMovieDetails(movieId);
      setMovie(details);
      const fav = await isFavorite(movieId);
      setIsFav(fav);
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFav) {
        await removeFromFavorites(movieId);
        setIsFav(false);
      } else {
        await addToFavorites({
          imdbID: movieId,
          title: movie?.Title || 'Unknown',
          poster: movie?.Poster || '',
          addedAt: Date.now(),
        });
        setIsFav(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleWatchNow = async () => {
    try {
      await addToContinueWatching({
        imdbID: movieId,
        title: movie?.Title || 'Unknown',
        poster: movie?.Poster || '',
        progress: 0,
        watchedAt: Date.now(),
      });
      // Navigate to player or show confirmation
    } catch (error) {
      console.error('Error adding to continue watching:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Movie not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={24} color={isFav ? '#e50914' : '#fff'} />
          </TouchableOpacity>
        </View>

        <Image source={{ uri: movie.Poster }} style={styles.poster} />

        <View style={styles.content}>
          <Text style={styles.title}>{movie.Title}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#e50914" />
              <Text style={styles.rating}>{movie.imdbRating}</Text>
            </View>
            <Text style={styles.year}>{movie.Year}</Text>
            <Text style={styles.type}>{movie.Type}</Text>
          </View>

          <TouchableOpacity style={styles.playButton} onPress={handleWatchNow}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.playButtonText}>Watch Now</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plot</Text>
            <Text style={styles.sectionContent}>{movie.Plot}</Text>
          </View>

          {movie.Director && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Director</Text>
              <Text style={styles.sectionContent}>{movie.Director}</Text>
            </View>
          )}

          {movie.Actors && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <Text style={styles.sectionContent}>{movie.Actors}</Text>
            </View>
          )}

          {movie.Genre && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Genre</Text>
              <Text style={styles.sectionContent}>{movie.Genre}</Text>
            </View>
          )}

          {movie.Language && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Language</Text>
              <Text style={styles.sectionContent}>{movie.Language}</Text>
            </View>
          )}

          {movie.Runtime && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Runtime</Text>
              <Text style={styles.sectionContent}>{movie.Runtime}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, zIndex: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  favoriteButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  poster: { width: '100%', height: 300, backgroundColor: '#1a1a2e' },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(229, 9, 20, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 },
  rating: { color: '#e50914', fontWeight: '700', fontSize: 14 },
  year: { color: '#999', fontSize: 14 },
  type: { color: '#999', fontSize: 14, textTransform: 'capitalize' },
  playButton: { flexDirection: 'row', backgroundColor: '#e50914', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  playButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sectionContent: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  errorText: { color: '#e50914', fontSize: 16, textAlign: 'center' },
});

export default MovieDetailsScreen;
