/**
 * CollectionScreen — shows all movies / TV shows in a thematic collection.
 * Route params: { collectionId: string }
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLLECTIONS, Collection } from '../data/collections';
import {
  discoverMoviesByGenreIds,
  discoverTVByGenreIds,
  Movie,
} from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';
import { colors } from '../theme/colors';

const CollectionScreen = ({ route, navigation }: any) => {
  const { collectionId } = route.params as { collectionId: string };
  const collection: Collection | undefined = COLLECTIONS.find(
    (c) => c.id === collectionId,
  );

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { filterMovies } = useFamilyMode();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') StatusBar.setBackgroundColor('#000');
  }, []);

  const loadMovies = useCallback(async () => {
    if (!collection) return;
    try {
      const [raw, favs] = await Promise.all([
        collection.contentType === 'tv'
          ? discoverTVByGenreIds(
              collection.genreIds,
              collection.sortBy ?? 'popularity.desc',
            )
          : discoverMoviesByGenreIds(
              collection.genreIds,
              collection.sortBy ?? 'popularity.desc',
            ),
        getFavorites(),
      ]);
      setMovies(filterMovies(raw));
      setFavorites(new Set(favs.map((f) => f.imdbID)));
    } catch (e) {
      console.error('[CollectionScreen] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [collection, filterMovies]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMovies();
  };

  const handleFavorite = async (movie: Movie) => {
    if (favorites.has(movie.imdbID)) {
      await removeFromFavorites(movie.imdbID);
      setFavorites((prev) => {
        const n = new Set(prev);
        n.delete(movie.imdbID);
        return n;
      });
    } else {
      await addToFavorites({
        imdbID: movie.imdbID,
        title: movie.Title,
        poster: movie.Poster,
        contentType: movie.contentType,
        addedAt: Date.now(),
      });
      setFavorites((prev) => new Set(prev).add(movie.imdbID));
    }
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetails', {
      movieId: movie.imdbID,
      contentType: movie.contentType,
    });
  };

  if (!collection) {
    return (
      <View style={styles.root}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.notFound}>Collection not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[...collection.gradient, '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.hero}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.heroIcon}>{collection.icon}</Text>
        <Text style={styles.heroTitle}>{collection.name}</Text>
        <Text style={styles.heroSub}>{collection.subtitle}</Text>

        {!loading && (
          <View style={styles.countPill}>
            <Ionicons name="film-outline" size={12} color={colors.gold} />
            <Text style={styles.countText}>{movies.length} titles</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.imdbID}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <MovieCard
                movie={item}
                onPress={() => handleMoviePress(item)}
                onFavoritePress={() => handleFavorite(item)}
                isFavorite={favorites.has(item.imdbID)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="film-outline" size={44} color="#333" />
              <Text style={styles.emptyText}>No titles found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  hero: {
    paddingTop: Platform.OS === 'ios' ? 62 : 42,
    paddingBottom: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 38,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIcon: { fontSize: 56, lineHeight: 66, marginBottom: 8 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 5,
    textAlign: 'center',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countText: { fontSize: 12, color: colors.gold, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 20 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  cardWrap: { width: '48%' },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 14,
  },
  emptyText: { fontSize: 15, color: '#444', fontWeight: '600' },

  notFound: {
    color: '#666',
    textAlign: 'center',
    marginTop: 120,
    fontSize: 15,
  },
});

export default CollectionScreen;
