import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { searchAll, discoverByGenre, GENRE_LIST, Movie } from '../api/tmdb';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';
import { colors } from '../theme/colors';

const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  /** Raw results from the last API call — never mutated for Family Mode. */
  const [rawMovies, setRawMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { isEnabled, isUnlocked, filterMovies } = useFamilyMode();
  const requestId = useRef(0);

  /**
   * Derived list: re-computed whenever Family Mode state changes so existing
   * results are immediately re-filtered on lock/unlock without a new API call.
   */
  const movies = useMemo(
    () => filterMovies(rawMovies),
    [rawMovies, isEnabled, isUnlocked, filterMovies]
  );

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  const loadFavoritesForMovies = async (list: Movie[]) => {
    try {
      // Read the full favorites list once, then check membership in-memory
      // instead of calling isFavorite() (which reads AsyncStorage) per movie.
      const allFavs = await getFavorites();
      const favIds = new Set(allFavs.map(f => f.imdbID));
      const favSet = new Set<string>(list.map(m => m.imdbID).filter(id => favIds.has(id)));
      setFavorites(favSet);
    } catch (error) {
      console.error(error);
    }
  };

  const runFetch = useCallback(async (fetcher: () => Promise<Movie[]>) => {
    const currentRequest = ++requestId.current;
    try {
      setLoading(true);
      setSearched(true);
      const results = await fetcher();
      if (currentRequest !== requestId.current) return;
      setRawMovies(results);
      await loadFavoritesForMovies(results);
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setSelectedGenre(null);
    runFetch(() => searchAll(searchQuery));
  };

  const handleGenrePress = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
      setSearched(false);
      setRawMovies([]);
      return;
    }
    setSearchQuery('');
    setSelectedGenre(genre);
    runFetch(() => discoverByGenre(genre));
  };

  const handleClear = () => {
    setSearchQuery('');
    setRawMovies([]);
    setSearched(false);
    setSelectedGenre(null);
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetails', { movieId: movie.imdbID, contentType: movie.contentType });
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
        contentType: movie.contentType,
        addedAt: Date.now(),
      });
      const next = new Set(favorites);
      next.add(movie.imdbID);
      setFavorites(next);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLogo}>
          <Text style={styles.headerLogoRed}>Discover</Text>
        </Text>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSearch={handleSearch}
        onClear={handleClear}
        placeholder="Search movies & shows..."
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
      >
        {GENRE_LIST.map(genre => {
          const isActive = genre === selectedGenre;
          return (
            <TouchableOpacity
              key={genre}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleGenrePress(genre)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {genre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <LoadingSpinner />
      ) : !searched ? (
        <EmptyState
          icon="search"
          title="Discover Movies & Shows"
          message="Search by title or pick a genre to explore"
        />
      ) : movies.length === 0 ? (
        <EmptyState
          icon="film"
          title="No Results Found"
          message={
            selectedGenre
              ? `No titles found for "${selectedGenre}"`
              : `No results found for "${searchQuery}"`
          }
        />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={item => `${item.contentType}-${item.imdbID}`}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.movieContainer}>
              <MovieCard
                movie={item}
                onPress={() => handleMoviePress(item)}
                onFavoritePress={() => handleFavoritePress(item)}
                isFavorite={favorites.has(item.imdbID)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerLogo: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  headerLogoRed: { color: colors.gold },
  genreRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  columnWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
});

export default SearchScreen;
