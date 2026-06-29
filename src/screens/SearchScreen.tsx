import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Text, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { searchMovies } from '../api/omdb';
import { Movie } from '../api/omdb';
import MovieCard from '../components/MovieCard';

const { width } = Dimensions.get('window');

const SearchScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = async (query: string, page: number = 1) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    try {
      setLoading(true);
      setHasSearched(true);
      const response = await searchMovies(query, page);
      if (response.Search) {
        setSearchResults(page === 1 ? response.Search : [...searchResults, ...response.Search]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    handleSearch(searchQuery, nextPage);
  };

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0e27', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_movies')}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setCurrentPage(1);
            handleSearch(text, 1);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); setCurrentPage(1); }}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      {loading && !hasSearched ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : hasSearched && searchResults.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search" size={60} color="#666" />
          <Text style={styles.noResultsText}>{t('no_results')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsGrid}>
            {searchResults.map((movie) => (
              <TouchableOpacity key={movie.imdbID} style={styles.gridItem} onPress={() => navigation.navigate('MovieDetails', { movieId: movie.imdbID })}>
                <MovieCard movie={movie} />
              </TouchableOpacity>
            ))}
          </View>
          {searchResults.length > 0 && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loadMoreText}>Load More</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', marginHorizontal: 12, marginTop: 12, marginBottom: 16, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#fff', fontSize: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResultsText: { color: '#999', fontSize: 16, marginTop: 12 },
  scrollContent: { padding: 12, paddingBottom: 80 },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 12 },
  loadMoreButton: { backgroundColor: '#e50914', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', marginVertical: 16 },
  loadMoreText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SearchScreen;
