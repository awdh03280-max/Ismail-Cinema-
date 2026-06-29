import React, { useFocusEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFavorites } from '../storage/storage';
import { FavoriteMovie } from '../storage/storage';
import MovieCardSmall from '../components/MovieCardSmall';

const { width } = Dimensions.get('window');

const FavoritesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('#0a0e27');
    }, [])
  );

  const loadFavorites = async () => {
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#666" />
          <Text style={styles.emptyTitle}>{t('no_favorites')}</Text>
          <Text style={styles.emptySubtitle}>{t('start_adding')}</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseButtonText}>Browse Movies</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={handleRefresh}>
          <View style={styles.gridContainer}>
            {favorites.map((movie) => (
              <TouchableOpacity key={movie.imdbID} style={styles.gridItem} onPress={() => navigation.navigate('MovieDetails', { movieId: movie.imdbID })}>
                <MovieCardSmall movie={movie} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  browseButton: { backgroundColor: '#e50914', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 20 },
  browseButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scrollContent: { padding: 12, paddingBottom: 80 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 12 },
});

export default FavoritesScreen;
