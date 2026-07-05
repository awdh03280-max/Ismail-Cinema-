import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  DimensionValue,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import MovieCard from '../components/MovieCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getContinueWatching,
  removeContinueWatching,
  updateWatchProgress,
  getPlaybackPosition,
  ContinueWatchingMovie,
} from '../storage/storage';

type WatchingMovie = ContinueWatchingMovie;

const { width } = Dimensions.get('window');

const ContinueWatchingScreen = ({ navigation }: any) => {
  const [movies, setMovies] = useState<WatchingMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<WatchingMovie | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadContinueWatching();
    }, [])
  );

  const loadContinueWatching = async () => {
    try {
      setLoading(true);
      const watching = await getContinueWatching();
      const sorted = watching.sort((a, b) => b.watchedAt - a.watchedAt);
      setMovies(sorted);
    } catch (error) {
      console.error('Error loading continue watching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMovie = async (movieId: string) => {
    try {
      await removeContinueWatching(movieId);
      setMovies(prev => prev.filter(m => m.imdbID !== movieId));
    } catch (error) {
      console.error('Error removing movie:', error);
    }
  };

  const handleMoviePress = (item: WatchingMovie) => {
    navigation.navigate('MovieDetails', {
      movieId: item.imdbID,
      contentType: item.contentType ?? 'movie',
    });
  };

  /** Navigate straight to the player, resuming from saved progress */
  const handleResumePlay = async (item: WatchingMovie) => {
    const savedPos = await getPlaybackPosition(item.imdbID);
    navigation.navigate('Player', {
      movieId: item.imdbID,
      title: item.title,
      poster: item.poster,
      contentType: item.contentType ?? 'movie',
      initialProgress: savedPos ?? item.progress,
    });
  };

  const handleOpenProgressModal = (movie: WatchingMovie) => {
    setSelectedMovie(movie);
    setProgress(movie.progress);
  };

  const handleSaveProgress = async () => {
    if (!selectedMovie) return;
    try {
      await updateWatchProgress(selectedMovie.imdbID, progress);
      setMovies(prev =>
        prev.map(m =>
          m.imdbID === selectedMovie.imdbID ? { ...m, progress } : m
        )
      );
      setSelectedMovie(null);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleMarkFinished = async () => {
    if (!selectedMovie) return;
    try {
      await removeContinueWatching(selectedMovie.imdbID);
      setMovies(prev => prev.filter(m => m.imdbID !== selectedMovie.imdbID));
      setSelectedMovie(null);
    } catch (error) {
      console.error('Error marking as finished:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Continue Watching</Text>
      </View>

      {movies.length === 0 ? (
        <EmptyState
          icon="play-circle"
          title="Nothing to Watch Yet"
          message="Start watching movies to see them here"
        />
      ) : (
        <FlatList
          data={movies}
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
                  <MovieCard
                    movie={{
                      imdbID: item.imdbID,
                      Title: item.title,
                      Year: '',
                      Poster: item.poster,
                      Backdrop: '',
                      Plot: '',
                      imdbRating: 'N/A',
                      voteCount: 0,
                      Runtime: '',
                      Genre: '',
                      Director: '',
                      Cast: '',
                      Type: (item.contentType ?? 'movie') === 'tv' ? 'series' : 'movie',
                      Released: '',
                      Language: '',
                      Country: '',
                      adult: false,
                      contentType: item.contentType ?? 'movie',
                      trailerKey: '',
                      certification: '',
                      productionCompanies: [],
                      imdbExternalId: '',
                      tagline: '',
                    }}
                    onPress={() => handleMoviePress(item)}
                  />
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${Math.round(item.progress)}%` as DimensionValue }]}
                  />
                </View>

                {/* Action row */}
                <View style={styles.actionButtons}>
                  {/* Resume play */}
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handleResumePlay(item)}
                  >
                    <Ionicons name="play" size={14} color="#fff" />
                  </TouchableOpacity>

                  {/* Edit progress manually */}
                  <TouchableOpacity
                    style={styles.progressButton}
                    onPress={() => handleOpenProgressModal(item)}
                  >
                    <Ionicons name="timer" size={14} color="#fff" />
                  </TouchableOpacity>

                  {/* Remove */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMovie(item.imdbID)}
                  >
                    <Ionicons name="trash" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Manual progress modal */}
      <Modal visible={!!selectedMovie} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedMovie?.title}</Text>
            <Text style={styles.progressLabel}>{Math.round(progress)}% watched</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={progress}
              onValueChange={setProgress}
              minimumTrackTintColor="#e50914"
              maximumTrackTintColor="#333"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSelectedMovie(null)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProgress}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.finishedButton}
              onPress={handleMarkFinished}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#aaa" />
              <Text style={styles.finishedText}>Mark as Finished</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  columnWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  movieContainer: { width: '48%' },
  cardWrapper: { position: 'relative' },
  movieCard: { flex: 1 },
  progressBar: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 1.5,
    marginTop: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#e50914' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  playButton: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressButton: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(229,9,20,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(100,100,100,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    width: width - 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  progressLabel: { fontSize: 14, color: '#e50914', marginBottom: 16 },
  slider: { width: '100%', height: 40 },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#333' },
  saveButton: { backgroundColor: '#e50914' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  finishedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  finishedText: { color: '#aaa', fontSize: 13 },
});

export default ContinueWatchingScreen;
