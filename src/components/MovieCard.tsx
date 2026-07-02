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
          <Text style={styles.rating}>{movie
