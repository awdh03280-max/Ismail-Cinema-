import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  DimensionValue,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SectionTitle from './SectionTitle';
import { ContinueWatchingMovie } from '../storage/storage';

interface ContinueWatchingSectionProps {
  movies: ContinueWatchingMovie[];
  /** Open the details screen for this title. */
  onPress: (movie: ContinueWatchingMovie) => void;
  /** Resume playback from the last watched position. */
  onContinue: (movie: ContinueWatchingMovie) => void;
}

/**
 * Home Screen "Continue Watching" row — shown directly below the AI
 * Assistant. Each card surfaces the poster, a progress bar reflecting how
 * much of the title has been watched, and a Continue button that resumes
 * playback from the last saved timestamp.
 */
const ContinueWatchingSection: React.FC<ContinueWatchingSectionProps> = ({
  movies,
  onPress,
  onContinue,
}) => {
  if (!movies.length) return null;

  return (
    <View>
      <SectionTitle title="▶️ Continue Watching" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {movies.map(movie => (
            <View key={movie.imdbID} style={styles.cardWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onPress(movie)}
                style={styles.posterWrap}
              >
                <Image source={{ uri: movie.poster }} style={styles.poster} />
              </TouchableOpacity>

              <Text style={styles.title} numberOfLines={1}>
                {movie.title}
              </Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(movie.progress)}%` as DimensionValue },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                activeOpacity={0.85}
                onPress={() => onContinue(movie)}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 14 },
  cardWrap: { width: 150 },
  posterWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 10px 28px rgba(0,0,0,0.65)' } as object,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 7,
      },
    }),
  },
  poster: {
    width: '100%',
    height: 225,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.red,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.red,
    paddingVertical: 8,
    borderRadius: 6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ContinueWatchingSection;
