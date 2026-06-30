import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MovieCardProps {
  movie: any;
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onPress, onFavoritePress, isFavorite }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: movie.Poster }} style={styles.poster} />
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.playButton} onPress={(e) => {
          e.stopPropagation();
          onPress();
        }}>
          <Ionicons name="play" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.favoriteIcon} 
        onPress={(e) => {
          e.stopPropagation();
          onFavoritePress?.();
        }}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#e50914' : '#fff'} />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.Title}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color="#e50914" />
          <Text style={styles.rating}>{movie.imdbRating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    marginRight: 12,
    width: 150,
  },
  poster: {
    width: '100%',
    height: 220,
    backgroundColor: '#0a0e27',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229, 9, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default MovieCard;
