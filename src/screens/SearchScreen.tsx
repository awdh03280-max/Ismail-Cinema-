import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {
  searchAll,
  discoverByGenres,
  sortMovies,
  getDefaultBrowseFeed,
  GENRE_LIST,
  SORT_OPTIONS,
  SortKey,
  Movie,
} from '../api/tmdb';
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
import { Ionicons } from '@expo/vector-icons';

const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedSort, setSelectedSort] = useState<SortKey>('popular');
  /** Raw results from the last API call — never mutated for Family Mode. */
  const [rawMovies, setRawMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { isEnabled, isUnlocked, filterMovies } = useFamilyMode();
  const requestId = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isAllActive = selectedGenres.size === 0 && searched && !searchQuery.trim();

  /**
   * Derived list: re-computed whenever Family Mode state or the active sort
   * changes so existing results are immediately re-filtered/re-sorted without
   * a new API call.
   */
  const movies = useMemo(
    () => sortMovies(filterMovies(rawMovies), selectedSort),
    [rawMovies, isEnabled, isUnlocked, filterMovies, selectedSort]
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
      fadeAnim.setValue(0);
      const results = await fetcher();
      if (currentRequest !== requestId.current) return;
      setRawMovies(results);
      await loadFavoritesForMovies(results);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [fadeAnim]);

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    animateLayout();
    setSelectedGenres(new Set());
    runFetch(() => searchAll(searchQuery));
  };

  const handleAllPress = () => {
    animateLayout();
    setSearchQuery('');
    setSelectedGenres(new Set());
    runFetch(() => getDefaultBrowseFeed());
  };

  const handleGenrePress = (genre: string) => {
    animateLayout();
    setSearchQuery('');
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }

      if (next.size === 0) {
        setSearched(false);
        setRawMovies([]);
      } else {
        runFetch(() => discoverByGenres(Array.from(next)));
      }
      return next;
    });
  };

  const handleSortPress = (sort: SortKey) => {
    setSelectedSort(sort);
    // Sorting re-derives from the existing raw results (see `movies` memo). If
    // nothing has been browsed yet, tapping a sort chip kicks off the default
    // trending feed so the chip has something to sort.
    if (!searched && selectedGenres.size === 0 && !searchQuery.trim()) {
      runFetch(() => getDefaultBrowseFeed());
    }
  };

  const handleClear = () => {
    animateLayout();
    setSearchQuery('');
    if (selectedGenres.size === 0) {
      setRawMovies([]);
      setSearched(false);
    }
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

      <View style={styles.filterSection}>
        <View style={styles.filterLabelRow}>
          <Text style={styles.filterLabel}>Genres</Text>
          {selectedGenres.size > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSelectedGenres(new Set());
                setSearched(false);
                setRawMovies([]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreRow}
        >
          <TouchableOpacity
            style={[styles.chip, isAllActive && styles.chipActive]}
            onPress={handleAllPress}
            activeOpacity={0.8}
          >
            {isAllActive && (
              <Ionicons
                name="checkmark"
                size={13}
                color={colors.black}
                style={styles.chipCheckIcon}
              />
            )}
            <Text style={[styles.chipText, isAllActive && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {GENRE_LIST.map(genre => {
            const isActive = selectedGenres.has(genre);
            return (
              <TouchableOpacity
                key={genre}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleGenrePress(genre)}
                activeOpacity={0.8}
              >
                {isActive && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={colors.black}
                    style={styles.chipCheckIcon}
                  />
                )}
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterLabel, styles.sortLabel]}>Sort By</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreRow}
        >
          {SORT_OPTIONS.map(option => {
            const isActive = option.key === selectedSort;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortChip, isActive && styles.sortChipActive]}
                onPress={() => handleSortPress(option.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
            selectedGenres.size > 0
              ? `No titles found for "${Array.from(selectedGenres).join(', ')}"`
              : `No results found for "${searchQuery}"`
          }
        />
      ) : (
        <Animated.View style={[styles.resultsWrap, { opacity: fadeAnim }]}>
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
        </Animated.View>
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
  filterSection: {
    paddingBottom: 4,
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sortLabel: {
    marginTop: 2,
  },
  clearFiltersText: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 12,
  },
  genreRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipCheckIcon: {
    marginRight: 5,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.black,
  },
  sortChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  sortChipText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  sortChipTextActive: {
    color: colors.black,
  },
  resultsWrap: { flex: 1 },
  columnWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
});

export default SearchScreen;
