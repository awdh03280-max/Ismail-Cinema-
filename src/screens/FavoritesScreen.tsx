import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, StatusBar, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MovieCard from '../components/MovieCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { getFavorites, removeFromFavorites, FavoriteMovie } from '../storage/storage';

const FavoritesScreen = ({ navigation }: any) => {
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const favs = await getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (movieId: string) => {
    try {
      await removeFromFavorites(movieId);
      setFavorites(prev => prev.filter(m => m.imdbID !== movieId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleMoviePress = (item: FavoriteMovie) => {
    navigation.navigate('MovieDetails', { movieId: item.imdbID, contentType: item.contentType ?? 'movie' });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0d0d0d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
      </View>
      {favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No Favorites Yet"
          message="Add movies to your favorites to see them here"
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.imdbID}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.movieContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.movieCard}
                  onPress={() => handleMoviePress(item)}
                >
                  <View style={{ flex: 1 }}>
                    <MovieCard
                      movie={{
                        Title: item.title,
                        Poster: item.poster,
                        imdbID: item.imdbID,
                        imdbRating: 'N/A',
                        Year: '',
                        Plot: '',
                        Runtime: '',
                        Genre: '',
                        Director: '',
                        Cast: '',
                        Type: item.contentType === 'tv' ? 'series' : 'movie',
                        Released: '',
                        Language: ''
                      }}
                      onPress={() => handleMoviePress(item)}
                      isFavorite={true}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFavorite(item.imdbID)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  columnWrapper: { justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 8 },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
  cardWrapper: { position: 'relative' },
  movieCard: { flex: 1 },
  removeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FavoritesScreen;
