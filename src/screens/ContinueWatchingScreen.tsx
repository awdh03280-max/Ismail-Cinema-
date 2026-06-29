import React, { useFocusEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getContinueWatching } from '../storage/storage';
import { ContinueWatchingMovie } from '../storage/storage';
import ContinueWatchingCard from '../components/ContinueWatchingCard';

const { width } = Dimensions.get('window');

const ContinueWatchingScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [movies, setMovies] = useState<ContinueWatchingMovie[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadContinueWatching();
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('#0a0e27');
    }, [])
  );

  const loadContinueWatching = async () => {
    try {
      const data = await getContinueWatching();
      const sorted = data.sort((a, b) => b.watchedAt - a.watchedAt);
      setMovies(sorted);
    } catch (error) {
      console.error('Error loading continue watching:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {movies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="play-circle-outline" size={80} color="#666" />
          <Text style={styles.emptyTitle}>{t('no_continue_watching')}</Text>
          <Text style={styles.emptySubtitle}>Start watching your favorite movies</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseButtonText}>Explore Movies</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {movies.map((movie) => (
            <ContinueWatchingCard key={movie.imdbID} movie={movie} onPress={() => navigation.navigate('MovieDetails', { movieId: movie.imdbID })} />
          ))}
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
});

export default ContinueWatchingScreen;
