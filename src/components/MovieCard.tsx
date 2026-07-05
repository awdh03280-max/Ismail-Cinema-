import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MovieCardProps {
  movie: any;
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onPress,
  onFavoritePress,
  isFavorite,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: movie.Poster }} style={styles.poster} />

      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            onPress();
          }}
        >
          <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.favoriteIcon}
        onPress={(e) => {
          e.stopPropagation();
          onFavoritePress?.();
        }}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={18}
          color={isFavorite ? colors.red : '#fff'}
        />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {movie.Title}
        </Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={11} color={colors.gold} />
          <Text style={styles.rating}>{movie.imdbRating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229,9,20,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    ...Platform.select({
      web: { boxShadow: '0 0 16px 4px rgba(229,9,20,0.6)' } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
      },
    }),
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  info: {
    padding: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default MovieCard;
