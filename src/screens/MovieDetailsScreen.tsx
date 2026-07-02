import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getMovieDetails, Movie } from '../api/tmdb';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  addToContinueWatching,
} from '../storage/storage';

const MovieDetailsScreen = ({ route, navigation }: any) => {
  const { movieId } = route.params;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
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
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!movie) return;

    if (isFav) {
      await removeFromFavorites(movieId);
      setIsFav(false);
    } else {
      await addToFavorites({
        imdbID: movieId,
        title: movie.Title,
        poster: movie.Poster,
        addedAt: Date.now(),
      });

      setIsFav(true);
    }
  };

  const handleWatchNow = async () => {
    if (!movie) return;

    await addToContinueWatching({
      imdbID: movieId,
      title: movie.Title,
      poster: movie.Poster,
      progress: 0,
      watchedAt: Date.now(),
    });
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
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.favoriteButton}>
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={24}
              color={isFav ? '#e50914' : '#fff'}
            />
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

          <TouchableOpacity
            style={styles.playButton}
            onPress={handleWatchNow}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.playButtonText}>Watch Now</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plot</Text>
            <Text style={styles.sectionContent}>{movie.Plot}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Director</Text>
            <Text style={styles.sectionContent}>{movie.Director}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <Text style={styles.sectionContent}>{movie.Cast}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genre</Text>
            <Text style={styles.sectionContent}>{movie.Genre}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language</Text>
            <Text style={styles.sectionContent}>{movie.Language}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Runtime</Text>
            <Text style={styles.sectionContent}>{movie.Runtime}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poster: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229,9,20,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  rating: {
    color: '#e50914',
    marginLeft: 4,
  },
  year: {
    color: '#999',
    marginRight: 10,
  },
  type: {
    color: '#999',
  },
  playButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 24,
  },
  playButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  sectionContent: {
    color: '#ccc',
    lineHeight: 22,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default MovieDetailsScreen;
